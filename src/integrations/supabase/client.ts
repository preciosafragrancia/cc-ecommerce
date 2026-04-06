
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://bfzzcaupljysslobmuic.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_jbRtQ-b-3eXZ9mfb_oRFjw_OmAK06hS";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
