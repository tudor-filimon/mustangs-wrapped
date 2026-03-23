import express from 'express';
import axios from 'axios';
import { supabase, supabaseAdmin } from '../config/supabase.js';
import crypto from 'crypto';

const router = express.Router();
const inFlightTopTrackFetches = new Map();

export const tempSpotifyStorage = new Map();

router.get('/connect', (req, res) => {
  const spotifyClientId = process.env.SPOTIFY_CLIENT_ID;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI;
  const frontendUrl = process.env.FRONTEND_URL;

  if (!spotifyClientId || !redirectUri) {
    return res.status(500).json({ error: 'Spotify configuration missing' });
  }

  const state = crypto.randomBytes(32).toString('hex');
  
  tempSpotifyStorage.set(state, {
    createdAt: Date.now(),
    expiresAt: Date.now() + 5 * 60 * 1000
  });

  const scopes = [
    'user-read-email',
    'user-read-private',
    'user-top-read',
    'user-read-recently-played',
    'user-read-playback-state',
    'user-read-currently-playing'
  ].join(' ');

  const authUrl = `https://accounts.spotify.com/authorize?` +
    `client_id=${spotifyClientId}&` +
    `response_type=code&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `scope=${encodeURIComponent(scopes)}&` +
    `state=${state}`;

  res.json({ authUrl, state });
});

router.get('/callback', async (req, res) => {
  const { code, state, error } = req.query;
  const frontendUrl = process.env.FRONTEND_URL;

  if (error) {
    return res.redirect(`${frontendUrl}/register-complete?error=${encodeURIComponent(error)}`);
  }

  const stateData = tempSpotifyStorage.get(state);
  if (!stateData || Date.now() > stateData.expiresAt) {
    return res.redirect(`${frontendUrl}/register-complete?error=invalid_state`);
  }

  if (!code) {
    return res.redirect(`${frontendUrl}/register-complete?error=no_code`);
  }

  try {
    const tokenResponse = await axios.post(
      'https://accounts.spotify.com/api/token',
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
        client_id: process.env.SPOTIFY_CLIENT_ID,
        client_secret: process.env.SPOTIFY_CLIENT_SECRET
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const { access_token, refresh_token, expires_in } = tokenResponse.data;

    const userResponse = await axios.get('https://api.spotify.com/v1/me', {
      headers: {
        Authorization: `Bearer ${access_token}`
      }
    });

    const spotifyUser = userResponse.data;
    const spotifyUserId = spotifyUser.id;

    const { data: existingAccount, error: checkError } = await supabaseAdmin
      .from('spotify_accounts')
      .select('id, user_id')
      .eq('spotify_user_id', spotifyUserId)
      .single();

    if (existingAccount) {
      return res.redirect(
        `${frontendUrl}/register-complete?error=spotify_already_linked`
      );
    }

    const registrationToken = crypto.randomBytes(32).toString('hex');
    tempSpotifyStorage.set(registrationToken, {
      spotifyUserId,
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresIn: expires_in,
      createdAt: Date.now(),
      expiresAt: Date.now() + 10 * 60 * 1000 // 10 minutes
    });

    tempSpotifyStorage.delete(state);

    res.redirect(`${frontendUrl}/register-complete?token=${registrationToken}`);
  } catch (error) {
    console.error('Spotify callback error:', error);
    return res.redirect(
      `${frontendUrl}/register-complete?error=spotify_auth_failed`
    );
  }
});

router.get('/temp-token/:token', (req, res) => {
  const { token } = req.params;
  const tokenData = tempSpotifyStorage.get(token);

  if (!tokenData) {
    return res.status(404).json({ error: 'Token not found or expired' });
  }

  if (Date.now() > tokenData.expiresAt) {
    tempSpotifyStorage.delete(token);
    return res.status(410).json({ error: 'Token expired' });
  }

  res.json({
    spotifyUserId: tokenData.spotifyUserId,
    valid: true
  });
});

router.get('/current-playing', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token' });
    }
    const token = authHeader.substring(7);
    const { data: { user }, error: getUserErr } = await supabase.auth.getUser(token);
    if (getUserErr || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { data: spotifyAccount, error: spotifyAccountError } = await supabaseAdmin
      .from('spotify_accounts')
      .select('id')
      .eq('user_id', user.id)
      .single();
    if (!spotifyAccount) {
      return res.status(404).json({ error: 'No linked Spotify account' });
    }

    const { data: tokenRow, error: tokenError } = await supabaseAdmin
      .from('spotify_tokens')
      .select('spotify_acc_id, access_token_encrypted, refresh_token_encrypted, expires_at')
      .eq('spotify_acc_id', spotifyAccount.id)
      .single();

    if (!tokenRow) {
      return res.status(404).json({ error: 'No Spotify tokens' });
    }

    let accessToken = tokenRow.access_token_encrypted;
    const refreshToken = tokenRow.refresh_token_encrypted;
    const expiresAt = tokenRow.expires_at ? new Date(tokenRow.expires_at).getTime() : 0;

    if (!accessToken || Date.now() >= (expiresAt - 60000)) {
      const params = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: process.env.SPOTIFY_CLIENT_ID,
        client_secret: process.env.SPOTIFY_CLIENT_SECRET
      });
      const tokenResp = await axios.post('https://accounts.spotify.com/api/token', params.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      accessToken = tokenResp.data.access_token;
      const newExpiresAt = new Date(Date.now() + tokenResp.data.expires_in * 1000).toISOString();
      await supabaseAdmin.from('spotify_tokens').update({
        access_token_encrypted: accessToken,
        expires_at: newExpiresAt
      }).eq('spotify_acc_id', tokenRow.spotify_acc_id);
    }

    const spotifyResp = await axios.get('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (spotifyResp.status === 204) {
      return res.json({ playing: false });
    }

    const data = spotifyResp.data;
    const item = data.item;
    if (!item) return res.json({ playing: false });

    const song = item.name;
    const artists = item.artists?.map(a => a.name).join(', ') || '';
    const image = item.album?.images?.[0]?.url || null;
    
    const track_id = item.id;
    const album = item.album?.name || '';
    const release_date = item.album?.release_date || '';

    res.json({
      playing: true,
      song,
      artists,
      image,
      track_id,         
      album,            
      release_date,     
      progress_ms: data.progress_ms,
      duration_ms: item.duration_ms
    });
  } catch (err) {
    console.error('[current-playing] Unexpected error:', err.message);
    next(err);
  }
});

router.get('/top-tracks', async (req, res, next) => {
  let inFlightKey = null;
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token' });
    }
    const token = authHeader.substring(7);
    const { data: { user }, error: getUserErr } = await supabase.auth.getUser(token);
    if (getUserErr || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { data: spotifyAccount, error: spotifyAccountError } = await supabaseAdmin
      .from('spotify_accounts')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (spotifyAccountError || !spotifyAccount) {
      return res.status(404).json({ error: 'No linked Spotify account' });
    }

    const { data: tokenRow, error: tokenError } = await supabaseAdmin
      .from('spotify_tokens')
      .select('spotify_acc_id, access_token_encrypted, refresh_token_encrypted, expires_at')
      .eq('spotify_acc_id', spotifyAccount.id)
      .single();

    if (tokenError || !tokenRow) {
      return res.status(404).json({ error: 'No Spotify tokens' });
    }

    const timeRange = req.query.time_range || 'short_term';
    inFlightKey = `${spotifyAccount.id}:${timeRange}`;
    if (inFlightTopTrackFetches.has(inFlightKey)) {
      const existingResult = await inFlightTopTrackFetches.get(inFlightKey);
      return res.json(existingResult);
    }

    const fetchPromise = (async () => {
      let accessToken = tokenRow.access_token_encrypted;
      const refreshToken = tokenRow.refresh_token_encrypted;
      const expiresAt = tokenRow.expires_at ? new Date(tokenRow.expires_at).getTime() : 0;

      if (!accessToken || Date.now() >= (expiresAt - 60000)) {
        const params = new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: process.env.SPOTIFY_CLIENT_ID,
          client_secret: process.env.SPOTIFY_CLIENT_SECRET
        });
        const tokenResp = await axios.post('https://accounts.spotify.com/api/token', params.toString(), {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        accessToken = tokenResp.data.access_token;
        const newExpiresAt = new Date(Date.now() + tokenResp.data.expires_in * 1000).toISOString();
        await supabaseAdmin.from('spotify_tokens').update({
          access_token_encrypted: accessToken,
          expires_at: newExpiresAt
        }).eq('spotify_acc_id', tokenRow.spotify_acc_id);
      }

      const year = new Date().getFullYear();

      const { data: existingSnapshot } = await supabaseAdmin
        .from('wrapped_snapshot')
        .select('id')
        .eq('spotify_acc_id', spotifyAccount.id)
        .eq('year', year)
        .eq('time_range', timeRange)
        .single();

      if (existingSnapshot) {
        const { data: existingItems, error: existingItemsErr } = await supabaseAdmin
          .from('wrapped_items')
          .select('rank, name, artists, image_url, spotify_id')
          .eq('snapshot_id', existingSnapshot.id)
          .eq('item_type', 'track')
          .order('rank', { ascending: true });

        if (!existingItemsErr && Array.isArray(existingItems)) {
          const hasRank50 = existingItems.some((item) => item.rank === 50);
          const hasAnyArtists = existingItems.some(
            (item) => typeof item.artists === 'string' && item.artists.trim().length > 0
          );
          if (hasRank50 && hasAnyArtists) {
            return {
              tracks: existingItems.map((t) => ({
                rank: t.rank,
                name: t.name,
                artists: t.artists || '',
                image: t.image_url,
                spotify_id: t.spotify_id
              })),
              cached: true
            };
          }
        }
      }

      const spotifyResp = await axios.get(
        `https://api.spotify.com/v1/me/top/tracks?limit=50&time_range=${timeRange}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      const items = spotifyResp.data?.items || [];
      const tracks = items.map((t, i) => ({
        rank: i + 1,
        name: t.name,
        artists: t.artists?.map(a => a.name).join(', ') || '',
        image: t.album?.images?.[0]?.url || null,
        spotify_id: t.id
      }));

      const top50 = tracks.slice(0, 50);
      if (top50.length > 0) {
        const { data: snapshot, error: snapErr } = await supabaseAdmin
          .from('wrapped_snapshot')
          .upsert(
            {
              spotify_acc_id: spotifyAccount.id,
              year,
              time_range: timeRange,
              updated_at: new Date().toISOString()
            },
            { onConflict: 'spotify_acc_id,year,time_range' }
          )
          .select()
          .single();

        if (!snapErr && snapshot) {
          await supabaseAdmin
            .from('wrapped_items')
            .delete()
            .eq('snapshot_id', snapshot.id)
            .eq('item_type', 'track');

          const itemsToInsert = top50.map((t) => ({
            snapshot_id: snapshot.id,
            item_type: 'track',
            spotify_id: t.spotify_id,
            rank: t.rank,
            name: t.name,
            artists: t.artists,
            image_url: t.image
          }));
          await supabaseAdmin.from('wrapped_items').insert(itemsToInsert);
        }
      }

      return { tracks, cached: false };
    })();

    inFlightTopTrackFetches.set(inFlightKey, fetchPromise);
    const result = await fetchPromise;
    res.json(result);
    inFlightTopTrackFetches.delete(inFlightKey);
  } catch (err) {
    if (inFlightKey) inFlightTopTrackFetches.delete(inFlightKey);
    next(err);
  }
});

