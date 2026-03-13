import express from 'express';
import { supabase, supabaseAdmin } from '../config/supabase.js';
import { tempSpotifyStorage } from './spotify.js';

const router = express.Router();

/**
 * POST /api/auth/register
 * Completes user registration after Spotify connection
 */
router.post('/register', async (req, res, next) => {
  try {
    const {
      email,
      password,
      displayName,
      classYear,
      faculty,
      major,
      avatarUrl,
      registrationToken // Token from Spotify callback
    } = req.body;

    // Validate required fields
    if (!email || !password || !displayName || !classYear || !faculty || !major) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['email', 'password', 'displayName', 'classYear', 'faculty', 'major']
      });
    }

    // Validate UWO email
    if (!email.toLowerCase().endsWith('@uwo.ca')) {
      return res.status(400).json({
        error: 'Invalid email domain',
        message: 'Please use your Western University email (@uwo.ca)'
      });
    }

    // Validate registration token and get Spotify data
    const tokenData = tempSpotifyStorage.get(registrationToken);
    if (!tokenData || Date.now() > tokenData.expiresAt) {
      return res.status(400).json({
        error: 'Invalid or expired registration token',
        message: 'Please restart the registration process'
      });
    }

    const { spotifyUserId, accessToken, refreshToken, expiresIn } = tokenData;

    // Check again if Spotify account is already linked (race condition protection)
    const { data: existingAccount } = await supabaseAdmin
      .from('spotify_accounts')
      .select('id')
      .eq('spotify_user_id', spotifyUserId)
      .single();

    if (existingAccount) {
      tempSpotifyStorage.delete(registrationToken);
      return res.status(409).json({
        error: 'Spotify account already linked',
        message: 'This Spotify account is already linked to another Western account'
      });
    }

    // Create Supabase Auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email for now
      user_metadata: {
        display_name: displayName,
        class_year: classYear,
        faculty,
        major
      }
    });

    if (authError) {
      // Check if email already exists
      if (authError.message.includes('already registered')) {
        return res.status(409).json({
          error: 'Email already registered',
          message: 'An account with this email already exists'
        });
      }
      throw authError;
    }

    const userId = authData.user.id;

    // Create public.users row (trigger should create it, but we'll update it)
    const { error: userError } = await supabaseAdmin
      .from('users')
      .upsert({
        id: userId,
        display_name: displayName,
        class_year: classYear,
        faculty,
        major,
        avatar_url: avatarUrl || null
      });

    if (userError) {
      console.error('Error creating user profile:', userError);
      // Don't fail registration if profile update fails, but log it
    }

    // Create spotify_accounts entry
    const { data: spotifyAccount, error: spotifyAccountError } = await supabaseAdmin
      .from('spotify_accounts')
      .insert({
        user_id: userId,
        spotify_user_id: spotifyUserId
      })
      .select()
      .single();

    if (spotifyAccountError) {
      console.error('Error creating Spotify account:', spotifyAccountError);
      // This is critical - rollback user creation?
      // For now, we'll continue but log the error
    }

    // Store Spotify tokens (encrypted in production)
    if (spotifyAccount) {
      const { error: tokenError } = await supabaseAdmin
        .from('spotify_tokens')
        .insert({
          spotify_acc_id: spotifyAccount.id,
          refresh_token_encrypted: refreshToken, // TODO: Encrypt in production
          access_token_encrypted: accessToken, // TODO: Encrypt in production
          expires_at: new Date(Date.now() + expiresIn * 1000)
        });

      if (tokenError) {
        console.error('Error storing Spotify tokens:', tokenError);
      }
    }

    // Clean up temporary token
    tempSpotifyStorage.delete(registrationToken);

    // Return success - frontend will auto-login after registration
    res.status(201).json({
      message: 'Account created successfully',
      user: {
        id: userId,
        email: authData.user.email,
        displayName
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/login
 * User login with email and password
 */
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password are required'
      });
    }

    // Sign in with Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Email or password is incorrect'
      });
    }

    // Get user profile
    const { data: userProfile } = await supabaseAdmin
      .from('users')
      .select('display_name, class_year, faculty, major, avatar_url')
      .eq('id', data.user.id)
      .single();

    res.json({
      message: 'Login successful',
      user: {
        id: data.user.id,
        email: data.user.email,
        ...userProfile
      },
      session: {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt: data.session.expires_at
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/logout
 * User logout
 */
router.post('/logout', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      await supabase.auth.signOut();
    }

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/auth/me
 * Get current authenticated user
 */
router.get('/me', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Get user profile
    const { data: userProfile } = await supabaseAdmin
      .from('users')
      .select('display_name, class_year, faculty, major, avatar_url')
      .eq('id', user.id)
      .single();

    res.json({
      user: {
        id: user.id,
        email: user.email,
        ...userProfile
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/auth/profile
 * Updates the authenticated user's profile in Supabase.
 */
router.put('/profile', async (req, res, next) => {
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

    // 2. Extract data to update
    const { faculty, classYear, major } = req.body; 

    const updateData = {};
    if (faculty !== undefined) updateData.faculty = faculty;
    if (classYear !== undefined) updateData.class_year = classYear; 
    if (major !== undefined) updateData.major = major;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No update data provided' });
    }

    // 3. Perform the update in Supabase
    const { data: updatedProfile, error: updateError } = await supabaseAdmin
      .from('users')
      .update(updateData)
      .eq('id', user.id)
      .select('display_name, class_year, faculty, major, avatar_url')
      .single();

    if (updateError) throw updateError;

    // 4. Send back the combined updated user object
    res.json({ 
      message: 'Profile updated successfully', 
      user: {
        id: user.id,
        email: user.email,
        ...updatedProfile
      } 
    });
  } catch (err) {
    next(err);
  }
});

export default router;