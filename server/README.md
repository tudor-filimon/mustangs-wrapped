# Mustangs Wrapped Backend Server

Express/Node.js backend server for Mustangs Wrapped application.

## Setup

1. **Install dependencies:**
   ```bash
   cd server
   npm install
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and fill in:
   - `SUPABASE_URL` - Your Supabase project URL
   - `SUPABASE_PUBLISHABLE_KEY` - Your Supabase publishable key (sb_publishable_...) - Get from Project Settings > API Keys
   - `SUPABASE_SECRET_KEY` - Your Supabase secret key (sb_secret_...) - Get from Project Settings > API Keys (keep secret!)
   - `SPOTIFY_CLIENT_ID` - Your Spotify app Client ID
   - `SPOTIFY_CLIENT_SECRET` - Your Spotify app Client Secret
   - `SPOTIFY_REDIRECT_URI` - Should be `http://127.0.0.1:3001/api/spotify/callback` for dev (Spotify doesn't allow `localhost`)
   - `FRONTEND_URL` - Frontend URL (default: `http://localhost:5173`)
   - `PORT` - Server port (default: 3001)

3. **Set up Spotify OAuth:**
   - Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
   - Create an app
   - Add redirect URI: `http://127.0.0.1:3001/api/spotify/callback` (Note: Spotify requires `127.0.0.1` instead of `localhost`)
   - Copy Client ID and Client Secret to `.env`

4. **Run the server:**
   ```bash
   npm run dev
   ```

   Server will start on `http://localhost:3001`

## API Endpoints

### Auth
- `POST /api/auth/register` - Complete user registration (after Spotify connection)
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Spotify
- `GET /api/spotify/connect` - Initiate Spotify OAuth flow
- `GET /api/spotify/callback` - Handle Spotify OAuth callback
- `GET /api/spotify/temp-token/:token` - Get temporary registration token data

## Notes

- The server uses in-memory storage for temporary Spotify tokens during registration. In production, use Redis or a database.
- Spotify tokens are stored encrypted in the database (encryption should be implemented for production).
- Make sure your Supabase database schema matches `supabase_schema.sql`.
