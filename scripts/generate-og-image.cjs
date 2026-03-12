const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const canvas = createCanvas(1200, 630);
const ctx = canvas.getContext('2d');

// Bakgrunn - mørk navy gradient
const gradient = ctx.createLinearGradient(0, 0, 1200, 630);
gradient.addColorStop(0, '#0A0F1E');
gradient.addColorStop(1, '#0D1B2A');
ctx.fillStyle = gradient;
ctx.fillRect(0, 0, 1200, 630);

// Blå accent stripe øverst
ctx.fillStyle = '#0052FF';
ctx.fillRect(0, 0, 1200, 6);

// Logo/Tittel
ctx.fillStyle = '#FFFFFF';
ctx.font = 'bold 96px Arial';
ctx.fillText('Klarpakke', 80, 260);

// Tagline
ctx.fillStyle = '#0052FF';
ctx.font = 'bold 42px Arial';
ctx.fillText('Boten jobber for deg', 80, 340);

// Subtext
ctx.fillStyle = '#94A3B8';
ctx.font = '32px Arial';
ctx.fillText('Crypto trading bot · Papirhandel · Autotrading', 80, 420);

// URL
ctx.fillStyle = '#475569';
ctx.font = '28px Arial';
ctx.fillText('klarpakke.no', 80, 570);

const buffer = canvas.toBuffer('image/png');
const outputPath = path.join(__dirname, '..', 'public', 'og-image.png');
fs.writeFileSync(outputPath, buffer);
console.log('✅ OG-bilde generert: public/og-image.png');
console.log('📁 Full sti:', outputPath);
