'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import Pagination from '@/components/Pagination'

const supabase = createClient()

export default function EventManagement() {
    const [events, setEvents] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [balances, setBalances] = useState<Record<string, number>>({})

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage, setItemsPerPage] = useState(10)

    useEffect(() => {
        fetchEvents()
    }, [])

    const fetchEvents = async () => {
        setLoading(true)

        // 1. Fetch Events
        const { data: eventsData } = await supabase
            .from('events')
            .select('*')
            .order('created_at', { ascending: false })

        // 2. Fetch Transactions for Balance Calculation
        const { data: transactionsData } = await supabase
            .from('transactions')
            .select('event_id, amount')

        // 3. Calculate Balances
        const newBalances: Record<string, number> = {}
        if (transactionsData) {
            transactionsData.forEach((t: any) => {
                if (!newBalances[t.event_id]) newBalances[t.event_id] = 0
                newBalances[t.event_id] += t.amount
            })
        }
        setBalances(newBalances)

        if (eventsData) {
            setEvents(eventsData)
        }
        setLoading(false)
    }

    const toggleStatus = async (event: any) => {
        const newStatus = !event.is_active
        const action = newStatus ? 'mengaktifkan' : 'menutup'

        if (!confirm(`Apakah anda yakin ingin ${action} event "${event.name}"?`)) return

        const { error } = await supabase
            .from('events')
            .update({ is_active: newStatus })
            .eq('id', event.id)

        if (error) {
            alert('Gagal update status: ' + error.message)
        } else {
            fetchEvents()
        }
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount)
    }

    const formatDate = (dateString: string | null) => {
        if (!dateString) return '-'
        return format(new Date(dateString), 'dd MMM yyyy', { locale: id })
    }

    const handleCloseEvent = (eventId: string, isActive: boolean) => {
        const event = events.find(e => e.id === eventId)
        if (event) toggleStatus(event)
    }

    // Pagination Logic
    const totalItems = events.length
    const totalPages = Math.ceil(totalItems / itemsPerPage)
    const paginatedEvents = events.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    )

    return (
        <div className="h-full flex flex-col">
            <div className="shrink-0">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Manajemen Event</h1>
                        <p className="text-slate-500 mt-1">Kelola program donasi yang aktif.</p>
                    </div>
                    <a
                        href="/admin/events/create"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-lg transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2 font-medium"
                    >
                        <span>+</span> Buat Event Baru
                    </a>
                </div>
            </div>

            <div className="flex-1 overflow-hidden bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col">
                <div className="flex-1 overflow-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-100 sticky top-0 z-10">
                            <tr>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Nama Event</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Periode</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Terkumpul</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">Loading data...</td>
                                </tr>
                            ) : paginatedEvents.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">Belum ada event.</td>
                                </tr>
                            ) : (
                                paginatedEvents.map((event) => (
                                    <tr key={event.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-slate-900">{event.name}</div>
                                            <div className="text-xs text-slate-500 mt-0.5">{event.description || '-'}</div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600">
                                            <div>{formatDate(event.start_date)}</div>
                                            <div className="text-xs text-slate-400">s/d {formatDate(event.end_date)}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${event.is_active
                                                ? 'bg-emerald-100 text-emerald-700'
                                                : 'bg-slate-100 text-slate-600'
                                                }`}>
                                                {event.is_active ? 'Aktif' : 'Selesai'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-bold text-slate-900 text-right">
                                            {formatCurrency(balances[event.id] || 0)}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <a
                                                    href={`/admin/events/edit/${event.id}`}
                                                    className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-colors"
                                                    title="Edit"
                                                >
                                                    ✏️
                                                </a>
                                                <button
                                                    onClick={() => handleCloseEvent(event.id, event.is_active)}
                                                    className={`p-2 rounded-lg transition-colors ${event.is_active
                                                        ? 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                                                        : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                                                        }`}
                                                    title={event.is_active ? 'Tutup Event' : 'Aktifkan Event'}
                                                >
                                                    {event.is_active ? '🛑' : '▶️'}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Control */}
                {!loading && totalItems > 0 && (
                    <div className="px-6 border-t border-slate-100 shrink-0">
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            itemsPerPage={itemsPerPage}
                            totalItems={totalItems}
                            onPageChange={setCurrentPage}
                            onItemsPerPageChange={setItemsPerPage}
                        />
                    </div>
                )}
            </div>
        </div>
    )
}
