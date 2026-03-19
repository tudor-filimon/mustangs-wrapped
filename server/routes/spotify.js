import express from 'express';
import axios from 'axios';
import { supabase, supabaseAdmin } from '../config/supabase.js';
import crypto from 'crypto';

const router = express.Router();
const inFlightTopTrackFetches = new Map();

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

/**
 * GET /api/spotify/top-tracks
 * Fetches and stores the user's top 50 tracks from Spotify.
 * To save Spotify token usage, if a snapshot for the same user/year/time_range
 * was already generated today and has >= 50 rows, it returns cached rows.
 */
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
      console.log('[top-tracks] Reusing in-flight fetch for', inFlightKey);
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

      // If rank 50 exists in DB, treat snapshot as complete and skip pulling again.
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
            console.log('[top-tracks] Using cached snapshot rows for user', user.id);
            console.log('[top-tracks] User already has a Top 50 in Supabase; skipping Spotify pull.');
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

      console.log('[top-tracks] Top 50 tracks fetched for user', user.id);

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
          const { error: insertErr } = await supabaseAdmin
            .from('wrapped_items')
            .insert(itemsToInsert);

          if (insertErr) {
            console.error('[top-tracks] wrapped_items insert error:', insertErr.message);
          } else {
            console.log('[top-tracks] Saved top 50 tracks to Supabase for snapshot', snapshot.id);
          }
        } else if (snapErr) {
          console.error('[top-tracks] wrapped_snapshot upsert error:', snapErr.message);
        }
      }

      return { tracks, cached: false };
    })();

    inFlightTopTrackFetches.set(inFlightKey, fetchPromise);
    const result = await fetchPromise;
    res.json(result);
    inFlightTopTrackFetches.delete(inFlightKey);
  } catch (err) {
    console.error('[top-tracks] Error:', err.message);
    if (inFlightKey) {
      inFlightTopTrackFetches.delete(inFlightKey);
    }
    next(err);
  }
});

/**
 * GET /api/spotify/wrapped-top-tracks
 * Returns the user's saved top tracks from Supabase (from wrapped_snapshot + wrapped_items).
 */
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
    console.error('[wrapped-top-tracks] Error:', err.message);
    next(err);
  }
});

/**
 * GET /api/spotify/global-top-tracks
 * Returns top 50 tracks ranked by how many users have them
 * in wrapped items.
 */
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
    console.error('[global-top-tracks] Error:', err.message);
    next(err);
  }
});

export default router;