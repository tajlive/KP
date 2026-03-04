// Kampanje-konfigurasjon - 100 Grunnleggere
// Oppdater disse tallene når nye studenter registrerer seg

export const CAMPAIGN_CONFIG = {
  // Totalt mål
  TOTAL_SPOTS: 100,
  
  // Nåværende status (oppdater dette tallene)
  CURRENT_REGISTERED: 0,  // Endre dette når nye registrerer seg
  
  // Beregnede verdier
  get SPOTS_LEFT() {
    return this.TOTAL_SPOTS - this.CURRENT_REGISTERED;
  },
  
  get PERCENT_FILLED() {
    return ((this.CURRENT_REGISTERED / this.TOTAL_SPOTS) * 100).toFixed(0);
  },
  
  // For API fallback
  get DEFAULT_STATS() {
    return {
      total: this.CURRENT_REGISTERED,
      today: 0,  // Oppdater daglig
      week: 0,  // Oppdater ukentlig
      remaining: this.SPOTS_LEFT,
      percentage: parseFloat(this.PERCENT_FILLED),
    };
  }
};

// Bruk: import { CAMPAIGN_CONFIG } from '@/lib/campaign-config'
// CAMPAIGN_CONFIG.CURRENT_REGISTERED -> 53
// CAMPAIGN_CONFIG.SPOTS_LEFT -> 47
