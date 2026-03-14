import express from 'express';
import { supabase, supabaseAdmin } from '../config/supabase.js';

const router = express.Router();

/**
 * POST /api/feed
 * Adds a new song to the user's feed
 */
router.post('/', async (req, res, next) => {
  try {
    // 1. Verify user's token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // 2. Extract song data AND username from the request body
    const { song_name, artist_name, album_image_url, spotify_track_id, username } = req.body;

    if (!song_name || !artist_name || !spotify_track_id) {
      return res.status(400).json({ error: 'Missing required song data' });
    }

    // 3. Insert into the feed_posts table
    const { data, error } = await supabaseAdmin
      .from('feed_posts')
      .insert({
        user_id: user.id,
        username, // <-- FIXED: Added username back in
        song_name,
        artist_name,
        album_image_url,
        spotify_track_id
      })
      .select()
      .single();

    if (error) throw error;

    // FIXED: Changed message to say "feed" instead of "server"
    res.status(201).json({ message: 'Successfully sent to feed', post: data });
  } catch (err) {
    next(err);
  }
});

export default router;