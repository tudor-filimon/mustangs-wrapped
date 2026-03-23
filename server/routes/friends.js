import express from 'express';
import axios from 'axios';
import { supabaseAdmin } from '../config/supabase.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

/**
 * Helper: get Spotify access token for a user (refresh if needed)
 */
async function getAccessTokenForUser(userId) {
  const { data: spotifyAccount } = await supabaseAdmin
    .from('spotify_accounts')
    .select('id')
    .eq('user_id', userId)
    .single();
  if (!spotifyAccount) return null;

  const { data: tokenRow } = await supabaseAdmin
    .from('spotify_tokens')
    .select('access_token_encrypted, refresh_token_encrypted, expires_at')
    .eq('spotify_acc_id', spotifyAccount.id)
    .single();
  if (!tokenRow) return null;

  let accessToken = tokenRow.access_token_encrypted;
  const refreshToken = tokenRow.refresh_token_encrypted;
  const expiresAt = tokenRow.expires_at ? new Date(tokenRow.expires_at).getTime() : 0;

  if (!accessToken || Date.now() >= (expiresAt - 60000)) {
    try {
      const tokenResp = await axios.post(
        'https://accounts.spotify.com/api/token',
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: process.env.SPOTIFY_CLIENT_ID,
          client_secret: process.env.SPOTIFY_CLIENT_SECRET
        }).toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
      accessToken = tokenResp.data.access_token;
      const newExpiresAt = new Date(Date.now() + tokenResp.data.expires_in * 1000).toISOString();
      await supabaseAdmin.from('spotify_tokens').update({
        access_token_encrypted: accessToken,
        expires_at: newExpiresAt
      }).eq('spotify_acc_id', spotifyAccount.id);
    } catch (err) {
      console.error('Spotify token refresh for user', userId, err.message);
      return null;
    }
  }
  return accessToken;
}

/**
 * Helper: fetch current + recent activity for a user (for activity feed)
 */
async function getSpotifyActivityForUser(userId) {
  const accessToken = await getAccessTokenForUser(userId);
  if (!accessToken) return { playing: false, recentTrack: null };

  try {
    const [currentResp, recentResp] = await Promise.all([
      axios.get('https://api.spotify.com/v1/me/player/currently-playing', {
        headers: { Authorization: `Bearer ${accessToken}` },
        validateStatus: () => true
      }),
      axios.get('https://api.spotify.com/v1/me/player/recently-played?limit=1', {
        headers: { Authorization: `Bearer ${accessToken}` },
        validateStatus: () => true
      })
    ]);

    if (currentResp.status === 200 && currentResp.data?.item) {
      const item = currentResp.data.item;
      return {
        playing: true,
        song: item.name,
        artists: item.artists?.map(a => a.name).join(', ') || '',
        image: item.album?.images?.[0]?.url || null,
        recentTrack: null
      };
    }

    const recentTrack = recentResp.data?.items?.[0]?.track;
    if (recentTrack) {
      return {
        playing: false,
        recentTrack: {
          song: recentTrack.name,
          artists: recentTrack.artists?.map(a => a.name).join(', ') || '',
          image: recentTrack.album?.images?.[0]?.url || null
        }
      };
    }
    return { playing: false, recentTrack: null };
  } catch (err) {
    return { playing: false, recentTrack: null };
  }
}

// All routes require auth
router.use(authenticate);

/**
 * GET /api/friends/users/search?q=
 * Search users by display_name (ilike). Excludes current user.
 */
router.get('/users/search', async (req, res, next) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q || q.length < 2) {
      return res.json({ users: [] });
    }
    const { data: users, error } = await supabaseAdmin
      .from('users')
      .select('id, display_name, avatar_url')
      .neq('id', req.user.id)
      .ilike('display_name', `%${q}%`)
      .limit(20);
    if (error) throw error;
    res.json({ users: users || [] });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/friends/requests
 * Send a friend request. Body: { receiver_id }
 */
