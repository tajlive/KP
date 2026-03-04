const webpush = require('web-push');

// Generer VAPID nøkler
const vapidKeys = webpush.generateVAPIDKeys();

console.log('--- VAPID NØKLER FOR KLARPAKKE ---');
console.log('Disse nøklene skal inn i .env.local filen din:\n');
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
console.log('VAPID_SUBJECT=mailto:post@klarpakke.no');
console.log('\n-----------------------------------');
console.log('NB: Hold PRIVATE key hemmelig!');
