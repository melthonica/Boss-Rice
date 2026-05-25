import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://kbbityarwxdvtlycjiit.supabase.co';
const SUPABASE_KEY = 'sb_publishable_sD9VgZHjnOdqUMbBfZ7jBg_BjV7JRCK';

// Initialize the Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
