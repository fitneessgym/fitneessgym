/* Supabase configuration.
   Replace the two placeholders with values from Supabase Project Settings > API.
   Use the publishable/anon key only in browser code. NEVER put service_role here.
*/
window.SUPABASE_URL = 'https://kssrhadgbhtzwukrzvse.supabase.co';
window.SUPABASE_ANON_KEY = 'sb_publishable_cWZvKw5zlSoocpRS2Xjc_g_E3DVPbc8';

window.supabaseClient = window.supabase.createClient(
  window.SUPABASE_URL,
  window.SUPABASE_ANON_KEY,
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
);