router.get('/wrapped-top-tracks', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token' });
    }
    const token = authHeader.substring(7);
    const { data: { user }, error: getUserErr } = await supabase.auth.getUser(token);
    if (getUserErr || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { data: spotifyAccount, error: accErr } = await supabaseAdmin
      .from('spotify_accounts')
      .select('id')
      .eq('user_id', user.id)
      .single();
    if (accErr || !spotifyAccount) {
      return res.status(404).json({ error: 'No linked Spotify account' });
    }

    const year = new Date().getFullYear();
    const { data: snapshot, error: snapErr } = await supabaseAdmin
      .from('wrapped_snapshot')
      .select('id')
      .eq('spotify_acc_id', spotifyAccount.id)
      .eq('year', year)
      .eq('time_range', 'medium_term')
      .single();
    if (snapErr || !snapshot) {
      return res.json({ tracks: [] });
    }

    const { data: items, error: itemsErr } = await supabaseAdmin
      .from('wrapped_items')
      .select('rank, name, artists, image_url, spotify_id')
      .eq('snapshot_id', snapshot.id)
      .eq('item_type', 'track')
      .order('rank', { ascending: true });
    if (itemsErr) {
      return res.json({ tracks: [] });
    }

    res.json({ tracks: items || [] });
  } catch (err) {
    next(err);
  }
});

