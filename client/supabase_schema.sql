-- ============================================
-- Mustangs Wrapped Database Schema
-- ============================================

-- 1. Create the Users table (linked to Supabase Auth)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  class_year INT,
  faculty TEXT,
  major TEXT,
  avatar_url TEXT, -- URL to profile picture in Supabase Storage
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create the Spotify Accounts table
CREATE TABLE public.spotify_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  spotify_user_id TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create the Wrapped Snapshot table
CREATE TABLE public.wrapped_snapshot (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spotify_acc_id UUID NOT NULL REFERENCES public.spotify_accounts(id) ON DELETE CASCADE,
  year INT NOT NULL,
  time_range TEXT NOT NULL CHECK (time_range IN ('short_term', 'medium_term', 'long_term')),
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Logic constraint: one snapshot per account per year per time range
  UNIQUE (spotify_acc_id, year, time_range)
);

-- 4. Create the Wrapped Items table
CREATE TABLE public.wrapped_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id UUID NOT NULL REFERENCES public.wrapped_snapshot(id) ON DELETE CASCADE,
  item_type TEXT CHECK (item_type IN ('track', 'artist')),
  spotify_id TEXT NOT NULL,
  rank INT NOT NULL CHECK (rank >= 1 AND rank <= 50),
  name TEXT NOT NULL,
  image_url TEXT,
  duration_ms INT, -- Optional: track duration for listen-time calculations

  -- Constraints: unique rank and unique spotify_id per snapshot and type
  UNIQUE (snapshot_id, item_type, rank),
  UNIQUE (snapshot_id, item_type, spotify_id)
);

-- 5. Create the Spotify Tokens table
CREATE TABLE public.spotify_tokens (
  spotify_acc_id UUID PRIMARY KEY REFERENCES public.spotify_accounts(id) ON DELETE CASCADE,
  refresh_token_encrypted TEXT NOT NULL,
  access_token_encrypted TEXT, -- Optional: cache access token to reduce refresh calls
  expires_at TIMESTAMPTZ, -- When access_token expires
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Enable Row Level Security (RLS)
-- ============================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spotify_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wrapped_snapshot ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wrapped_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spotify_tokens ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS Policies
-- ============================================

-- Users: Read and update own profile
CREATE POLICY "Users can read own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- Spotify Accounts: Users can read their own account
CREATE POLICY "Users can read own spotify account"
  ON public.spotify_accounts FOR SELECT
  USING (user_id = auth.uid());

-- Wrapped Snapshots: Users can read their own snapshots (via spotify_accounts)
CREATE POLICY "Users can read own wrapped snapshots"
  ON public.wrapped_snapshot FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.spotify_accounts
      WHERE spotify_accounts.id = wrapped_snapshot.spotify_acc_id
      AND spotify_accounts.user_id = auth.uid()
    )
  );

-- Wrapped Items: Users can read items from their own snapshots
CREATE POLICY "Users can read own wrapped items"
  ON public.wrapped_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.wrapped_snapshot
      JOIN public.spotify_accounts ON spotify_accounts.id = wrapped_snapshot.spotify_acc_id
      WHERE wrapped_snapshot.id = wrapped_items.snapshot_id
      AND spotify_accounts.user_id = auth.uid()
    )
  );

-- Spotify Tokens: NO client access (backend only via service role)
-- Backend will use service role key which bypasses RLS
CREATE POLICY "No client access to tokens"
  ON public.spotify_tokens FOR ALL
  USING (false);

-- ============================================
-- Trigger: Auto-create public.users row when auth user is created
-- ============================================
-- This ensures every auth.users entry has a corresponding public.users row
-- Note: In your Option C flow, you'll update this row after Spotify connection
-- with display_name, class_year, etc. from the registration form

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', 'User')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- Indexes for Performance
-- ============================================

-- Index for looking up spotify_accounts by spotify_user_id (for uniqueness checks)
CREATE INDEX idx_spotify_accounts_spotify_user_id ON public.spotify_accounts(spotify_user_id);

-- Index for querying wrapped snapshots by spotify account and year
CREATE INDEX idx_wrapped_snapshot_spotify_year ON public.wrapped_snapshot(spotify_acc_id, year);

-- Index for querying wrapped items by snapshot
CREATE INDEX idx_wrapped_items_snapshot ON public.wrapped_items(snapshot_id);

-- Index for querying users by class_year, faculty, major (for future features)
CREATE INDEX idx_users_class_year ON public.users(class_year);
CREATE INDEX idx_users_faculty ON public.users(faculty);
CREATE INDEX idx_users_major ON public.users(major);

-- ============================================
-- Friends Feature
-- ============================================

-- 6. Friend Requests table
CREATE TABLE public.friend_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (sender_id, receiver_id)
);

-- 7. Friends table (mutual friendships)
CREATE TABLE public.friends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user1_id, user2_id),
  CHECK (user1_id < user2_id)
);

-- RLS for friend_requests
ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can send friend requests"
  ON public.friend_requests FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can see requests they sent or received"
  ON public.friend_requests FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Receivers can update (accept/decline) requests"
  ON public.friend_requests FOR UPDATE
  USING (auth.uid() = receiver_id);

-- RLS for friends
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view friendships they are in"
  ON public.friends FOR SELECT
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Users can insert friendship when accepting request"
  ON public.friends FOR INSERT
  WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Indexes for friends queries
CREATE INDEX idx_friend_requests_sender ON public.friend_requests(sender_id);
CREATE INDEX idx_friend_requests_receiver ON public.friend_requests(receiver_id);
CREATE INDEX idx_friend_requests_status ON public.friend_requests(status);
CREATE INDEX idx_friends_user1 ON public.friends(user1_id);
CREATE INDEX idx_friends_user2 ON public.friends(user2_id);
