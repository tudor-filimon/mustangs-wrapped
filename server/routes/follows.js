import express from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// All routes require auth
router.use(authenticate);

/**
 * GET /api/follows/users/search?q=
 * Search users by display_name (excludes current user). Uses Supabase users table.
 */
router.get('/users/search', async (req, res, next) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q || q.length < 2) {
      return res.json({ users: [] });
    }
    const { data: users, error } = await supabaseAdmin
      .from('users')
      .select('id, display_name, avatar_url, faculty, class_year, major')
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
 * POST /api/follows/:userId
 * Current user follows target user
 */
router.post('/:userId', async (req, res, next) => {
  try {
    const followerId = req.user.id;
    const followingId = req.params.userId;

    if (!followingId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    if (followingId === followerId) {
      return res.status(400).json({ error: 'You cannot follow yourself' });
    }

    const { data, error } = await supabaseAdmin
      .from('followers')
      .insert({ follower_id: followerId, following_id: followingId })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        // unique_violation: already following
        return res.status(409).json({ error: 'Already following' });
      }
      throw error;
    }

    res.status(201).json({ follow: data });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/follows/:userId
 * Current user unfollows target user
 */
router.delete('/:userId', async (req, res, next) => {
  try {
    const followerId = req.user.id;
    const followingId = req.params.userId;

    const { error } = await supabaseAdmin
      .from('followers')
      .delete()
      .eq('follower_id', followerId)
      .eq('following_id', followingId);

    if (error) throw error;
    res.json({ message: 'Unfollowed' });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/follows/following
 * List users current user is following
 */
router.get('/following/list', async (req, res, next) => {
  try {
    const me = req.user.id;

    const { data: rows, error } = await supabaseAdmin
      .from('followers')
      .select('following_id')
      .eq('follower_id', me);

    if (error) throw error;

    if (!rows || rows.length === 0) {
      return res.json({ following: [] });
    }

    const ids = rows.map(r => r.following_id);

    const { data: users, error: usersErr } = await supabaseAdmin
      .from('users')
      .select('id, display_name, avatar_url, faculty, class_year, major')
      .in('id', ids);

    if (usersErr) throw usersErr;
    res.json({ following: users || [] });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/follows/followers
 * List users who follow current user
 */
router.get('/followers/list', async (req, res, next) => {
  try {
    const me = req.user.id;

    const { data: rows, error } = await supabaseAdmin
      .from('followers')
      .select('follower_id')
      .eq('following_id', me);

    if (error) throw error;

    if (!rows || rows.length === 0) {
      return res.json({ followers: [] });
    }

    const ids = rows.map(r => r.follower_id);

    const { data: users, error: usersErr } = await supabaseAdmin
      .from('users')
      .select('id, display_name, avatar_url, faculty, class_year, major')
      .in('id', ids);

    if (usersErr) throw usersErr;
    res.json({ followers: users || [] });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/follows/profile/:userId
 * Get user profile from users table (for viewing other users' profiles)
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

    if (error || !profile) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (otherId === me) {
      return res.json({ user: profile, isSelf: true, areFriends: false, requestStatus: 'none' });
    }

    res.json({ user: profile, isSelf: false, areFriends: false, requestStatus: 'none' });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/follows/status/:userId
 * For current user vs target: isFollowing, isFollower
 */
router.get('/status/:userId', async (req, res, next) => {
  try {
    const me = req.user.id;
    const otherId = req.params.userId;

    if (!otherId || otherId === me) {
      return res.json({ isFollowing: false, isFollower: false });
    }

    const { data, error } = await supabaseAdmin
      .from('followers')
      .select('follower_id, following_id')
      .or(`and(follower_id.eq.${me},following_id.eq.${otherId}),and(follower_id.eq.${otherId},following_id.eq.${me})`);

    if (error) throw error;

    let isFollowing = false;
    let isFollower = false;

    (data || []).forEach(row => {
      if (row.follower_id === me && row.following_id === otherId) isFollowing = true;
      if (row.follower_id === otherId && row.following_id === me) isFollower = true;
    });

    res.json({ isFollowing, isFollower });
  } catch (err) {
    next(err);
  }
});

export default router;