router.get('/global-top-tracks', async (req, res, next) => {
  try {
    const year = new Date().getFullYear();
    const timeRange = req.query.time_range || 'medium_term';

    const { data: snapshots, error: snapshotErr } = await supabaseAdmin
      .from('wrapped_snapshot')
      .select('id')
      .eq('year', year)
      .eq('time_range', timeRange);

    if (snapshotErr) {
      return res.status(500).json({ error: 'Failed to fetch snapshot data' });
    }

    const snapshotIds = (snapshots || []).map((s) => s.id);
    if (snapshotIds.length === 0) {
      return res.json({ tracks: [] });
    }

    const { data: items, error } = await supabaseAdmin
      .from('wrapped_items')
      .select('spotify_id, name, artists, image_url, snapshot_id, rank')
      .eq('item_type', 'track');

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch global tracks' });
    }

    const totals = new Map();
    for (const item of items || []) {
      const id = item.spotify_id;
      const snapshotId = item.snapshot_id;
      if (!snapshotIds.includes(snapshotId)) continue;
      if (!id) continue;

      if (!totals.has(id)) {
        totals.set(id, {
          spotify_id: id,
          name: item.name,
          artists: item.artists || '',
          image_url: item.image_url,
          appearance_count: 0,
          _snapshots: new Set(),
          rank_sum: 0,
          rank_count: 0
        });
      }

      const row = totals.get(id);
      if ((!row.artists || row.artists.trim().length === 0) && item.artists) {
        row.artists = item.artists;
      }
      row._snapshots.add(snapshotId);
      if (typeof item.rank === 'number') {
        row.rank_sum += item.rank;
        row.rank_count += 1;
      }
    }

    const normalized = Array.from(totals.values()).map((row) => ({
      spotify_id: row.spotify_id,
      name: row.name,
      artists: row.artists,
      image_url: row.image_url,
      appearance_count: row._snapshots.size,
      avg_rank: row.rank_count > 0 ? row.rank_sum / row.rank_count : 999
    }));

    const top50 = normalized
      .sort((a, b) => {
        if (b.appearance_count !== a.appearance_count) {
          return b.appearance_count - a.appearance_count;
        }
        return a.avg_rank - b.avg_rank;
      })
      .slice(0, 50);

    res.json({ tracks: top50 });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/spotify/profile-stats/:userId
 * Retrieves the cached top tracks for ANY user (for viewing friends' profiles)
 */
router.get('/profile-stats/:userId', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token' });
    }

    const targetUserId = req.params.userId;
    const year = new Date().getFullYear();

    const { data: spotifyAccount, error: accErr } = await supabaseAdmin
      .from('spotify_accounts')
      .select('id')
      .eq('user_id', targetUserId)
      .single();

    if (accErr || !spotifyAccount) {
      return res.json({ tracks: [] }); 
    }

    const { data: snapshot, error: snapErr } = await supabaseAdmin
      .from('wrapped_snapshot')
      .select('id')
      .eq('spotify_acc_id', spotifyAccount.id)
      .eq('year', year)
      .eq('time_range', 'medium_term')
      .single();

    if (snapErr || !snapshot) {
      return res.json({ tracks: [] }); 
    }

    const { data: items, error: itemsErr } = await supabaseAdmin
      .from('wrapped_items')
      .select('rank, name, artists, image_url, spotify_id')
      .eq('snapshot_id', snapshot.id)
      .eq('item_type', 'track')
      .order('rank', { ascending: true });

    if (itemsErr) {
      return res.json({ tracks: [] });
    }

    const formattedTracks = (items || []).map(t => ({
      rank: t.rank,
      name: t.name,
      artists: t.artists || '',
      image: t.image_url,
      spotify_id: t.spotify_id
    }));

    res.json({ tracks: formattedTracks });
  } catch (err) {
    console.error('[profile-stats] Error:', err.message);
    next(err);
  }
});

