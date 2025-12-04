'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import { downloadCSV } from '@/utils/export'
import Pagination from '@/components/Pagination'

const supabase = createClient()

export default function DonationManagement() {
    const [transactions, setTransactions] = useState<any[]>([])
    const [events, setEvents] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [selectedEvent, setSelectedEvent] = useState('all')

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage, setItemsPerPage] = useState(10)

    useEffect(() => {
        fetchEvents()
        fetchTransactions()
    }, [])

    const fetchEvents = async () => {
        const { data } = await supabase.from('events').select('id, name').order('created_at', { ascending: false })
        if (data) setEvents(data)
    }

    const fetchTransactions = async () => {
        setLoading(true)
        let query = supabase
            .from('transactions')
            .select(`
        *,
        donors (name),
        events (name)
      `)
            .order('transaction_date', { ascending: false })

        if (selectedEvent !== 'all') {
            query = query.eq('event_id', selectedEvent)
        }

        const { data, error } = await query

        if (data) {
            setTransactions(data)
        }
        setLoading(false)
    }

    // Refetch when filter changes
    useEffect(() => {
        fetchTransactions()
    }, [selectedEvent])

    // Reset to page 1 when search/filter changes
    useEffect(() => {
        setCurrentPage(1)
    }, [search, selectedEvent, itemsPerPage])

    const handleDelete = async (id: string) => {
        if (!confirm('Apakah anda yakin ingin menghapus donasi ini?')) return

        const { error } = await supabase.from('transactions').delete().eq('id', id)
        if (error) {
            alert('Gagal menghapus: ' + error.message)
        } else {
            fetchTransactions()
        }
    }

    // Client-side search filtering
    const filteredTransactions = transactions.filter(t => {
        const donorName = t.donors?.name || t.donor_name_snapshot || 'Hamba Allah'
        return donorName.toLowerCase().includes(search.toLowerCase())
    })

    // Pagination Logic
    const totalItems = filteredTransactions.length
    const totalPages = Math.ceil(totalItems / itemsPerPage)
    const paginatedTransactions = filteredTransactions.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    )

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount)
    }

    const handleExport = () => {
        if (filteredTransactions.length === 0) {
            alert('Tidak ada data untuk diexport')
            return
        }

        const exportData = filteredTransactions.map(t => ({
            Tanggal: new Date(t.transaction_date).toLocaleDateString('id-ID'),
            Donatur: t.donors?.name || t.donor_name_snapshot || '-',
            Event: t.events?.name || '-',
            Tipe: t.type,
            Jumlah: t.amount,
            Catatan: '-'
        }))

        downloadCSV(exportData, `Laporan_Donasi_${new Date().toISOString().slice(0, 10)}`)
    }

    // Calculate Stats
    const stats = filteredTransactions.reduce((acc, t) => {
        const amount = t.amount || 0
        const type = (t.type || '').toLowerCase()

        acc.total += amount

        if (type.includes('tunai')) {
            acc.tunai += amount
        } else if (type.includes('transfer')) {
            acc.transfer += amount

            // Breakdown by account
            if (type.includes('7185674333')) {
                acc.bsi1 += amount
            } else if (type.includes('7147181978')) {
                acc.bsi2 += amount
            } else {
                acc.otherTransfer += amount
            }
        }
        return acc
    }, { total: 0, tunai: 0, transfer: 0, bsi1: 0, bsi2: 0, otherTransfer: 0 })

    return (
        <div className="h-full flex flex-col">
            <div className="shrink-0">
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Manajemen Donasi</h1>
                        <p className="text-slate-500 mt-1">Kelola data donasi yang masuk.</p>
                    </div>

                    <div className="flex flex-col md:flex-row flex-wrap gap-3 w-full xl:w-auto items-stretch md:items-center">
                        <select
                            value={selectedEvent}
                            onChange={(e) => setSelectedEvent(e.target.value)}
                            className="border border-slate-300 rounded-lg px-4 py-2.5 bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-slate-600 min-w-[200px]"
                        >
                            <option value="all">Semua Event</option>
                            {events.map(e => (
                                <option key={e.id} value={e.id}>{e.name}</option>
                            ))}
                        </select>

                        <input
                            type="text"
                            placeholder="Cari nama donatur..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="border border-slate-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-slate-600 min-w-[200px]"
                        />

                        <button
                            onClick={handleExport}
                            className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 px-6 py-2.5 rounded-lg transition-all shadow-sm font-medium flex items-center justify-center gap-2"
                        >
                            <span>📥</span> Export
                        </button>
                        <a
                            href="/admin/donations/create"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-lg transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2 font-medium"
                        >
                            <span>+</span> Tambah
                        </a>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
                        <p className="text-sm text-slate-500 font-medium mb-1">Total Donasi</p>
                        <p className="text-2xl font-bold text-slate-800">{formatCurrency(stats.total)}</p>
                    </div>
                    <div className="bg-emerald-50 p-5 rounded-xl shadow-sm border border-emerald-100">
                        <p className="text-sm text-emerald-600 font-medium mb-1">Total Tunai</p>
                        <p className="text-2xl font-bold text-emerald-700">{formatCurrency(stats.tunai)}</p>
                    </div>
                    <div className="bg-blue-50 p-5 rounded-xl shadow-sm border border-blue-100">
                        <p className="text-sm text-blue-600 font-medium mb-1">Total Transfer</p>
                        <p className="text-2xl font-bold text-blue-700">{formatCurrency(stats.transfer)}</p>
                    </div>
                    <div className="bg-slate-50 p-5 rounded-xl shadow-sm border border-slate-200">
                        <p className="text-xs text-slate-500 font-medium mb-2 uppercase tracking-wide">Rincian Transfer</p>
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-600">BSI ...4333:</span>
                                <span className="font-semibold text-slate-800">{formatCurrency(stats.bsi1)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-600">BSI ...1978:</span>
                                <span className="font-semibold text-slate-800">{formatCurrency(stats.bsi2)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-hidden bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col">
                <div className="flex-1 overflow-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-100 sticky top-0 z-10">
                            <tr>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tanggal</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Donatur</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Event</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Metode</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Jumlah</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500">Loading data...</td>
                                </tr>
                            ) : paginatedTransactions.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500">Tidak ada data donasi.</td>
                                </tr>
                            ) : (
                                paginatedTransactions.map((t) => (
                                    <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 text-sm text-slate-600">
                                            {format(new Date(t.transaction_date), 'dd MMM yyyy HH:mm', { locale: id })}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium text-slate-900">
                                            {t.donors?.name || t.donor_name_snapshot || 'Hamba Allah'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600">
                                            {t.events?.name || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${t.type?.toLowerCase().includes('tunai')
                                                ? 'bg-emerald-100 text-emerald-700'
                                                : 'bg-blue-100 text-blue-700'
                                                }`}>
                                                {t.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-bold text-slate-900 text-right">
                                            {formatCurrency(t.amount)}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <a
                                                    href={`/admin/donations/edit/${t.id}`}
                                                    className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-colors"
                                                    title="Edit"
                                                >
                                                    ✏️
                                                </a>
                                                <button
                                                    onClick={() => handleDelete(t.id)}
                                                    className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors"
                                                    title="Hapus"
                                                >
                                                    🗑️
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
        </div >
    )
}
