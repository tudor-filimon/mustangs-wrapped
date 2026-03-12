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

    res.json({
      playing: true,
      song,
      artists,
      image,
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
    if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'No token' });
    const token = authHeader.substring(7);
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return res.status(401).json({ error: 'Invalid token' });

    const accessToken = await getAccessTokenForUserId(user.id);
    const spotifyResp = await axios.get('https://api.spotify.com/v1/me/top/tracks', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    const items = (spotifyResp.data.items || []).map(item => ({
      id: item.id,
      name: item.name,
      artists: item.artists.map(a => a.name).join(', '),
      image: item.album?.images?.[0]?.url || null,
      duration_ms: item.duration_ms,
      popularity: item.popularity
    }));

    res.json({ items });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
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

export default router;