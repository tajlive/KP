/**
 * Læringsstier (Learning Tracks) for Klarpakke Universitet
 * Organiserer kurs, quiz, simulator og verktøy i strukturerte løp
 */

export type TrackLevel = 'beginner' | 'intermediate' | 'advanced';

export type LessonType = 
  | 'article' 
  | 'video' 
  | 'quiz' 
  | 'simulator' 
  | 'paper-trading' 
  | 'tool' 
  | 'calculator';

export interface LearningLesson {
  id: string;
  slug: string;
  title: string;
  level: TrackLevel;
  trackId: string;
  order: number;
  estimatedMinutes: number;
  type: LessonType;
  description: string;
  ctaLabel: string;
  href: string;
  prerequisites?: string[]; // andre lesson-ids som må være fullført først
  icon?: string;
}

export interface LearningTrack {
  id: string;
  slug: string;
  title: string;
  level: TrackLevel;
  shortDescription: string;
  fullDescription: string;
  whatYouLearn: string[];
  idealFor: string[];
  estimatedTotalHours: number;
  lessons: LearningLesson[];
  badgeId: string;
  badgeLabel: string;
  badgeDescription: string;
  color: string; // tailwind farge-klasse
}

export interface UserBadge {
  id: string;
  trackId: string;
  label: string;
  description: string;
  earnedAt: string; // ISO date
  icon: string;
}

// === NYBEGYNNER: GRUNNKURS KRYPTO ===
const grunnkursLessons: LearningLesson[] = [
  {
    id: 'gk-01-intro',
    slug: 'introduksjon-til-krypto',
    title: 'Hva er krypto?',
    level: 'beginner',
    trackId: 'grunnkurs-krypto',
    order: 1,
    estimatedMinutes: 10,
    type: 'article',
    description: 'En enkel forklaring på hva kryptovaluta er, hvordan det fungerer, og hvorfor folk bruker det.',
    ctaLabel: 'Les artikkelen',
    href: '/leksjon/introduksjon-til-krypto',
    icon: 'BookOpen',
  },
  {
    id: 'gk-02-risiko',
    slug: 'forsta-risiko',
    title: 'Forstå risiko',
    level: 'beginner',
    trackId: 'grunnkurs-krypto',
    order: 2,
    estimatedMinutes: 8,
    type: 'article',
    description: 'Den viktigste leksjonen: Hvorfor du aldri skal investere mer enn du tåler å tape.',
    ctaLabel: 'Les om risiko',
    href: '/leksjon/forsta-risiko',
    prerequisites: ['gk-01-intro'],
    icon: 'Shield',
  },
  {
    id: 'gk-03-quiz-risiko',
    slug: 'quiz-risiko',
    title: 'Quiz: Risikovurdering',
    level: 'beginner',
    trackId: 'grunnkurs-krypto',
    order: 3,
    estimatedMinutes: 5,
    type: 'quiz',
    description: 'Test at du forstår risikoene før du går videre.',
    ctaLabel: 'Start quiz',
    href: '/quiz?track=grunnkurs&lesson=3',
    prerequisites: ['gk-02-risiko'],
    icon: 'HelpCircle',
  },
  {
    id: 'gk-04-simulator-intro',
    slug: 'simulator-intro',
    title: 'Utforsk markedet',
    level: 'beginner',
    trackId: 'grunnkurs-krypto',
    order: 4,
    estimatedMinutes: 15,
    type: 'simulator',
    description: 'Se hvordan kryptomarkedet ser ut. Ingen trading ennå – bare se og lær.',
    ctaLabel: 'Åpne simulator',
    href: '/simulator?scenario=explore&track=grunnkurs',
    prerequisites: ['gk-03-quiz-risiko'],
    icon: 'TrendingUp',
  },
  {
    id: 'gk-05-kalkulator',
    slug: 'avkastningskalkulator',
    title: 'Prøv kalkulatoren',
    level: 'beginner',
    trackId: 'grunnkurs-krypto',
    order: 5,
    estimatedMinutes: 10,
    type: 'calculator',
    description: 'Lær hvordan avkastning fungerer med vår enkle kalkulator.',
    ctaLabel: 'Åpne kalkulator',
    href: '/kalkulator?track=grunnkurs',
    prerequisites: ['gk-04-simulator-intro'],
    icon: 'Calculator',
  },
  {
    id: 'gk-06-first-trade',
    slug: 'forste-trade',
    title: 'Din første (øvings)trade',
    level: 'beginner',
    trackId: 'grunnkurs-krypto',
    order: 6,
    estimatedMinutes: 20,
    type: 'paper-trading',
    description: 'Gjør din første trade med lekepenger. Kjøp litt Bitcoin og se hva som skjer.',
    ctaLabel: 'Start paper trading',
    href: '/paper-trading?task=first-trade&track=grunnkurs',
    prerequisites: ['gk-05-kalkulator'],
    icon: 'MousePointer',
  },
  {
    id: 'gk-07-quiz-fullfor',
    slug: 'quiz-grunnkurs-fullfort',
    title: 'Avsluttende quiz',
    level: 'beginner',
    trackId: 'grunnkurs-krypto',
    order: 7,
    estimatedMinutes: 10,
    type: 'quiz',
    description: 'Siste test før du får ditt første badge.',
    ctaLabel: 'Start quiz',
    href: '/quiz?track=grunnkurs&lesson=final',
    prerequisites: ['gk-06-first-trade'],
    icon: 'Award',
  },
];

