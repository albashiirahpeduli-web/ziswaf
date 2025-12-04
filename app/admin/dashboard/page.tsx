'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'

const supabase = createClient()

export default function AdminDashboard() {
    const [stats, setStats] = useState({
        totalDonations: 0,
        transactionCount: 0,
        totalDonors: 0,
        activeEvents: 0
    })
    const [recentActivities, setRecentActivities] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchDashboardData()
    }, [])

    const fetchDashboardData = async () => {
        setLoading(true)
        try {
            // 1. Total Donations & Count
            const { data: donations, count: transactionCount } = await supabase
                .from('transactions')
                .select('amount', { count: 'exact' })

            const totalDonations = donations?.reduce((sum, tx) => sum + Number(tx.amount), 0) || 0

            // 2. Total Donors
            const { count: totalDonors } = await supabase
                .from('donors')
                .select('*', { count: 'exact', head: true })

            // 3. Active Events
            const { count: activeEvents } = await supabase
                .from('events')
                .select('*', { count: 'exact', head: true })
                .eq('is_active', true)

            setStats({
                totalDonations,
                transactionCount: transactionCount || 0,
                totalDonors: totalDonors || 0,
                activeEvents: activeEvents || 0
            })

            // 4. Recent Activities (Latest 5 Transactions)
            const { data: activities } = await supabase
                .from('transactions')
                .select(`
                    id,
                    amount,
                    created_at,
                    donor_name_snapshot,
                    events (name)
                `)
                .order('created_at', { ascending: false })
                .limit(5)

            if (activities) {
                setRecentActivities(activities)
            }

        } catch (error) {
            console.error('Error fetching dashboard data:', error)
        } finally {
            setLoading(false)
        }
    }

    const formatRupiah = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(amount)
    }

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-800">Dashboard Overview</h1>
                <p className="text-slate-500 mt-1">Selamat datang kembali di Ziswaf Admin.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Total Donasi */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-all duration-200 group">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                            <span className="text-2xl">💰</span>
                        </div>
                        <span className="text-xs font-medium px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full">
                            {loading ? '...' : `${stats.transactionCount} Transaksi`}
                        </span>
                    </div>
                    <h3 className="text-slate-500 text-sm font-medium">Total Donasi</h3>
                    <p className="text-3xl font-bold text-slate-800 mt-1">
                        {loading ? '...' : formatRupiah(stats.totalDonations)}
                    </p>
                </div>

                {/* Total Muhsinin */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-all duration-200 group">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                            <span className="text-2xl">👥</span>
                        </div>
                        <span className="text-xs font-medium px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full">
                            Terdaftar
                        </span>
                    </div>
                    <h3 className="text-slate-500 text-sm font-medium">Total Muhsinin</h3>
                    <p className="text-3xl font-bold text-slate-800 mt-1">
                        {loading ? '...' : stats.totalDonors}
                    </p>
                </div>

                {/* Event Aktif */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-all duration-200 group">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                            <span className="text-2xl">📅</span>
                        </div>
                        <span className="text-xs font-medium px-2.5 py-1 bg-purple-50 text-purple-700 rounded-full">
                            Sedang Berjalan
                        </span>
                    </div>
                    <h3 className="text-slate-500 text-sm font-medium">Event Aktif</h3>
                    <p className="text-3xl font-bold text-slate-800 mt-1">
                        {loading ? '...' : stats.activeEvents}
                    </p>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-slate-800">Aktivitas Donasi Terbaru</h2>
                    <a href="/admin/donations" className="text-sm text-emerald-600 hover:text-emerald-700 font-medium">
                        Lihat Semua &rarr;
                    </a>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Muhsinin</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Program</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Jumlah</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Waktu</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-slate-500">Loading data...</td>
                                </tr>
                            ) : recentActivities.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-slate-500">Belum ada aktivitas.</td>
                                </tr>
                            ) : (
                                recentActivities.map((activity) => (
                                    <tr key={activity.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 text-sm font-medium text-slate-900">
                                            {activity.donor_name_snapshot || 'Hamba Allah'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600">
                                            {activity.events?.name || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-bold text-emerald-600">
                                            {formatRupiah(activity.amount)}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-500">
                                            {format(new Date(activity.created_at), 'dd MMM HH:mm', { locale: id })}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
