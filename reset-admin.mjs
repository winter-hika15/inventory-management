import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function resetAdmin() {
  console.log("Resetting admin account...");
  const { data, error } = await supabase
    .from('shops')
    .update({ 
      email: 'admin@example.com',
      password: 'admin123'
    })
    .eq('role', 'admin')
    .select();

  if (error) {
    console.error("Error updating admin:", error.message);
  } else {
    console.log("Success! Updated admin account:", data);
  }
}
resetAdmin();
