import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testRpc() {
  console.log("Testing authenticate_shop RPC...");
  const { data, error } = await supabase.rpc('authenticate_shop', {
    p_email: 'admin@example.com',
    p_password: 'admin123'
  });

  if (error) {
    console.error("RPC Error:", error.message);
  } else {
    console.log("RPC Success! User data:", data);
  }
}
testRpc();