router.post('/requests', async (req, res, next) => {
  try {
    const { receiver_id: receiverId } = req.body;
    if (!receiverId) return res.status(400).json({ error: 'receiver_id required' });
    if (receiverId === req.user.id) return res.status(400).json({ error: 'Cannot send request to yourself' });

    const u1 = req.user.id;
    const u2 = receiverId;
    const [user1Id, user2Id] = u1 < u2 ? [u1, u2] : [u2, u1];

    const { data: existingFriend } = await supabaseAdmin
      .from('friends')
      .select('id')
      .eq('user1_id', user1Id)
      .eq('user2_id', user2Id)
      .single();
    if (existingFriend) return res.status(409).json({ error: 'Already friends' });

    const { data: existingRequest } = await supabaseAdmin
      .from('friend_requests')
      .select('id, status, sender_id')
      .or(`and(sender_id.eq.${u1},receiver_id.eq.${u2}),and(sender_id.eq.${u2},receiver_id.eq.${u1})`)
      .limit(1)
      .single();
    if (existingRequest) {
      if (existingRequest.status === 'pending') {
        if (existingRequest.sender_id === req.user.id) return res.status(409).json({ error: 'Request already sent' });
        return res.status(409).json({ error: 'They already sent you a request' });
      }
      return res.status(409).json({ error: 'Request already exists' });
    }

    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from('friend_requests')
      .insert({ sender_id: req.user.id, receiver_id: receiverId, status: 'pending' })
      .select()
      .single();
    if (insertErr) throw insertErr;
    res.status(201).json({ request: inserted });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/friends/requests
 * List incoming (pending) and sent (pending) friend requests with user info.
 */
router.get('/requests', async (req, res, next) => {
  try {
    const me = req.user.id;

    const { data: allRequests, error } = await supabaseAdmin
      .from('friend_requests')
      .select('id, sender_id, receiver_id, status, created_at')
      .eq('status', 'pending')
      .or(`sender_id.eq.${me},receiver_id.eq.${me}`);
    if (error) throw error;

    const incoming = [];
    const sent = [];
    const userIds = new Set();
    (allRequests || []).forEach(r => {
      if (r.receiver_id === me) {
        incoming.push(r);
        userIds.add(r.sender_id);
      } else {
        sent.push(r);
        userIds.add(r.receiver_id);
      }
    });

    if (userIds.size === 0) return res.json({ incoming, sent });

    const { data: users } = await supabaseAdmin
      .from('users')
      .select('id, display_name, avatar_url')
      .in('id', [...userIds]);
    const userMap = Object.fromEntries((users || []).map(u => [u.id, u]));

    const withUser = (list, idKey) => list.map(r => ({ ...r, user: userMap[r[idKey]] || null }));
    res.json({
      incoming: withUser(incoming, 'sender_id'),
      sent: withUser(sent, 'receiver_id')
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/friends/requests/:id/accept
 * Accept a friend request (receiver only). Creates friendship with sorted ids.
 */
router.post('/requests/:id/accept', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data: request, error: fetchErr } = await supabaseAdmin
      .from('friend_requests')
      .select('id, sender_id, receiver_id, status')
      .eq('id', id)
      .single();
    if (fetchErr || !request) return res.status(404).json({ error: 'Request not found' });
    if (request.receiver_id !== req.user.id) return res.status(403).json({ error: 'Only receiver can accept' });
    if (request.status !== 'pending') return res.status(400).json({ error: 'Request already handled' });

    const [user1Id, user2Id] = request.sender_id < request.receiver_id
      ? [request.sender_id, request.receiver_id]
      : [request.receiver_id, request.sender_id];

    await supabaseAdmin.from('friend_requests').update({ status: 'accepted' }).eq('id', id);
    const { error: insertErr } = await supabaseAdmin
      .from('friends')
      .insert({ user1_id: user1Id, user2_id: user2Id });
    if (insertErr) throw insertErr;
    res.json({ message: 'Friend request accepted' });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/friends/requests/:id/decline
 * Decline a friend request (receiver only).
 */
router.post('/requests/:id/decline', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data: request } = await supabaseAdmin
      .from('friend_requests')
      .select('id, receiver_id, status')
      .eq('id', id)
      .single();
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.receiver_id !== req.user.id) return res.status(403).json({ error: 'Only receiver can decline' });
    if (request.status !== 'pending') return res.status(400).json({ error: 'Request already handled' });

    await supabaseAdmin.from('friend_requests').update({ status: 'declined' }).eq('id', id);
    res.json({ message: 'Friend request declined' });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/friends
 * List current user's friends with id, display_name, avatar_url.
 */
router.get('/', async (req, res, next) => {
  try {
    const me = req.user.id;
    const { data: rows, error } = await supabaseAdmin
      .from('friends')
      .select('user1_id, user2_id')
      .or(`user1_id.eq.${me},user2_id.eq.${me}`);
    if (error) throw error;

    const friendIds = (rows || []).map(r => r.user1_id === me ? r.user2_id : r.user1_id);
    if (friendIds.length === 0) return res.json({ friends: [] });

    const { data: users, error: usersErr } = await supabaseAdmin
      .from('users')
      .select('id, display_name, avatar_url')
      .in('id', friendIds);
    if (usersErr) throw usersErr;
    res.json({ friends: users || [] });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/friends/activity
 * Friends' Spotify activity: currently playing or recently played.
 */
router.get('/activity', async (req, res, next) => {
  try {
    const me = req.user.id;
    const { data: rows } = await supabaseAdmin
      .from('friends')
      .select('user1_id, user2_id')
      .or(`user1_id.eq.${me},user2_id.eq.${me}`);
    const friendIds = (rows || []).map(r => r.user1_id === me ? r.user2_id : r.user1_id);
    if (friendIds.length === 0) return res.json({ activity: [] });

    // 🔥 THE FIX: ADDED current_building BACK TO THE SELECT QUERY! 🔥
    const { data: users } = await supabaseAdmin
      .from('users')
      .select('id, display_name, avatar_url, current_building')
      .in('id', friendIds);
    const userMap = Object.fromEntries((users || []).map(u => [u.id, u]));

    const activity = [];
    for (const friendId of friendIds) {
      const spotify = await getSpotifyActivityForUser(friendId);
      activity.push({
        user: userMap[friendId] || { id: friendId, display_name: 'Unknown', avatar_url: null, current_building: null },
        ...spotify
      });
    }
    res.json({ activity });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/friends/check/:userId
 * Relationship with user: areFriends, requestStatus (none | sent | received).
 */
router.get('/check/:userId', async (req, res, next) => {
  try {
    const me = req.user.id;
    const otherId = req.params.userId;
    if (otherId === me) return res.json({ areFriends: false, requestStatus: 'none' });

    const [u1, u2] = me < otherId ? [me, otherId] : [otherId, me];
    const { data: friendRow } = await supabaseAdmin
      .from('friends')
      .select('id')
      .eq('user1_id', u1)
      .eq('user2_id', u2)
      .single();
    if (friendRow) return res.json({ areFriends: true, requestStatus: 'none' });

    const { data: request } = await supabaseAdmin
      .from('friend_requests')
      .select('sender_id')
      .eq('status', 'pending')
      .or(`and(sender_id.eq.${me},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${me})`)
      .limit(1)
      .single();
    if (request) {
      return res.json({
        areFriends: false,
        requestStatus: request.sender_id === me ? 'sent' : 'received'
      });
    }
    res.json({ areFriends: false, requestStatus: 'none' });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/friends/profile/:userId
 * Public profile for a user (display_name, avatar_url, faculty, class_year, major) + relationship.
 */
router.get('/profile/:userId', async (req, res, next) => {
  try {
    const me = req.user.id;
    const otherId = req.params.userId;

    const { data: profile, error } = await supabaseAdmin
      .from('users')
      .select('id, display_name, avatar_url, faculty, class_year, major')
      .eq('id', otherId)
      .single();
    if (error || !profile) return res.status(404).json({ error: 'User not found' });

    if (otherId === me) {
      return res.json({ user: profile, isSelf: true, areFriends: false, requestStatus: 'none' });
    }

    const [u1, u2] = me < otherId ? [me, otherId] : [otherId, me];
    const { data: friendRow } = await supabaseAdmin
      .from('friends')
      .select('id')
      .eq('user1_id', u1)
      .eq('user2_id', u2)
      .single();
    if (friendRow) {
      return res.json({ user: profile, isSelf: false, areFriends: true, requestStatus: 'none' });
    }

    const { data: request } = await supabaseAdmin
      .from('friend_requests')
      .select('id, sender_id, receiver_id')
      .eq('status', 'pending')
      .or(`and(sender_id.eq.${me},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${me})`)
      .limit(1)
      .single();
    if (request) {
      const received = request.receiver_id === me;
      return res.json({
        user: profile,
        isSelf: false,
        areFriends: false,
        requestStatus: request.sender_id === me ? 'sent' : 'received',
        requestId: received ? request.id : null
      });
    }
    res.json({ user: profile, isSelf: false, areFriends: false, requestStatus: 'none' });
  } catch (err) {
    next(err);
  }
});

export default router;