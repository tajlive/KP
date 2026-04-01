import type { Strategy } from './StrategyCard';

export const STRATEGIES: Strategy[] = [
  {
    id: 'conservative',
    emoji: '🛡️',
    title: 'Trygg sparing',
    subtitle: 'Lav risiko, stabil vekst',
    description: 
      'Perfekt for deg som vil spare langsiktig uten å bekymre deg for store svingninger. ' +
      'Denne strategien kjøper kun Bitcoin og Ethereum når trenden er stigende, ' +
      'og selger automatisk hvis markedet snur.',
    expectedReturn: '5-15%',
    expectedReturnDetail: 'Forventet avkastning per år',
    riskLevel: 'low',
    protection: 'Auto stop-loss ved 5% tap. Kun BTC & ETH.',
    minInvestment: '1 000 kr',
    suitableFor: ['👶 Første gang du prøver krypto', '📅 Vil spare langsiktig', '😰 Vil sove godt om natten'],
    features: [
      'Kun de tryggeste kryptovalutaene',
      'Kjøper kun i opptrender',
      '1x leverage (ingen gjeldsrisiko)',
      'Maks 2 handler per dag',
    ],
  },
  {
    id: 'balanced',
    emoji: '⚖️',
    title: 'Balansert vekst',
    subtitle: 'Moderat risiko, bedre avkastning',
    description: 
      'Denne strategien kjøper når prisen har falt litt (billig) OG når den viser sterk oppgang. ' +
      'Den handler de 10 største kryptovalutaene og balanserer risiko og avkastning.',
    expectedReturn: '15-30%',
    expectedReturnDetail: 'Forventet avkastning per år',
    riskLevel: 'medium',
    protection: 'Auto stop-loss ved 8% tap. Maks 5 handler per dag.',
    minInvestment: '5 000 kr',
    suitableFor: ['📊 Tåler noen svingninger', '💼 Vil ha bedre avkastning enn banken', '📈 Har fulgt med på krypto litt'],
    features: [
      'Top 10 kryptovalutaer',
      'Kjøper dips og breakouts',
      '1.5x leverage (moderat)',
      'Både kjøp og salg (long/short)',
    ],
  },
  {
    id: 'aggressive',
    emoji: '🚀',
    title: 'Agressiv vekst',
    subtitle: 'Høy risiko, høy potensiell avkastning',
    description: 
      'Aktiv handel som jager sterke bevegelser i markedet. Kan tjene mye, men også tape. ' +
      'Denne strategien handler 20 ulike kryptovalutaer og utnytter volatilitet.',
    expectedReturn: '30-60%',
    expectedReturnDetail: 'Forventet avkastning per år (men kan tape 30%+)',
    riskLevel: 'high',
    protection: 'Auto stop-loss ved 12% tap. Maks 10 handler per dag.',
    minInvestment: '10 000 kr',
    suitableFor: ['🎲 Tåler store svingninger', '💰 Har råd til å tape litt', '🧠 Forstår høy risiko = høy avkastning'],
    features: [
      'Top 20 kryptovalutaer',
      'Momentum og volatilitet trading',
      '2x leverage (høyere risiko)',
      'Aktiv short-selling',
    ],
  },
];
