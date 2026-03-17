import express from 'express';
import { supabase, supabaseAdmin } from '../config/supabase.js';

const router = express.Router();

/**
 * GET /api/feed
 * Fetches all feed posts
 */
router.get('/', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'No token' });
    
    const { data, error } = await supabaseAdmin
      .from('feed_posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ posts: data });
  } catch (err) { next(err); }
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

    // EXTRACT GENRE
    const { song_name, artist_name, album_image_url, spotify_track_id, username, album_name, release_date, genre } = req.body;
    if (!song_name || !artist_name || !spotify_track_id) return res.status(400).json({ error: 'Missing required song data' });

    // INSERT GENRE
    const { data, error } = await supabaseAdmin
      .from('feed_posts')
      .insert({
        user_id: user.id,
        username,
        song_name,
        artist_name,
        album_image_url,
        spotify_track_id,
        album_name,
        release_date,
        genre 
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ message: 'Successfully sent to feed', post: data });
  } catch (err) { next(err); }
});

/**
 * DELETE /api/feed/:id
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'No token' });
    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) return res.status(401).json({ error: 'Invalid token' });

    const { error } = await supabaseAdmin
      .from('feed_posts')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', user.id);

    if (error) throw error;
    res.json({ message: 'Successfully removed' });
  } catch (err) { next(err); }
});

export default router;