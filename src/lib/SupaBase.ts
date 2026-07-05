

// import { createClient } from '@supabase/supabase-js';

// const supabaseUrl = 'https://xprlayjalwvmefstjobz.supabase.co';
// const supabaseKey = 'sb_publishable_37EYawmUsreUh5j7OtMnkA_1KvW8I0m';


// export const SupaBaseFunction = createClient(supabaseUrl, supabaseKey);



import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL; // or import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY; // or import.meta.env.VITE_SUPABASE_ANON_KEY

 // Updated with your active working Web App URL 
export const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyEmqPmufDwcj6T0S4uJW3Mj1TkpBYyUgkEBi9xAKmEttXN1ghQsQnbEZkMDc47hiI/exec";

// 🔥 ADD THESE TWO LINES:
console.log("My Supabase URL is:", supabaseUrl);
console.log("My Supabase Key is:", supabaseKey ? "Loaded!" : "Missing!");

export const SupaBaseFunction = createClient(supabaseUrl, supabaseKey);