/**
 * GET /api/spotify/faculty-top-tracks
 * Returns top 50 tracks for users in the same cohort as the current user.
 * Cohort priority: same major (if available), otherwise same faculty.
 */
router.get('/faculty-top-tracks', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token' });
    }
    const token = authHeader.substring(7);
    const { data: { user }, error: getUserErr } = await supabase.auth.getUser(token);
    if (getUserErr || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { data: me, error: meErr } = await supabaseAdmin
      .from('users')
      .select('faculty, major')
      .eq('id', user.id)
      .single();
    if (meErr || !me) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    const year = new Date().getFullYear();
    const timeRange = req.query.time_range || 'medium_term';

    let cohortField = null;
    let cohortValue = null;
    if (me.major && String(me.major).trim().length > 0) {
      cohortField = 'major';
      cohortValue = me.major;
    } else if (me.faculty && String(me.faculty).trim().length > 0) {
      cohortField = 'faculty';
      cohortValue = me.faculty;
    } else {
      return res.json({ tracks: [], cohort: null });
    }

    const { data: cohortUsers, error: cohortUsersErr } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq(cohortField, cohortValue);
    if (cohortUsersErr) {
      return res.status(500).json({ error: 'Failed to fetch cohort users' });
    }

    const cohortUserIds = (cohortUsers || []).map((u) => u.id);
    if (cohortUserIds.length === 0) {
      return res.json({ tracks: [], cohort: { field: cohortField, value: cohortValue } });
    }

    const { data: accounts, error: accountsErr } = await supabaseAdmin
      .from('spotify_accounts')
      .select('id, user_id')
      .in('user_id', cohortUserIds);
    if (accountsErr) {
      return res.status(500).json({ error: 'Failed to fetch Spotify accounts' });
    }

    const accountIds = (accounts || []).map((a) => a.id);
    if (accountIds.length === 0) {
      return res.json({ tracks: [], cohort: { field: cohortField, value: cohortValue } });
    }

    const { data: snapshots, error: snapshotErr } = await supabaseAdmin
      .from('wrapped_snapshot')
      .select('id')
      .in('spotify_acc_id', accountIds)
      .eq('year', year)
      .eq('time_range', timeRange);
    if (snapshotErr) {
      return res.status(500).json({ error: 'Failed to fetch snapshot data' });
    }

    const snapshotIds = (snapshots || []).map((s) => s.id);
    if (snapshotIds.length === 0) {
      return res.json({ tracks: [], cohort: { field: cohortField, value: cohortValue } });
    }
    const snapshotIdSet = new Set(snapshotIds);

    const { data: items, error: itemsErr } = await supabaseAdmin
      .from('wrapped_items')
      .select('spotify_id, name, artists, image_url, snapshot_id, rank')
      .eq('item_type', 'track')
      .in('snapshot_id', snapshotIds);
    if (itemsErr) {
      return res.status(500).json({ error: 'Failed to fetch faculty tracks' });
    }

    const totals = new Map();
    for (const item of items || []) {
      const id = item.spotify_id;
      const snapshotId = item.snapshot_id;
      if (!snapshotIdSet.has(snapshotId) || !id) continue;

      if (!totals.has(id)) {
        totals.set(id, {
          spotify_id: id,
          name: item.name,
          artists: item.artists || '',
          image_url: item.image_url,
          _snapshots: new Set(),
          rank_sum: 0,
          rank_count: 0
        });
      }

      const row = totals.get(id);
      if ((!row.artists || row.artists.trim().length === 0) && item.artists) {
        row.artists = item.artists;
      }
      row._snapshots.add(snapshotId);
      if (typeof item.rank === 'number') {
        row.rank_sum += item.rank;
        row.rank_count += 1;
      }
    }

    const top50 = Array.from(totals.values())
      .map((row) => ({
        spotify_id: row.spotify_id,
        name: row.name,
        artists: row.artists,
        image_url: row.image_url,
        appearance_count: row._snapshots.size,
        avg_rank: row.rank_count > 0 ? row.rank_sum / row.rank_count : 999
      }))
      .sort((a, b) => {
        if (b.appearance_count !== a.appearance_count) {
          return b.appearance_count - a.appearance_count;
        }
        return a.avg_rank - b.avg_rank;
      })
      .slice(0, 50);

    res.json({
      tracks: top50,
      cohort: { field: cohortField, value: cohortValue }
    });
  } catch (err) {
    console.error('[faculty-top-tracks] Error:', err.message);
    next(err);
  }
});

