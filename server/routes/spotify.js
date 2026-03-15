import express from 'express';
import axios from 'axios';
import { supabase, supabaseAdmin } from '../config/supabase.js';
import crypto from 'crypto';

const router = express.Router();

async function getAccessTokenForUserId(userId) {
  const { data: spotifyAccount } = await supabaseAdmin
    .from('spotify_accounts')
    .select('id')
    .eq('user_id', userId)
    .single();
  if (!spotifyAccount) throw { status: 404, message: 'No linked Spotify account' };

  const { data: tokenRow } = await supabaseAdmin
    .from('spotify_tokens')
    .select('spotify_acc_id, access_token_encrypted, refresh_token_encrypted, expires_at')
    .eq('spotify_acc_id', spotifyAccount.id)
    .single();

  if (!tokenRow) throw { status: 404, message: 'No Spotify tokens' };

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
    await supabaseAdmin.from('spotify_tokens')
      .update({ access_token_encrypted: accessToken, expires_at: newExpiresAt })
      .eq('spotify_acc_id', tokenRow.spotify_acc_id);
  }

  return accessToken;
}

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
      expiresAt: Date.now() + 10 * 60 * 1000 
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
    if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'No token' });
    const token = authHeader.substring(7);
    const { data: { user }, error: getUserErr } = await supabase.auth.getUser(token);
    if (getUserErr || !user) return res.status(401).json({ error: 'Invalid token' });

    const { data: spotifyAccount, error: spotifyAccountError } = await supabaseAdmin
      .from('spotify_accounts')
      .select('id')
      .eq('user_id', user.id)
      .single();
    if (!spotifyAccount) return res.status(404).json({ error: 'No linked Spotify account' });

    const { data: tokenRow, error: tokenError } = await supabaseAdmin
      .from('spotify_tokens')
      .select('spotify_acc_id, access_token_encrypted, refresh_token_encrypted, expires_at')
      .eq('spotify_acc_id', spotifyAccount.id)
      .single();
    if (!tokenRow) return res.status(404).json({ error: 'No Spotify tokens' });

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

    if (spotifyResp.status === 204) return res.json({ playing: false });

    const data = spotifyResp.data;
    const item = data.item;
    if (!item) return res.json({ playing: false });

    const song = item.name;
    const artists = item.artists?.map(a => a.name).join(', ') || '';
    const image = item.album?.images?.[0]?.url || null;
    const track_id = item.id; // <-- WE GRAB THE ID HERE

    res.json({
      playing: true,
      song,
      artists,
      image,
      track_id, // <-- ADDED TO THE RESPONSE
      progress_ms: data.progress_ms,
      duration_ms: item.duration_ms
    });
  } catch (err) {
    next(err);
  }
});

