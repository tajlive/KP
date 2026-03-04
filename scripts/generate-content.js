// AI Content Generator for Klarpakke
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

const topics = [
  'Hvorfor de fleste trader feil',
  '3 trading-feil nybegynnere gjør',
  'Slik bruker du paper trading',
  'Risk management guide',
  'Hvordan AI hjelper trading'
]

async function generatePost(topic) {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 500,
    messages: [{
      role: 'user',
      content: `Skriv en LinkedIn post (150 ord) på NORSK om: ${topic}

Tone: Educational, hjelpsom
Format: Hook → Verdi → CTA
CTA: "Vil du lære mer? Søk om beta-tilgang → klarpakke.no/beta/apply"

Post:`
    }]
  })
  
  return message.content[0].text
}

// Generate 5 posts
for (const topic of topics) {
  const post = await generatePost(topic)
  console.log(`\n=== ${topic} ===\n${post}\n`)
  await new Promise(r => setTimeout(r, 1000))
}

