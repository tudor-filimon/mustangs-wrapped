import express from 'express';
import { supabase, supabaseAdmin } from '../config/supabase.js';

const router = express.Router();

/**
 * GET /api/feed
 * Fetches all feed posts to populate the galaxy
 */
router.get('/', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'No token' });
    
//    Here will add a where clause later once following is fully BUILT
    const { data, error } = await supabaseAdmin
      .from('feed_posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ posts: data });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/feed
 * Adds a new song to the user's feed
 */
router.post('/', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'No token' });
    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) return res.status(401).json({ error: 'Invalid or expired token' });

    const { song_name, artist_name, album_image_url, spotify_track_id, username } = req.body;
    if (!song_name || !artist_name || !spotify_track_id) return res.status(400).json({ error: 'Missing required song data' });

    const { data, error } = await supabaseAdmin
      .from('feed_posts')
      .insert({
        user_id: user.id,
        username,
        song_name,
        artist_name,
        album_image_url,
        spotify_track_id
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ message: 'Successfully sent to feed', post: data });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/feed/:id
 * Removes a post from the feed
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'No token' });
    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) return res.status(401).json({ error: 'Invalid token' });

    // Ensure the user deleting it is the user who posted it!
    const { error } = await supabaseAdmin
      .from('feed_posts')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', user.id);

    if (error) throw error;
    res.json({ message: 'Successfully removed from orbit' });
  } catch (err) {
    next(err);
  }
});

export default router;