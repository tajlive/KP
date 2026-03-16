'use client'

import { useLocale, useTranslations } from 'next-intl'
import {
    Facebook,
    Linkedin,
    Instagram,
    Twitter
} from 'lucide-react'

import { useEffect, useState } from 'react'
import { getAppUrl } from '@/lib/auth/config'

export function SocialShare() {
    const locale = useLocale()
    const _t = useTranslations('common')
    const [shareUrl, setShareUrl] = useState('')

    useEffect(() => {
        setShareUrl(getAppUrl() + '/' + locale)
    }, [locale])

    const shareLinks = [
        {
            name: 'Facebook',
            icon: Facebook,
            color: 'bg-[#1877F2]',
            href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`
        },
        {
            name: 'X',
            icon: Twitter,
            color: 'bg-[#000000]',
            href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent('Sjekk ut Klarpakke Universitet!')}`
        },
        {
            name: 'LinkedIn',
            icon: Linkedin,
            color: 'bg-[#0A66C2]',
            href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`
        }
    ]

    return (
        <section className="py-12 border-t border-slate-100 bg-slate-50/30">
            <div className="max-w-7xl mx-auto px-4 text-center">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">
                    {locale === 'no' ? 'Spre ordet' : 'Spread the word'}
                </h2>
                <p className="text-slate-500 mb-8 max-w-md mx-auto">
                    {locale === 'no'
                        ? 'Hjelp oss å revolusjonere krypto-utdanning i Norge. Del med dine venner!'
                        : 'Help us revolutionize krypto education. Share with your friends!'}
                </p>

                <div className="flex flex-wrap justify-center gap-4">
                    {shareLinks.map((social) => (
                        <a
                            key={social.name}
                            href={social.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex items-center gap-2 h-12 px-6 rounded-xl ${social.color} text-white hover:scale-105 hover:opacity-90 transition-all shadow-md font-bold`}
                        >
                            <social.icon className="w-5 h-5" />
                            <span>{social.name}</span>
                        </a>
                    ))}
                    {/* Snapchat & Instagram are easier as simple links to profiles for now if share URLs are tricky */}
                    <a
                        href="https://instagram.com/klarpakke"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 h-12 px-6 rounded-xl bg-linear-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] text-white hover:scale-105 hover:opacity-90 transition-all shadow-md font-bold"
                    >
                        <Instagram className="w-5 h-5" />
                        <span>Instagram</span>
                    </a>
                </div>
            </div>
        </section>
    )
}
