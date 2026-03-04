import { createClient } from '@supabase/supabase-js';

// Fetch all secrets from Supabase (centralized)
export async function getSecrets() {
  const supabaseUrl = 'https://vuxbjlykgmzskxbclquf.supabase.co';
  const serviceRole = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // Service role
  
  const supabase = createClient(supabaseUrl, serviceRole);
  
  const { data } = await supabase
    .from('secrets')
    .select('*');
  
  return {
    STRIPE_SECRET_KEY: data.find(s => s.key === 'STRIPE_SECRET_KEY')?.value,
    STRIPE_WEBHOOK_SECRET: data.find(s => s.key === 'STRIPE_WEBHOOK_SECRET')?.value,
    RESEND_API_KEY: data.find(s => s.key === 'RESEND_API_KEY')?.value,
    // etc...
  };
}

export const env = {
  async get() {
    return getSecrets();
  }
};