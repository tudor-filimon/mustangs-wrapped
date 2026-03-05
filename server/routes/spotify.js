import express from 'express';
import axios from 'axios';
import { supabase, supabaseAdmin } from '../config/supabase.js';
import crypto from 'crypto';

const router = express.Router();

// In-memory storage for temporary Spotify tokens during registration
// In production, use Redis or a database
export const tempSpotifyStorage = new Map();

/**
 * GET /api/spotify/connect
 * Initiates Spotify OAuth flow
 */
router.get('/connect', (req, res) => {
  const spotifyClientId = process.env.SPOTIFY_CLIENT_ID;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI;
  const frontendUrl = process.env.FRONTEND_URL;

  if (!spotifyClientId || !redirectUri) {
    return res.status(500).json({ error: 'Spotify configuration missing' });
  }

  // Generate state token for CSRF protection
  const state = crypto.randomBytes(32).toString('hex');
  
  // Store state with expiration (5 minutes)
  tempSpotifyStorage.set(state, {
    createdAt: Date.now(),
    expiresAt: Date.now() + 5 * 60 * 1000
  });

  // Spotify OAuth scopes needed
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

/**
 * GET /api/spotify/callback
 * Handles Spotify OAuth callback
 * Exchanges code for tokens and checks uniqueness
 */
router.get('/callback', async (req, res) => {
  const { code, state, error } = req.query;
  const frontendUrl = process.env.FRONTEND_URL;

  // Check for OAuth error
  if (error) {
    return res.redirect(`${frontendUrl}/register-complete?error=${encodeURIComponent(error)}`);
  }

  // Validate state
  const stateData = tempSpotifyStorage.get(state);
  if (!stateData || Date.now() > stateData.expiresAt) {
    return res.redirect(`${frontendUrl}/register-complete?error=invalid_state`);
  }

  if (!code) {
    return res.redirect(`${frontendUrl}/register-complete?error=no_code`);
  }

  try {
    // Exchange code for tokens
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

    // Get Spotify user info
    const userResponse = await axios.get('https://api.spotify.com/v1/me', {
      headers: {
        Authorization: `Bearer ${access_token}`
      }
    });

    const spotifyUser = userResponse.data;
    const spotifyUserId = spotifyUser.id;

    // Check if this Spotify account is already linked
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

    // Store tokens temporarily (will be moved to database after user registration)
    const registrationToken = crypto.randomBytes(32).toString('hex');
    tempSpotifyStorage.set(registrationToken, {
      spotifyUserId,
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresIn: expires_in,
      createdAt: Date.now(),
      expiresAt: Date.now() + 10 * 60 * 1000 // 10 minutes
    });

    // Clean up state
    tempSpotifyStorage.delete(state);

    // Redirect to frontend registration form
    res.redirect(`${frontendUrl}/register-complete?token=${registrationToken}`);
  } catch (error) {
    console.error('Spotify callback error:', error);
    return res.redirect(
      `${frontendUrl}/register-complete?error=spotify_auth_failed`
    );
  }
});

/**
 * GET /api/spotify/temp-token/:token
 * Retrieves temporary Spotify tokens (called by frontend after redirect)
 */
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

  // Return only necessary data (don't expose tokens to client)
  res.json({
    spotifyUserId: tokenData.spotifyUserId,
    valid: true
  });
});

// GET /api/spotify/current-playing
router.get('/current-playing', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      // LOGGING FOR TESTING
      console.log('[current-playing] No Bearer token in Authorization header');
      return res.status(401).json({ error: 'No token' });
    }
    const token = authHeader.substring(7);
    const { data: { user }, error: getUserErr } = await supabase.auth.getUser(token);
    if (getUserErr || !user) {
      // LOGGING FOR TESTING
      console.log('[current-playing] Auth failed:', getUserErr?.message || 'No user');
      return res.status(401).json({ error: 'Invalid token' });
    }
    // LOGGING FOR TESTING
    console.log('[current-playing] User resolved:', user.id);

    // find linked spotify account
    const { data: spotifyAccount, error: spotifyAccountError } = await supabaseAdmin
      .from('spotify_accounts')
      .select('id')
      .eq('user_id', user.id)
      .single();
    if (spotifyAccountError) {
      // LOGGING FOR TESTING
      console.log('[current-playing] spotify_accounts query error:', spotifyAccountError.code, spotifyAccountError.message);
    }
    if (!spotifyAccount) {
      // LOGGING FOR TESTING
      console.log('[current-playing] No spotify_accounts row for user_id:', user.id);
      return res.status(404).json({ error: 'No linked Spotify account' });
    }
    console.log('[current-playing] spotify_accounts row found, id:', spotifyAccount.id);

    // get tokens (table PK is spotify_acc_id, not id)
    const { data: tokenRow, error: tokenError } = await supabaseAdmin
      .from('spotify_tokens')
      .select('spotify_acc_id, access_token_encrypted, refresh_token_encrypted, expires_at')
      .eq('spotify_acc_id', spotifyAccount.id)
      .single();

    if (tokenError) {
      // LOGGING FOR TESTING
      console.log('[current-playing] spotify_tokens query error:', tokenError.code, tokenError.message);
    }
    if (!tokenRow) {
      // LOGGING FOR TESTING
      console.log('[current-playing] No spotify_tokens row for spotify_acc_id:', spotifyAccount.id);
      return res.status(404).json({ error: 'No Spotify tokens' });
    }
    // LOGGING FOR TESTING
    console.log('[current-playing] spotify_tokens row found, spotify_acc_id:', tokenRow.spotify_acc_id);

    let accessToken = tokenRow.access_token_encrypted;
    const refreshToken = tokenRow.refresh_token_encrypted;
    const expiresAt = tokenRow.expires_at ? new Date(tokenRow.expires_at).getTime() : 0;

    // refresh if expired (60s leeway)
    if (!accessToken || Date.now() >= (expiresAt - 60000)) {
      // LOGGING FOR TESTING
      console.log('[current-playing] Refreshing access token');
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

    // call Spotify currently-playing
    // LOGGING FOR TESTING
    console.log('[current-playing] Calling Spotify API for currently-playing');
    const spotifyResp = await axios.get('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (spotifyResp.status === 204) {
      // LOGGING FOR TESTING
      console.log('[current-playing] Spotify: nothing playing');
      return res.json({ playing: false });
    }

    const data = spotifyResp.data;
    const item = data.item;
    if (!item) return res.json({ playing: false });

    const song = item.name;
    const artists = item.artists?.map(a => a.name).join(', ') || '';
    const image = item.album?.images?.[0]?.url || null;

    console.log('[current-playing] Success:', song, '-', artists);
    res.json({
      playing: true,
      song,
      artists,
      image,
      progress_ms: data.progress_ms,
      duration_ms: item.duration_ms
    });
  } catch (err) {
    // LOGGING FOR TESTING
    console.error('[current-playing] Unexpected error:', err.message);
    next(err);
  }
});

export default router;