// === NYBEGYNNER/VIDEREKOMMEN: RISIKOSTYRING ===
const risikostyringLessons: LearningLesson[] = [
  {
    id: 'rs-01-stoploss',
    slug: 'hva-er-stop-loss',
    title: 'Hva er stop-loss?',
    level: 'beginner',
    trackId: 'risikostyring',
    order: 1,
    estimatedMinutes: 12,
    type: 'article',
    description: 'Lær hvordan stop-loss fungerer og hvorfor det er viktig for å beskytte pengene dine.',
    ctaLabel: 'Les artikkelen',
    href: '/leksjon/hva-er-stop-loss',
    icon: 'Shield',
  },
  {
    id: 'rs-02-position-size',
    slug: 'posisjonsstorrelse',
    title: 'Hvor mye bør du handle?',
    level: 'intermediate',
    trackId: 'risikostyring',
    order: 2,
    estimatedMinutes: 15,
    type: 'article',
    description: 'Regelen om at du aldri skal risikere mer enn 1-2% av porteføljen per trade.',
    ctaLabel: 'Les artikkelen',
    href: '/leksjon/posisjonsstorrelse',
    prerequisites: ['rs-01-stoploss'],
    icon: 'Scale',
  },
  {
    id: 'rs-03-simulator-risk',
    slug: 'simulator-risiko',
    title: 'Øv på risikostyring',
    level: 'intermediate',
    trackId: 'risikostyring',
    order: 3,
    estimatedMinutes: 20,
    type: 'simulator',
    description: 'Se hva som skjer når markedet faller – og hvordan stop-loss beskytter deg.',
    ctaLabel: 'Åpne simulator',
    href: '/simulator?scenario=risk-management&track=risikostyring',
    prerequisites: ['rs-02-position-size'],
    icon: 'TrendingUp',
  },
  {
    id: 'rs-04-paper-risk',
    slug: 'paper-trading-risiko',
    title: 'Øv med stop-loss',
    level: 'intermediate',
    trackId: 'risikostyring',
    order: 4,
    estimatedMinutes: 25,
    type: 'paper-trading',
    description: 'Sett opp en trade med stop-loss i paper trading. Se hva som skjer når prisen beveger seg.',
    ctaLabel: 'Start øving',
    href: '/paper-trading?task=stop-loss&track=risikostyring',
    prerequisites: ['rs-03-simulator-risk'],
    icon: 'Target',
  },
  {
    id: 'rs-05-quiz',
    slug: 'quiz-risikostyring',
    title: 'Quiz: Risikostyring',
    level: 'intermediate',
    trackId: 'risikostyring',
    order: 5,
    estimatedMinutes: 10,
    type: 'quiz',
    description: 'Test kunnskapen din om risikostyring.',
    ctaLabel: 'Start quiz',
    href: '/quiz?track=risikostyring',
    prerequisites: ['rs-04-paper-risk'],
    icon: 'HelpCircle',
  },
];

