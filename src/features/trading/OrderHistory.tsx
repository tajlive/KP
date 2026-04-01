'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/utils'
import { format } from 'date-fns'
import { nb, enUS } from 'date-fns/locale'
import { useLocale, useTranslations } from 'next-intl'

interface Order {
    id: string
    symbol: string
    side: 'buy' | 'sell'
    qty: number
    price: number
    created_at: string
    status: string
}

export function OrderHistory() {
    const t = useTranslations('orderHistory')
    const locale = useLocale()
    const [orders, setOrders] = useState<Order[]>([])
    const [loading, setLoading] = useState(true)

    const fetchOrders = async () => {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) return

        const { data, error } = await supabase
            .from('trades')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(10)

        if (data) setOrders(data as unknown as Order[])
        setLoading(false)
    }

    useEffect(() => {
        fetchOrders()

        // Optional: Realtime subscription could go here
    }, [])

    if (loading) return <div className="text-slate-500 text-sm">{t('loading')}</div>
    if (orders.length === 0) return <div className="text-slate-500 text-sm">{t('noOrders')}</div>

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-400 uppercase bg-slate-800/50">
                    <tr>
                        <th className="px-4 py-3">{t('date')}</th>
                        <th className="px-4 py-3">{t('pair')}</th>
                        <th className="px-4 py-3">{t('side')}</th>
                        <th className="px-4 py-3">{t('price')}</th>
                        <th className="px-4 py-3">{t('amount')}</th>
                        <th className="px-4 py-3">{t('total')}</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                    {orders.map((order) => (
                        <tr key={order.id} className="bg-slate-900/50 hover:bg-slate-800 transition-colors">
                            <td className="px-4 py-3 text-slate-300">
                                {format(new Date(order.created_at), 'dd.MM HH:mm', { locale: locale === 'no' ? nb : enUS })}
                            </td>
                            <td className="px-4 py-3 font-medium text-white">{order.symbol}</td>
                            <td className={`px-4 py-3 font-semibold ${order.side === 'buy' ? 'text-green-400' : 'text-red-400'}`}>
                                {order.side === 'buy' ? t('buy') : t('sell')}
                            </td>
                            <td className="px-4 py-3 text-slate-300">{order.price.toLocaleString(locale === 'no' ? 'no-NO' : 'en-US')}</td>
                            <td className="px-4 py-3 text-slate-300">{order.qty}</td>
                            <td className="px-4 py-3 text-slate-300">{(order.qty * order.price).toLocaleString(locale === 'no' ? 'no-NO' : 'en-US')}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
