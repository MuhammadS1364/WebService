

// import { createClient } from '@supabase/supabase-js';

// const supabaseUrl = 'https://xprlayjalwvmefstjobz.supabase.co';
// const supabaseKey = 'sb_publishable_37EYawmUsreUh5j7OtMnkA_1KvW8I0m';


// export const SupaBaseFunction = createClient(supabaseUrl, supabaseKey);



import { createClient } from '@supabase/supabase-js';

const defaultUrl = 'https://xprlayjalwvmefstjobz.supabase.co';
const defaultKey = 'sb_publishable_37EYawmUsreUh5j7OtMnkA_1KvW8I0m';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || defaultUrl;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || defaultKey;

// Updated with your active working Web App URL 
export const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyEmqPmufDwcj6T0S4uJW3Mj1TkpBYyUgkEBi9xAKmEttXN1ghQsQnbEZkMDc47hiI/exec";

export const SupaBaseFunction = createClient(supabaseUrl, supabaseKey);