/**
 * GET /api/spotify/year-top-tracks
 * Top 50 aggregate for users with the same class year (graduation year).
 */
router.get('/year-top-tracks', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token' });
    }
    const token = authHeader.substring(7);
    const { data: { user }, error: getUserErr } = await supabase.auth.getUser(token);
    if (getUserErr || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { data: me, error: meErr } = await supabaseAdmin
      .from('users')
      .select('class_year')
      .eq('id', user.id)
      .single();
    if (meErr || !me) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    const classYear = me.class_year;
    if (classYear == null || classYear === undefined) {
      return res.json({ tracks: [], cohort: null });
    }

    const timeRange = req.query.time_range || 'medium_term';

    const { data: cohortUsers, error: cohortUsersErr } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('class_year', classYear);
    if (cohortUsersErr) {
      return res.status(500).json({ error: 'Failed to fetch cohort users' });
    }

    const cohortUserIds = (cohortUsers || []).map((u) => u.id);
    if (cohortUserIds.length === 0) {
      return res.json({ tracks: [], cohort: { field: 'class_year', value: classYear } });
    }

    const tracks = await computeTopTracksForParticipants(cohortUserIds, timeRange);
    res.json({
      tracks,
      cohort: { field: 'class_year', value: classYear }
    });
  } catch (err) {
    console.error('[year-top-tracks] Error:', err.message);
    next(err);
  }
});

/**
 * GET /api/spotify/faculty-school-top-tracks
 * Top 50 aggregate for all users in the same faculty (school), regardless of major.
 */
router.get('/faculty-school-top-tracks', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token' });
    }
    const token = authHeader.substring(7);
    const { data: { user }, error: getUserErr } = await supabase.auth.getUser(token);
    if (getUserErr || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { data: me, error: meErr } = await supabaseAdmin
      .from('users')
      .select('faculty')
      .eq('id', user.id)
      .single();
    if (meErr || !me) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    if (!me.faculty || String(me.faculty).trim().length === 0) {
      return res.json({ tracks: [], cohort: null });
    }

    const facultyValue = String(me.faculty).trim();
    const timeRange = req.query.time_range || 'medium_term';

    const { data: cohortUsers, error: cohortUsersErr } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('faculty', facultyValue);
    if (cohortUsersErr) {
      return res.status(500).json({ error: 'Failed to fetch cohort users' });
    }

    const cohortUserIds = (cohortUsers || []).map((u) => u.id);
    if (cohortUserIds.length === 0) {
      return res.json({ tracks: [], cohort: { field: 'faculty', value: facultyValue } });
    }

    const tracks = await computeTopTracksForParticipants(cohortUserIds, timeRange);
    res.json({
      tracks,
      cohort: { field: 'faculty', value: facultyValue }
    });
  } catch (err) {
    console.error('[faculty-school-top-tracks] Error:', err.message);
    next(err);
  }
});

/**
 * GET /api/spotify/friends-top-tracks
 * Returns top 50 tracks for current user + selected friends.
 * Query: friend_ids=uuid1,uuid2,...
 */
