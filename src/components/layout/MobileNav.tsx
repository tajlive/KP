'use client';

import { useAuth } from '@/components/auth/AuthContext';
import { cn } from '@/lib/utils';
import {
    BookOpen,
    ChevronRight,
    HelpCircle,
    Home,
    LayoutDashboard,
    LogIn,
    Menu,
    Tag,
    Trophy,
    X
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { user } = useAuth();
  const locale = useLocale();
  const t = useTranslations('navigation');

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!mounted) return null;

  const l = (path: string) => `/${locale}${path}`;

  const mainLinks = [
    { path: '/', label: t('home'), icon: Home },
    { path: '/kurs', label: t('courses'), icon: BookOpen },
    { path: '/leagues', label: t('leagues') || 'Konkurranser', icon: Trophy },
    // REMOVED: { path: '/om-oss', label: t('about'), icon: HelpCircle },
    { path: '/priser', label: t('pricing'), icon: Tag },
    { path: '/hjelp', label: t('help'), icon: HelpCircle },
  ];

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden p-2 text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
        aria-label={isOpen ? 'Lukk meny' : 'Åpne meny'}
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Mobile Menu Overlay */}
      <div
        className={cn(
          "fixed inset-0 z-40 md:hidden transition-all duration-300",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
      >
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />

        {/* Menu Panel */}
        <div
          className={cn(
            "absolute right-0 top-0 bottom-0 w-[280px] bg-slate-950 border-l border-white/10 shadow-2xl transition-transform duration-300 ease-out",
            isOpen ? "translate-x-0" : "translate-x-full"
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/5">
            <span className="font-bold text-white">Meny</span>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              aria-label="Lukk meny"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1">
            {mainLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.path}
                  href={l(link.path)}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:text-white hover:bg-white/5 rounded-xl transition-all group"
                >
                  <Icon className="w-5 h-5 text-slate-400 group-hover:text-blue-400 transition-colors" />
                  <span className="font-medium">{link.label}</span>
                  <ChevronRight className="w-4 h-4 ml-auto text-slate-600 group-hover:text-slate-400" />
                </Link>
              );
            })}
          </nav>

          {/* Divider */}
          <div className="mx-4 border-t border-white/5" />

          {/* User Section */}
          <div className="p-4">
            {user ? (
              <Link
                href={l('/dashboard')}
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-4 py-3 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-600/20 rounded-xl transition-all"
              >
                <LayoutDashboard className="w-5 h-5 text-blue-400" />
                <span className="font-medium text-blue-400">Dashboard</span>
              </Link>
            ) : (
              <Link
                href={l('/beta/apply')}
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl transition-all"
              >
                <LogIn className="w-5 h-5" />
                <span className="font-medium">{t('signup')}</span>
              </Link>
            )}
          </div>

          {/* Footer */}
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/5">
            <div className="flex items-center justify-center gap-4 text-xs text-slate-500">
              <Link href={l('/personvern')} className="hover:text-slate-400">
                Personvern
              </Link>
              <span>•</span>
              <Link href={l('/vilkar')} className="hover:text-slate-400">
                Vilkår
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
