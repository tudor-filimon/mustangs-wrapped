import express from 'express';
import { supabase, supabaseAdmin } from '../config/supabase.js';

const router = express.Router();

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
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'No token' });
    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) return res.status(401).json({ error: 'Invalid or expired token' });

    // GENRE REMOVED
    const { song_name, artist_name, album_image_url, spotify_track_id, username, album_name, release_date } = req.body;
    if (!song_name || !artist_name || !spotify_track_id) return res.status(400).json({ error: 'Missing required song data' });

    const { data: existingPost } = await supabaseAdmin
      .from('feed_posts')
      .select('id')
      .eq('user_id', user.id)
      .eq('spotify_track_id', spotify_track_id)
      .maybeSingle();

    if (existingPost) {
      return res.status(409).json({ error: 'Song already in feed', message: 'This track is already in your feed.' });
    }

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
        release_date
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ message: 'Successfully sent to feed', post: data });
  } catch (err) {
    next(err);
  }
});

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
  } catch (err) {
    next(err);
  }
});

export default router;