router.get('/friends-top-tracks', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token' });
    }
    const token = authHeader.substring(7);
    const { data: { user }, error: getUserErr } = await supabase.auth.getUser(token);
    if (getUserErr || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const year = new Date().getFullYear();
    const timeRange = req.query.time_range || 'medium_term';
    const friendIdsParam = String(req.query.friend_ids || '').trim();
    const requestedFriendIds = friendIdsParam
      ? friendIdsParam.split(',').map((id) => id.trim()).filter(Boolean)
      : [];

    if (requestedFriendIds.length === 0) {
      return res.status(400).json({ error: 'Select at least one friend' });
    }

    const me = user.id;
    const { data: followingRows, error: followingErr } = await supabaseAdmin
      .from('followers')
      .select('following_id')
      .eq('follower_id', me);
    if (followingErr) {
      return res.status(500).json({ error: 'Failed to fetch following users' });
    }

    const myFollowingIdSet = new Set((followingRows || []).map((r) => r.following_id));
    const allowedFriendIds = requestedFriendIds.filter((id) => myFollowingIdSet.has(id));
    if (allowedFriendIds.length === 0) {
      return res.status(400).json({ error: 'No valid followed users selected' });
    }

    const participantUserIds = [me, ...allowedFriendIds];

    const { data: accounts, error: accountsErr } = await supabaseAdmin
      .from('spotify_accounts')
      .select('id, user_id')
      .in('user_id', participantUserIds);
    if (accountsErr) {
      return res.status(500).json({ error: 'Failed to fetch Spotify accounts' });
    }

    const accountIds = (accounts || []).map((a) => a.id);
    if (accountIds.length === 0) {
      return res.json({ tracks: [], participants: participantUserIds });
    }

    const { data: snapshots, error: snapshotErr } = await supabaseAdmin
      .from('wrapped_snapshot')
      .select('id')
      .in('spotify_acc_id', accountIds)
      .eq('year', year)
      .eq('time_range', timeRange);
    if (snapshotErr) {
      return res.status(500).json({ error: 'Failed to fetch snapshot data' });
    }

    const snapshotIds = (snapshots || []).map((s) => s.id);
    if (snapshotIds.length === 0) {
      return res.json({ tracks: [], participants: participantUserIds });
    }
    const snapshotIdSet = new Set(snapshotIds);

    const { data: items, error: itemsErr } = await supabaseAdmin
      .from('wrapped_items')
      .select('spotify_id, name, artists, image_url, snapshot_id, rank')
      .eq('item_type', 'track')
      .in('snapshot_id', snapshotIds);
    if (itemsErr) {
      return res.status(500).json({ error: 'Failed to fetch friend tracks' });
    }

    const totals = new Map();
    for (const item of items || []) {
      const id = item.spotify_id;
      const snapshotId = item.snapshot_id;
      if (!snapshotIdSet.has(snapshotId) || !id) continue;

      if (!totals.has(id)) {
        totals.set(id, {
          spotify_id: id,
          name: item.name,
          artists: item.artists || '',
          image_url: item.image_url,
          _snapshots: new Set(),
          rank_sum: 0,
          rank_count: 0
        });
      }

      const row = totals.get(id);
      if ((!row.artists || row.artists.trim().length === 0) && item.artists) {
        row.artists = item.artists;
      }
      row._snapshots.add(snapshotId);
      if (typeof item.rank === 'number') {
        row.rank_sum += item.rank;
        row.rank_count += 1;
      }
    }

    const top50 = Array.from(totals.values())
      .map((row) => ({
        spotify_id: row.spotify_id,
        name: row.name,
        artists: row.artists,
        image_url: row.image_url,
        appearance_count: row._snapshots.size,
        avg_rank: row.rank_count > 0 ? row.rank_sum / row.rank_count : 999
      }))
      .sort((a, b) => {
        if (b.appearance_count !== a.appearance_count) {
          return b.appearance_count - a.appearance_count;
        }
        return a.avg_rank - b.avg_rank;
      })
      .slice(0, 50);

    res.json({
      tracks: top50,
      participants: participantUserIds
    });
  } catch (err) {
    console.error('[friends-top-tracks] Error:', err.message);
    next(err);
  }
});

async function computeTopTracksForParticipants(participantUserIds, timeRange = 'medium_term') {
  const year = new Date().getFullYear();
  const { data: accounts, error: accountsErr } = await supabaseAdmin
    .from('spotify_accounts')
    .select('id, user_id')
    .in('user_id', participantUserIds);
  if (accountsErr) {
    throw new Error('Failed to fetch Spotify accounts');
  }

  const accountIds = (accounts || []).map((a) => a.id);
  if (accountIds.length === 0) return [];

  const { data: snapshots, error: snapshotErr } = await supabaseAdmin
    .from('wrapped_snapshot')
    .select('id')
    .in('spotify_acc_id', accountIds)
    .eq('year', year)
    .eq('time_range', timeRange);
  if (snapshotErr) {
    throw new Error('Failed to fetch snapshot data');
  }

  const snapshotIds = (snapshots || []).map((s) => s.id);
  if (snapshotIds.length === 0) return [];
  const snapshotIdSet = new Set(snapshotIds);

  const { data: items, error: itemsErr } = await supabaseAdmin
    .from('wrapped_items')
    .select('spotify_id, name, artists, image_url, snapshot_id, rank')
    .eq('item_type', 'track')
    .in('snapshot_id', snapshotIds);
  if (itemsErr) {
    throw new Error('Failed to fetch track data');
  }

  const totals = new Map();
  for (const item of items || []) {
    const id = item.spotify_id;
    const snapshotId = item.snapshot_id;
    if (!snapshotIdSet.has(snapshotId) || !id) continue;

    if (!totals.has(id)) {
      totals.set(id, {
        spotify_id: id,
        name: item.name,
        artists: item.artists || '',
        image_url: item.image_url,
        _snapshots: new Set(),
        rank_sum: 0,
        rank_count: 0
      });
    }

    const row = totals.get(id);
    if ((!row.artists || row.artists.trim().length === 0) && item.artists) {
      row.artists = item.artists;
    }
    row._snapshots.add(snapshotId);
    if (typeof item.rank === 'number') {
      row.rank_sum += item.rank;
      row.rank_count += 1;
    }
  }

  return Array.from(totals.values())
    .map((row) => ({
      spotify_id: row.spotify_id,
      name: row.name,
      artists: row.artists,
      image_url: row.image_url,
      appearance_count: row._snapshots.size,
      avg_rank: row.rank_count > 0 ? row.rank_sum / row.rank_count : 999
    }))
    .sort((a, b) => {
      if (b.appearance_count !== a.appearance_count) {
        return b.appearance_count - a.appearance_count;
      }
      return a.avg_rank - b.avg_rank;
    })
    .slice(0, 50);
}

