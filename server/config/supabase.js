import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
// Using new publishable key (sb_publishable_...) - safe for client operations
const supabasePublishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
// Using new secret key (sb_secret_...) - for admin/backend operations only
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error('Missing Supabase environment variables (SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY are required)');
}

// Client for user operations (uses publishable key)
// This client respects Row Level Security policies
export const supabase = createClient(supabaseUrl, supabasePublishableKey);

// Admin client for backend operations (uses secret key)
// This client bypasses Row Level Security - use only for trusted backend operations
export const supabaseAdmin = supabaseSecretKey
  ? createClient(supabaseUrl, supabaseSecretKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

if (!supabaseAdmin) {
  console.warn('Warning: SUPABASE_SECRET_KEY not set. Admin operations will not work.');
}