router.get('/top-tracks', async (req, res, next) => {
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

    const timeRange = req.query.time_range || 'short_term';

    // Helper to fetch top tracks for a given time range
    const fetchTopTracksForRange = async (range) => {
      const resp = await axios.get(
        `https://api.spotify.com/v1/me/top/tracks?limit=50&time_range=${range}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      return resp.data?.items || [];
    };

    // Start with requested time range
    let combinedItems = await fetchTopTracksForRange(timeRange);
    const seenIds = new Set(combinedItems.map((t) => t.id));

    // Try other time ranges to fill up to 50 unique tracks
    const allRanges = ['short_term', 'medium_term', 'long_term'];
    for (const range of allRanges) {
      if (combinedItems.length >= 50) break;
      if (range === timeRange) continue;

      try {
        const extra = await fetchTopTracksForRange(range);
        for (const t of extra) {
          if (!t || !t.id || seenIds.has(t.id)) continue;
          combinedItems.push(t);
          seenIds.add(t.id);
          if (combinedItems.length >= 50) break;
        }
      } catch (e) {
        // If a fallback range fails, just skip it
        console.warn(`[top-tracks] Failed to fetch extra range ${range}:`, e.message);
      }
    }

    // As a final fallback, use recently-played to pad up to 50 unique tracks
    if (combinedItems.length < 50) {
      try {
        const recentResp = await axios.get(
          'https://api.spotify.com/v1/me/player/recently-played?limit=50',
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        const recentItems = recentResp.data?.items || [];
        for (const item of recentItems) {
          const t = item?.track;
          if (!t || !t.id || seenIds.has(t.id)) continue;
          combinedItems.push(t);
          seenIds.add(t.id);
          if (combinedItems.length >= 50) break;
        }
      } catch (e) {
        console.warn('[top-tracks] Failed to fetch recently-played padding:', e.message);
      }
    }

    const items = combinedItems.slice(0, 50);
    const tracks = items.map((t, i) => ({
      rank: i + 1,
      name: t.name,
      artists: t.artists?.map(a => a.name).join(', ') || '',
      image: t.album?.images?.[0]?.url || null,
      spotify_id: t.id,
      duration_ms: t.duration_ms || null
    }));

    console.log('[top-tracks] Top tracks for user', user.id);
    tracks.forEach((t, i) => console.log(`  ${i + 1}. ${t.name} – ${t.artists}`));

    // Save top 50 tracks to Supabase
    const top50 = tracks.slice(0, 50);
    if (top50.length > 0) {
      const year = new Date().getFullYear();
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

      if (snapErr) {
        console.error('[top-tracks] wrapped_snapshot upsert error:', snapErr.message);
      } else if (snapshot) {
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
          image_url: t.image,
          duration_ms: t.duration_ms || null
        }));
        const { error: insertErr } = await supabaseAdmin
          .from('wrapped_items')
          .insert(itemsToInsert);

        if (insertErr) {
          console.error('[top-tracks] wrapped_items insert error:', insertErr.message);
        } else {
          console.log('[top-tracks] Saved top 50 tracks to Supabase for snapshot', snapshot.id);
        }
      }
    }

    res.json({ tracks });
  } catch (err) {
    console.error('[top-tracks] Error:', err.message);
    next(err);
  }
});

router.get('/top-artists', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'No token' });
    const token = authHeader.substring(7);
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return res.status(401).json({ error: 'Invalid token' });

    const accessToken = await getAccessTokenForUserId(user.id);
    const spotifyResp = await axios.get('https://api.spotify.com/v1/me/top/artists', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    const items = (spotifyResp.data.items || []).map(a => ({
      id: a.id,
      name: a.name,
      genres: a.genres || [],
      image: a.images?.[0]?.url || null
    }));

    res.json({ items });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

router.get('/stats', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'No token' });
    const token = authHeader.substring(7);
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return res.status(401).json({ error: 'Invalid token' });

    const accessToken = await getAccessTokenForUserId(user.id);

    const [topTracksResp, topArtistsResp, recentResp] = await Promise.all([
      axios.get('https://api.spotify.com/v1/me/top/tracks', { headers: { Authorization: `Bearer ${accessToken}` } }),
      axios.get('https://api.spotify.com/v1/me/top/artists', { headers: { Authorization: `Bearer ${accessToken}` } }),
      axios.get('https://api.spotify.com/v1/me/player/recently-played', { headers: { Authorization: `Bearer ${accessToken}` } })
    ]);

    const topTracks = (topTracksResp.data.items || []).map(item => ({
      id: item.id,
      name: item.name,
      artists: item.artists.map(a => a.name).join(', '),
      image: item.album?.images?.[0]?.url || null,
      duration_ms: item.duration_ms,
      popularity: item.popularity
    }));

    const topArtists = (topArtistsResp.data.items || []).map(a => ({
      id: a.id,
      name: a.name,
      genres: a.genres || [],
      image: a.images?.[0]?.url || null,
      popularity: a.popularity
    }));

    const recentItems = (recentResp.data.items || []).map(r => ({
      played_at: r.played_at,
      track_id: r.track.id,
      name: r.track.name,
      artists: r.track.artists.map(a=>a.name).join(', '),
      duration_ms: r.track.duration_ms
    }));

    const totalPlays = recentItems.length;
    const totalMs = recentItems.reduce((s, it) => s + (it.duration_ms || 0), 0);

    res.json({
      topTracks,
      topArtists,
      recentSummary: { totalPlays, totalMs }
    });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
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
      .select('rank, name, image_url')
      .eq('snapshot_id', snapshot.id)
      .eq('item_type', 'track')
      .order('rank', { ascending: true });
    if (itemsErr) {
      return res.json({ tracks: [] });
    }

    res.json({ tracks: items || [] });
  } catch (err) {
    console.error('[wrapped-top-tracks] Error:', err.message);
    next(err);
  }
});

router.get('/global-top-tracks', async (req, res, next) => {
  try {
    const { data: items, error } = await supabaseAdmin
      .from('wrapped_items')
      .select('spotify_id, name, image_url, duration_ms, rank')
      .eq('item_type', 'track');

    if (error) {
      console.error('[global-top-tracks] wrapped_items fetch error:', error.message);
      return res.status(500).json({ error: 'Failed to load track data' });
    }

    const statsMap = new Map();

    for (const item of items || []) {
      const durationMs = item.duration_ms || 0;

      if (!statsMap.has(item.spotify_id)) {
        statsMap.set(item.spotify_id, {
          spotify_id: item.spotify_id,
          name: item.name,
          image_url: item.image_url,
          total_duration_ms: 0
        });
      }

      const stat = statsMap.get(item.spotify_id);
      stat.total_duration_ms += durationMs;
    }

    const allTracks = Array.from(statsMap.values());
    allTracks.sort((a, b) => (b.total_duration_ms || 0) - (a.total_duration_ms || 0));

    const top50 = allTracks.slice(0, 50);

    res.json({ tracks: top50 });
  } catch (err) {
    console.error('[global-top-tracks] Error:', err.message);
    next(err);
  }
});

export default router;