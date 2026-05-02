import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

// Initialize the Supabase client
// Note: If the environment variables are missing, this will throw an error or fail silently depending on usage.
// Ensure you copy .env.example to .env.local and fill in your keys.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