router.get('/shared-playlists', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token' });
    }
    const token = authHeader.substring(7);
    const { data: { user }, error: getUserErr } = await supabase.auth.getUser(token);
    if (getUserErr || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const me = user.id;
    const { data: memberRows, error: memberRowsErr } = await supabaseAdmin
      .from('shared_wrapped_playlist_members')
      .select('playlist_id')
      .eq('user_id', me);
    if (memberRowsErr && memberRowsErr.code === 'PGRST205') {
      return res.json({ playlists: [] });
    }
    if (memberRowsErr) {
      return res.status(500).json({ error: 'Failed to fetch playlist access' });
    }

    const { data: ownedRows, error: ownedRowsErr } = await supabaseAdmin
      .from('shared_wrapped_playlists')
      .select('id')
      .eq('owner_user_id', me);
    if (ownedRowsErr && ownedRowsErr.code === 'PGRST205') {
      return res.json({ playlists: [] });
    }
    if (ownedRowsErr) {
      return res.status(500).json({ error: 'Failed to fetch owned playlists' });
    }

    const playlistIdSet = new Set([
      ...(memberRows || []).map((r) => r.playlist_id),
      ...(ownedRows || []).map((r) => r.id)
    ]);
    const playlistIds = Array.from(playlistIdSet).filter(Boolean);
    if (playlistIds.length === 0) return res.json({ playlists: [] });

    const { data: playlists, error: playlistsErr } = await supabaseAdmin
      .from('shared_wrapped_playlists')
      .select('id, name, owner_user_id, created_at')
      .in('id', playlistIds)
      .order('created_at', { ascending: false });
    if (playlistsErr) {
      return res.status(500).json({ error: 'Failed to fetch playlists' });
    }

    const { data: tracks, error: tracksErr } = await supabaseAdmin
      .from('shared_wrapped_playlist_tracks')
      .select('playlist_id, position, spotify_id, name, artists, image_url')
      .in('playlist_id', playlistIds)
      .order('position', { ascending: true });
    if (tracksErr) {
      return res.status(500).json({ error: 'Failed to fetch playlist tracks' });
    }

    const { data: members, error: membersErr } = await supabaseAdmin
      .from('shared_wrapped_playlist_members')
      .select('playlist_id, user_id')
      .in('playlist_id', playlistIds);
    if (membersErr) {
      return res.status(500).json({ error: 'Failed to fetch playlist members' });
    }

    const memberUserIds = Array.from(new Set((members || []).map((m) => m.user_id)));
    const { data: memberUsers } = memberUserIds.length
      ? await supabaseAdmin
        .from('users')
        .select('id, display_name')
        .in('id', memberUserIds)
      : { data: [] };
    const nameByUserId = new Map((memberUsers || []).map((u) => [u.id, u.display_name || 'Unknown']));

    const tracksByPlaylist = new Map();
    (tracks || []).forEach((track) => {
      if (!tracksByPlaylist.has(track.playlist_id)) tracksByPlaylist.set(track.playlist_id, []);
      tracksByPlaylist.get(track.playlist_id).push({
        id: track.spotify_id,
        spotifyId: track.spotify_id,
        title: track.name,
        album: track.artists || 'Unknown artist',
        imageUrl: track.image_url
      });
    });

    const membersByPlaylist = new Map();
    (members || []).forEach((member) => {
      if (!membersByPlaylist.has(member.playlist_id)) membersByPlaylist.set(member.playlist_id, []);
      membersByPlaylist.get(member.playlist_id).push(member.user_id);
    });

    const result = (playlists || []).map((playlist) => {
      const memberIds = membersByPlaylist.get(playlist.id) || [];
      return {
        id: playlist.id,
        title: playlist.name,
        ownerUserId: playlist.owner_user_id,
        isOwner: playlist.owner_user_id === me,
        songs: tracksByPlaylist.get(playlist.id) || [],
        selectedFriendIds: memberIds.filter((id) => id !== playlist.owner_user_id),
        selectedFriendNames: memberIds
          .filter((id) => id !== playlist.owner_user_id)
          .map((id) => nameByUserId.get(id) || 'Unknown')
      };
    });

    return res.json({ playlists: result });
  } catch (err) {
    console.error('[shared-playlists] Error:', err.message);
    next(err);
  }
});