// === VIDEREKOMMEN: TEKNISK ANALYSE ===
const tekniskAnalyseLessons: LearningLesson[] = [
  {
    id: 'ta-01-graf',
    slug: 'lese-grafer',
    title: 'Lese grafer',
    level: 'intermediate',
    trackId: 'teknisk-analyse',
    order: 1,
    estimatedMinutes: 15,
    type: 'article',
    description: 'Grunnleggende om candlestick-grafer, tidshorisont, og hva prisbevegelser betyr.',
    ctaLabel: 'Les artikkelen',
    href: '/leksjon/lese-grafer',
    icon: 'BarChart',
  },
  {
    id: 'ta-02-trend',
    slug: 'trender-og-kanaler',
    title: 'Trender og kanaler',
    level: 'intermediate',
    trackId: 'teknisk-analyse',
    order: 2,
    estimatedMinutes: 18,
    type: 'article',
    description: 'Lær å identifisere opp-trender, ned-trender og sideveis bevegelser.',
    ctaLabel: 'Les artikkelen',
    href: '/leksjon/trender-og-kanaler',
    prerequisites: ['ta-01-graf'],
    icon: 'TrendingUp',
  },
  {
    id: 'ta-03-simulator',
    slug: 'simulator-ta',
    title: 'Øv på å lese grafer',
    level: 'intermediate',
    trackId: 'teknisk-analyse',
    order: 3,
    estimatedMinutes: 25,
    type: 'simulator',
    description: 'Bruk simulatoren til å identifisere trender i historiske data.',
    ctaLabel: 'Åpne simulator',
    href: '/simulator?scenario=technical-analysis&track=teknisk-analyse',
    prerequisites: ['ta-02-trend'],
    icon: 'LineChart',
  },
  {
    id: 'ta-04-support',
    slug: 'support-og-resistance',
    title: 'Support og resistance',
    level: 'advanced',
    trackId: 'teknisk-analyse',
    order: 4,
    estimatedMinutes: 20,
    type: 'article',
    description: 'Forstå nøkkelnivåer der prisen ofte snur. Viktig for å finne gode inngangspunkter.',
    ctaLabel: 'Les artikkelen',
    href: '/leksjon/support-og-resistance',
    prerequisites: ['ta-03-simulator'],
    icon: 'GitBranch',
  },
  {
    id: 'ta-05-paper',
    slug: 'paper-trading-ta',
    title: 'Trade basert på analyse',
    level: 'advanced',
    trackId: 'teknisk-analyse',
    order: 5,
    estimatedMinutes: 30,
    type: 'paper-trading',
    description: 'Gjør trades basert på teknisk analyse i paper trading. Bygg erfaring uten risiko.',
    ctaLabel: 'Start øving',
    href: '/paper-trading?task=technical-analysis&track=teknisk-analyse',
    prerequisites: ['ta-04-support'],
    icon: 'Target',
  },
  {
    id: 'ta-06-quiz',
    slug: 'quiz-teknisk-analyse',
    title: 'Quiz: Teknisk analyse',
    level: 'advanced',
    trackId: 'teknisk-analyse',
    order: 6,
    estimatedMinutes: 12,
    type: 'quiz',
    description: 'Test kunnskapen din om teknisk analyse.',
    ctaLabel: 'Start quiz',
    href: '/quiz?track=teknisk-analyse',
    prerequisites: ['ta-05-paper'],
    icon: 'Award',
  },
];

// === TRACKS SAMLET ===
export const LEARNING_TRACKS: LearningTrack[] = [
  {
    id: 'grunnkurs-krypto',
    slug: 'grunnkurs-krypto',
    title: 'Grunnkurs i Krypto',
    level: 'beginner',
    shortDescription: 'For deg som er helt ny. Lær hva krypto er, forstå risiko, og gjør din første øvingstrade.',
    fullDescription: 'Dette kurset tar deg fra null kunnskap til å forstå grunnleggende begreper og gjøre din første simulerte trade. Vi fokuserer på å bygge en solid forståelse av hva krypto er, hvorfor det er risikofullt, og hvordan du kommer i gang på en trygg måte.',
    whatYouLearn: [
      'Hva kryptovaluta er og hvordan det fungerer',
      'Hvorfor risikostyring er viktigere enn avkastning',
      'Hvordan du leser enkle grafer',
      'Å gjøre din første trade (med lekepenger)',
      'Bruke avkastningskalkulatoren',
    ],
    idealFor: [
      'Deg som har hørt om krypto men ikke vet hvor du skal starte',
      'Deg som vil lære før du risikerer ekte penger',
      'Deg som synes trading virker komplisert',
    ],
    estimatedTotalHours: 1.5,
    lessons: grunnkursLessons,
    badgeId: 'badge-grunnkurs',
    badgeLabel: 'Krypto Nybegynner',
    badgeDescription: 'Du har fullført grunnkurset og forstår basis om krypto og risiko.',
    color: 'bg-blue-600',
  },
  {
    id: 'risikostyring',
    slug: 'risikostyring',
    title: 'Risikostyring',
    level: 'intermediate',
    shortDescription: 'Lær å beskytte porteføljen din. Stop-loss, posisjonsstørrelse, og å ikke tape mer enn du tåler.',
    fullDescription: 'Den viktigste ferdigheten i trading er ikke å tjene penger – det er å ikke tape dem. Dette kurset lærer deg konkrete verktøy for å beskytte deg mot store tap.',
    whatYouLearn: [
      'Hvordan stop-loss fungerer i praksis',
      'Å beregne riktig posisjonsstørrelse',
      'Å sette realistiske mål og grenser',
      'Hvordan følelser påvirker beslutninger',
    ],
    idealFor: [
      'Deg som har startet med trading men vil unngå store tap',
      'Deg som vil lære profesjonelle risikostyringsmetoder',
      'Deg som har opplevd å tape mer enn du hadde planlagt',
    ],
    estimatedTotalHours: 1.5,
    lessons: risikostyringLessons,
    badgeId: 'badge-risikostyring',
    badgeLabel: 'Risiko-Mester',
    badgeDescription: 'Du mestrer grunnleggende risikostyring og vet hvordan du beskytter porteføljen.',
    color: 'bg-green-600',
  },
  {
    id: 'teknisk-analyse',
    slug: 'teknisk-analyse',
    title: 'Teknisk Analyse',
    level: 'advanced',
    shortDescription: 'Lær å lese grafer, identifisere trender, og finne gode tidspunkter for å kjøpe og selge.',
    fullDescription: 'Teknisk analyse handler om å bruke historiske prisdata for å forutsi fremtidige bevegelser. Dette kurset gir deg en solid introduksjon til de viktigste konseptene.',
    whatYouLearn: [
      'Å lese candlestick-grafer',
      'Identifisere trender og kanaler',
      'Forstå support- og resistance-nivåer',
      'Bruke teknisk analyse i praksis',
    ],
    idealFor: [
      'Deg som vil forstå hvorfor prisene beveger seg',
      'Deg som vil finne bedre tidspunkter for trades',
      'Deg som har fullført grunnkurset og vil lære mer',
    ],
    estimatedTotalHours: 2,
    lessons: tekniskAnalyseLessons,
    badgeId: 'badge-teknisk-analyse',
    badgeLabel: 'Chart-Mester',
    badgeDescription: 'Du kan lese grafer og bruke teknisk analyse i dine trading-beslutninger.',
    color: 'bg-emerald-600',
  },
];

