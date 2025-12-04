'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import { downloadCSV } from '@/utils/export'
import Pagination from '@/components/Pagination'

const supabase = createClient()

export default function DisbursementManagement() {
    const [disbursements, setDisbursements] = useState<any[]>([])
    const [events, setEvents] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [selectedEvent, setSelectedEvent] = useState('all')
    const [balance, setBalance] = useState(0)

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage, setItemsPerPage] = useState(10)

    useEffect(() => {
        fetchEvents()
        fetchData()
    }, [])

    const fetchEvents = async () => {
        const { data } = await supabase.from('events').select('id, name').order('created_at', { ascending: false })
        if (data) setEvents(data)
    }

    const fetchData = async () => {
        setLoading(true)

        // 1. Fetch Disbursements
        let query = supabase
            .from('disbursements')
            .select(`
                *,
                events (name)
            `)
            .order('disbursement_date', { ascending: false })

        if (selectedEvent !== 'all') {
            query = query.eq('event_id', selectedEvent)
        }

        const { data: disburseData, error } = await query

        if (disburseData) {
            setDisbursements(disburseData)
        }

        // 2. Calculate Balance (Total Donations - Total Disbursements)
        // Note: This might be heavy if lots of data, ideally use RPC or separate stats table.
        // For now, client-side calc for simplicity or separate simple queries.

        // Fetch Total Donations
        let donationQuery = supabase.from('transactions').select('amount')
        if (selectedEvent !== 'all') {
            donationQuery = donationQuery.eq('event_id', selectedEvent)
        }
        const { data: donations } = await donationQuery
        const totalDonations = donations?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0

        // Calculate Total Disbursements (from the fetched data if filtered, or fetch all if needed)
        // If we use the filtered `disburseData`, it gives us the expense for the selected event.
        const totalExpenses = disburseData?.reduce((sum, d) => sum + (d.amount || 0), 0) || 0

        setBalance(totalDonations - totalExpenses)

        setLoading(false)
    }

    // Refetch when filter changes
    useEffect(() => {
        fetchData()
    }, [selectedEvent])

    // Reset to page 1 when search/filter changes
    useEffect(() => {
        setCurrentPage(1)
    }, [search, selectedEvent, itemsPerPage])

    const handleDelete = async (id: string) => {
        if (!confirm('Apakah anda yakin ingin menghapus pengeluaran ini?')) return

        const { error } = await supabase.from('disbursements').delete().eq('id', id)
        if (error) {
            alert('Gagal menghapus: ' + error.message)
        } else {
            fetchData()
        }
    }

    // Client-side search
    const filteredDisbursements = disbursements.filter(d => {
        const recipient = d.recipient || ''
        const description = d.description || ''
        const query = search.toLowerCase()
        return recipient.toLowerCase().includes(query) || description.toLowerCase().includes(query)
    })

    // Pagination Logic
    const totalItems = filteredDisbursements.length
    const totalPages = Math.ceil(totalItems / itemsPerPage)
    const paginatedDisbursements = filteredDisbursements.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    )

    const totalExpense = filteredDisbursements.reduce((sum, d) => sum + (d.amount || 0), 0)

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount)
    }

    const handleExport = () => {
        if (filteredDisbursements.length === 0) {
            alert('Tidak ada data untuk diexport')
            return
        }

        const exportData = filteredDisbursements.map(d => ({
            Tanggal: new Date(d.disbursement_date).toLocaleDateString('id-ID'),
            Event: d.events?.name || '-',
            Penerima: d.recipient || '-',
            Deskripsi: d.description || '-',
            Kategori: d.category || '-',
            Metode: d.method,
            Jumlah: d.amount,
            Catatan: d.notes || '-'
        }))

        downloadCSV(exportData, `Laporan_Penyaluran_${new Date().toISOString().slice(0, 10)}`)
    }

    return (
        <div className="h-full flex flex-col">
            <div className="shrink-0">
                {/* Header Row: Title & Balance */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Manajemen Penyaluran</h1>
                        <p className="text-slate-500 mt-1">Kelola data penyaluran dana (disbursement).</p>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl px-6 py-3 shadow-sm flex items-center gap-3">
                        <span className="text-slate-500 font-medium">Saldo Saat Ini:</span>
                        <span className={`text-xl font-bold ${balance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {formatCurrency(balance)}
                        </span>
                    </div>
                </div>

                {/* Controls Row: Add, Filter, Search, Total Stats */}
                <div className="flex flex-col md:flex-row gap-4 mb-8 items-center flex-wrap">
                    <div className="flex gap-2">
                        <button
                            onClick={handleExport}
                            className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 px-6 py-2.5 rounded-lg transition-all shadow-sm font-medium flex items-center justify-center gap-2 whitespace-nowrap"
                        >
                            <span>📥</span> Export
                        </button>
                        <a
                            href="/admin/disbursements/create"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-lg transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2 font-medium whitespace-nowrap"
                        >
                            <span>+</span> Buat Penyaluran
                        </a>
                    </div>

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
                        placeholder="Cari penerima..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="border border-slate-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-slate-600 w-full md:w-64"
                    />

                    <div className="bg-red-50 px-4 py-2.5 rounded-lg border border-red-100 flex items-center gap-2 ml-auto md:ml-0">
                        <span className="text-sm text-red-600 font-medium">Total Keluar:</span>
                        <span className="font-bold text-red-700">{formatCurrency(totalExpense)}</span>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-hidden bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col">
                <div className="flex-1 overflow-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-100 sticky top-0 z-10">
                            <tr>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tanggal</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Event</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Penerima</th>
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
                            ) : paginatedDisbursements.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500">Belum ada data penyaluran.</td>
                                </tr>
                            ) : (
                                paginatedDisbursements.map((d) => (
                                    <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 text-sm text-slate-600">
                                            {format(new Date(d.disbursement_date), 'dd MMM yyyy', { locale: id })}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600">
                                            {d.events?.name || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium text-slate-900">
                                            {d.recipient_name}
                                            <div className="text-xs text-slate-400 font-normal mt-0.5">{d.description}</div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${d.method?.toLowerCase() === 'tunai'
                                                ? 'bg-emerald-100 text-emerald-700'
                                                : 'bg-blue-100 text-blue-700'
                                                }`}>
                                                {d.method}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-bold text-slate-900 text-right">
                                            {formatCurrency(d.amount)}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <a
                                                    href={`/admin/disbursements/edit/${d.id}`}
                                                    className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-colors"
                                                    title="Edit"
                                                >
                                                    ✏️
                                                </a>
                                                <button
                                                    onClick={() => handleDelete(d.id)}
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
