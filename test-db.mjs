import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function test() {
  const { data, error } = await supabase.from('shops').select('*');
  if (error) {
    console.error("DB Error:", error.message);
  } else {
    console.log("Shops data:", data);
  }
}
test();
