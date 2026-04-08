import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const users = [
    { email: 'tom@klarpakke.no', password: 'TestPassword123!' },
    { email: 'klarpakke.test+playwright@gmail.com', password: 'bilglass123' },
    { email: 'tomarnejensen@gmail.com', password: 'TestPassword123!' }
];

async function updateUsers() {
    console.log('💰 Oppdaterer brukere...\n');
    
    for (const user of users) {
        // 1. Finn eller opprett bruker
        const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
        
        if (authError) {
            console.log(`❌ Auth error: ${authError.message}`);
            continue;
        }
        
        const existingUser = authData.users.find(u => u.email === user.email);
        let userId;
        
        if (existingUser) {
            userId = existingUser.id;
            console.log(`✅ Fant bruker: ${user.email}`);
        } else {
            // Opprett ny bruker
            const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
                email: user.email,
                password: user.password,
                email_confirm: true
            });
            
            if (createError) {
                console.log(`❌ Kunne ikke opprette ${user.email}: ${createError.message}`);
                continue;
            }
            
            userId = newUser.user.id;
            console.log(`✅ Opprettet bruker: ${user.email}`);
        }
        
        // 2. Oppdater profil med 10M og professor
        const { error: updateError } = await supabase
            .from('user_profiles')
            .upsert({
                id: userId,
                email: user.email,
                subscription_tier: 'professor',
                wallet_balance: 10000000,
                paper_balance: 10000000,
                updated_at: new Date().toISOString()
            }, { onConflict: 'id' });
        
        if (updateError) {
            console.log(`❌ Oppdatering feilet: ${updateError.message}`);
        } else {
            console.log(`   💎 10M NOK lagt til`);
            console.log(`   👨‍🏫 Professor tier aktivert\n`);
        }
    }
    
    // Verifiser
    console.log('📊 Verifiserer oppdateringer:');
    const { data: profiles } = await supabase
        .from('user_profiles')
        .select('email, subscription_tier, wallet_balance, paper_balance')
        .in('email', users.map(u => u.email));
    
    console.table(profiles);
}

updateUsers().catch(console.error);