// === HJELPEFUNKSJONER ===

export function getTrackById(trackId: string): LearningTrack | undefined {
  return LEARNING_TRACKS.find(t => t.id === trackId);
}

export function getLessonById(lessonId: string): LearningLesson | undefined {
  for (const track of LEARNING_TRACKS) {
    const lesson = track.lessons.find(l => l.id === lessonId);
    if (lesson) return lesson;
  }
  return undefined;
}

export function getTrackLessons(trackId: string): LearningLesson[] {
  const track = getTrackById(trackId);
  return track?.lessons || [];
}

export function getLessonsByType(type: LessonType): LearningLesson[] {
  const lessons: LearningLesson[] = [];
  for (const track of LEARNING_TRACKS) {
    lessons.push(...track.lessons.filter(l => l.type === type));
  }
  return lessons;
}

export function getTracksByLevel(level: TrackLevel): LearningTrack[] {
  return LEARNING_TRACKS.filter(t => t.level === level);
}

export function getFirstIncompleteLesson(
  trackId: string, 
  completedLessonIds: string[]
): LearningLesson | undefined {
  const track = getTrackById(trackId);
  if (!track) return undefined;
  
  return track.lessons.find(lesson => !completedLessonIds.includes(lesson.id));
}

export function calculateTrackProgress(
  trackId: string, 
  completedLessonIds: string[]
): { percentage: number; completed: number; total: number } {
  const track = getTrackById(trackId);
  if (!track) return { percentage: 0, completed: 0, total: 0 };
  
  const total = track.lessons.length;
  const completed = track.lessons.filter(l => completedLessonIds.includes(l.id)).length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  
  return { percentage, completed, total };
}

export function isTrackCompleted(trackId: string, completedLessonIds: string[]): boolean {
  const track = getTrackById(trackId);
  if (!track) return false;
  return track.lessons.every(l => completedLessonIds.includes(l.id));
}

export function getNextLessons(
  trackId: string, 
  completedLessonIds: string[], 
  count: number = 3
): LearningLesson[] {
  const track = getTrackById(trackId);
  if (!track) return [];
  
  return track.lessons
    .filter(l => !completedLessonIds.includes(l.id))
    .slice(0, count);
}

export function getCompletedLessonsForTrack(
  trackId: string,
  completedLessonIds: string[]
): LearningLesson[] {
  const track = getTrackById(trackId);
  if (!track) return [];
  
  return track.lessons.filter(l => completedLessonIds.includes(l.id));
}

// Norsk nivå-tekst
export function getLevelLabel(level: TrackLevel): string {
  switch (level) {
    case 'beginner': return 'Nybegynner';
    case 'intermediate': return 'Viderekommen';
    case 'advanced': return 'Erfaren';
    default: return level;
  }
}

// Type-ikon mapping
export function getLessonTypeLabel(type: LessonType): string {
  switch (type) {
    case 'article': return 'Artikkel';
    case 'video': return 'Video';
    case 'quiz': return 'Quiz';
    case 'simulator': return 'Simulator';
    case 'paper-trading': return 'Paper Trading';
    case 'tool': return 'Verktøy';
    case 'calculator': return 'Kalkulator';
    default: return type;
  }
}
