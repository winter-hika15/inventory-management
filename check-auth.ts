import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function main() {
  console.log('Checking shops table...');
  const { data: shops, error } = await supabase.from('shops').select('id, email, password, role');
  if (error) {
    console.error('Error fetching shops:', error);
    return;
  }
  console.log('Shops (passwords truncated for security):');
  shops.forEach(s => {
    console.log(`- ${s.email} [role: ${s.role}]: password starts with ${s.password?.substring(0, 7) || 'N/A'}...`);
  });

  console.log('\nTesting RPC authenticate_shop with test user...');
  if (shops.length > 0) {
    const testEmail = shops[0].email;
    console.log(`Testing RPC for email: ${testEmail}`);
    const { data: rpcData, error: rpcError } = await supabase.rpc('authenticate_shop', {
      p_email: testEmail,
      p_password: 'testpassword123' // Just to see if RPC exists
    });
    if (rpcError) {
      console.log('RPC Error:', rpcError);
    } else {
      console.log('RPC Data:', rpcData);
    }
  }
}

main();
