require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  console.error('Missing env: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
  process.exit(1);
}

const s = createClient(url, key);

(async () => {
  try {
    const am = await s.from('auth_methods').select('provider,provider_user_id,identity_id').limit(5);
    const up = await s.from('user_profiles').select('identity_id,email,role').limit(5);
    const id = await s.from('identities').select('id,status').limit(5);
    console.log(JSON.stringify({ auth_methods: am, user_profiles: up, identities: id }, null, 2));
  } catch (e) {
    console.error('query_error', e);
    process.exit(1);
  }
})();