router.post('/shared-playlists', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token' });
    }
    const token = authHeader.substring(7);
    const { data: { user }, error: getUserErr } = await supabase.auth.getUser(token);
    if (getUserErr || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const me = user.id;
    const name = String(req.body?.name || '').trim();
    const friendIds = Array.isArray(req.body?.friend_ids)
      ? req.body.friend_ids.map((id) => String(id).trim()).filter(Boolean)
      : [];
    if (!name) return res.status(400).json({ error: 'Playlist name is required' });

    const { data: followingRows, error: followingErr } = await supabaseAdmin
      .from('followers')
      .select('following_id')
      .eq('follower_id', me);
    if (followingErr) {
      return res.status(500).json({ error: 'Failed to fetch following users' });
    }
    const allowedFollowingSet = new Set((followingRows || []).map((r) => r.following_id));
    const allowedFriendIds = friendIds.filter((id) => allowedFollowingSet.has(id));
    const participantUserIds = [me, ...allowedFriendIds];

    const top50 = await computeTopTracksForParticipants(participantUserIds, 'medium_term');
    const trackRows = top50.map((track, index) => ({
      position: index + 1,
      spotify_id: track.spotify_id,
      name: track.name,
      artists: track.artists || '',
      image_url: track.image_url
    }));

    const { data: playlist, error: playlistErr } = await supabaseAdmin
      .from('shared_wrapped_playlists')
      .insert({ owner_user_id: me, name })
      .select('id, name, owner_user_id, created_at')
      .single();
    if (playlistErr) {
      return res.status(500).json({ error: 'Failed to create playlist' });
    }

    const memberRows = participantUserIds.map((userId) => ({
      playlist_id: playlist.id,
      user_id: userId
    }));
    const { error: membersErr } = await supabaseAdmin
      .from('shared_wrapped_playlist_members')
      .insert(memberRows);
    if (membersErr) {
      return res.status(500).json({ error: 'Failed to save playlist members' });
    }

    if (trackRows.length > 0) {
      const { error: tracksErr } = await supabaseAdmin
        .from('shared_wrapped_playlist_tracks')
        .insert(trackRows.map((row) => ({ ...row, playlist_id: playlist.id })));
      if (tracksErr) {
        return res.status(500).json({ error: 'Failed to save playlist tracks' });
      }
    }

    const { data: selectedUsers } = allowedFriendIds.length
      ? await supabaseAdmin.from('users').select('id, display_name').in('id', allowedFriendIds)
      : { data: [] };
    const selectedFriendNames = (selectedUsers || []).map((u) => u.display_name || 'Unknown');

    return res.status(201).json({
      playlist: {
        id: playlist.id,
        title: playlist.name,
        ownerUserId: playlist.owner_user_id,
        isOwner: true,
        songs: trackRows.map((row) => ({
          id: row.spotify_id,
          spotifyId: row.spotify_id,
          title: row.name,
          album: row.artists || 'Unknown artist',
          imageUrl: row.image_url
        })),
        selectedFriendIds: allowedFriendIds,
        selectedFriendNames
      }
    });
  } catch (err) {
    console.error('[shared-playlists:create] Error:', err.message);
    next(err);
  }
});

router.patch('/shared-playlists/:id', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token' });
    }
    const token = authHeader.substring(7);
    const { data: { user }, error: getUserErr } = await supabase.auth.getUser(token);
    if (getUserErr || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const playlistId = req.params.id;
    const name = String(req.body?.name || '').trim();
    if (!name) return res.status(400).json({ error: 'Playlist name is required' });

    const { data: playlist, error: playlistErr } = await supabaseAdmin
      .from('shared_wrapped_playlists')
      .select('id, owner_user_id')
      .eq('id', playlistId)
      .single();
    if (playlistErr || !playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }
    if (playlist.owner_user_id !== user.id) {
      return res.status(403).json({ error: 'Only the playlist owner can rename' });
    }

    const { error: updateErr } = await supabaseAdmin
      .from('shared_wrapped_playlists')
      .update({ name, updated_at: new Date().toISOString() })
      .eq('id', playlistId);
    if (updateErr) {
      return res.status(500).json({ error: 'Failed to rename playlist' });
    }
    return res.json({ success: true, name });
  } catch (err) {
    console.error('[shared-playlists:rename] Error:', err.message);
    next(err);
  }
});

router.delete('/shared-playlists/:id', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token' });
    }
    const token = authHeader.substring(7);
    const { data: { user }, error: getUserErr } = await supabase.auth.getUser(token);
    if (getUserErr || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const playlistId = req.params.id;
    const { data: playlist, error: playlistErr } = await supabaseAdmin
      .from('shared_wrapped_playlists')
      .select('id, owner_user_id')
      .eq('id', playlistId)
      .single();
    if (playlistErr || !playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }
    if (playlist.owner_user_id !== user.id) {
      return res.status(403).json({ error: 'Only the playlist owner can delete' });
    }

    await supabaseAdmin.from('shared_wrapped_playlist_tracks').delete().eq('playlist_id', playlistId);
    await supabaseAdmin.from('shared_wrapped_playlist_members').delete().eq('playlist_id', playlistId);
    const { error: deleteErr } = await supabaseAdmin
      .from('shared_wrapped_playlists')
      .delete()
      .eq('id', playlistId);
    if (deleteErr) {
      return res.status(500).json({ error: 'Failed to delete playlist' });
    }
    return res.json({ success: true });
  } catch (err) {
    console.error('[shared-playlists:delete] Error:', err.message);
    next(err);
  }
});

export default router;