'use client';

import { Award, Shield, Users, TrendingUp, CheckCircle, Star } from 'lucide-react';

interface Highlight {
  icon: React.ElementType;
  title: string;
  description: string;
  color: string;
}

const highlights: Highlight[] = [
  {
    icon: Shield,
    title: 'Full Åpenhet',
    description: 'Ingen pyramidespill, ingen skjulte agendaer',
    color: 'text-green-400',
  },
  {
    icon: Users,
    title: '100+ Grunnleggere',
    description: 'Voksende community av seriøse tradere',
    color: 'text-blue-400',
  },
  {
    icon: TrendingUp,
    title: 'AI-Drevet',
    description: 'Avanserte algoritmer med historisk presisjon',
    color: 'text-emerald-400',
  },
  {
    icon: Award,
    title: 'Norsk Eid',
    description: 'Bygget i Norge for norske tradere',
    color: 'text-yellow-400',
  },
];

export function CredibilityHighlights({ locale = 'no' }: { locale?: string }) {
  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 border-y border-white/5">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {highlights.map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={i} className="text-center group">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-900 border border-white/5 flex items-center justify-center group-hover:border-white/10 transition-colors">
                  <Icon className={`w-8 h-8 ${item.color}`} />
                </div>
                <h3 className="font-bold text-white mb-1">{item.title}</h3>
                <p className="text-slate-500 text-sm">{item.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// Verification Badge for Founder Students
export function VerificationBadge({ 
  type = 'founder',
  number,
  locale = 'no' 
}: { 
  type?: 'founder' | 'verified' | 'student' | 'master';
  number?: number;
  locale?: string;
}) {
  const badges = {
    founder: {
      icon: Star,
      label: locale === 'no' ? 'Grunnlegger' : 'Founder',
      color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      description: locale === 'no' ? 'En av de første 100' : 'One of the first 100',
    },
    verified: {
      icon: CheckCircle,
      label: locale === 'no' ? 'Verifisert' : 'Verified',
      color: 'bg-green-500/20 text-green-400 border-green-500/30',
      description: locale === 'no' ? 'ID bekreftet' : 'ID confirmed',
    },
    student: {
      icon: Users,
      label: locale === 'no' ? 'Student' : 'Student',
      color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      description: locale === 'no' ? 'Aktiv lærer' : 'Active learner',
    },
    master: {
      icon: Award,
      label: locale === 'no' ? 'Master' : 'Master',
      color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      description: locale === 'no' ? 'Fullført Master' : 'Completed Master',
    },
  };

  const badge = badges[type];
  const Icon = badge.icon;

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${badge.color} text-sm font-medium`}>
      <Icon className="w-4 h-4" />
      <span>{badge.label}</span>
      {number && <span className="text-xs opacity-75">#{number}</span>}
    </div>
  );
}

// Trust Bar for landing pages
export function TrustBar({ locale = 'no' }: { locale?: string }) {
  const isNorwegian = locale === 'no';
  
  return (
    <div className="py-8 px-4 border-t border-white/5 bg-slate-950/50">
      <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-center gap-8 text-slate-500 text-sm">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-green-400" />
          <span>{isNorwegian ? 'Bank-level sikkerhet' : 'Bank-level security'}</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-blue-400" />
          <span>{isNorwegian ? 'Ærlige priser' : 'Honest pricing'}</span>
        </div>
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-emerald-400" />
          <span>{isNorwegian ? '100+ fornøyde studenter' : '100+ happy students'}</span>
        </div>
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-yellow-400" />
          <span>{isNorwegian ? 'Norsk støtte' : 'Norwegian support'}</span>
        </div>
      </div>
    </div>
  );
}
