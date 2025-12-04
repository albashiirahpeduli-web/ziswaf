'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import Pagination from '@/components/Pagination'

const supabase = createClient()

export default function FundMutationManagement() {
    const [mutations, setMutations] = useState<any[]>([])
    const [events, setEvents] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedEvent, setSelectedEvent] = useState('all')

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage, setItemsPerPage] = useState(10)

    useEffect(() => {
        fetchEvents()
        fetchMutations()
    }, [])

    const fetchEvents = async () => {
        const { data } = await supabase.from('events').select('id, name').order('created_at', { ascending: false })
        if (data) setEvents(data)
    }

    const fetchMutations = async () => {
        setLoading(true)
        let query = supabase
            .from('fund_mutations')
            .select(`
                *,
                events (name)
            `)
            .order('mutation_date', { ascending: false })

        if (selectedEvent !== 'all') {
            query = query.eq('event_id', selectedEvent)
        }

        const { data, error } = await query

        if (data) {
            setMutations(data)
        }
        setLoading(false)
    }

    // Refetch when filter changes
    useEffect(() => {
        fetchMutations()
    }, [selectedEvent])

    // Reset to page 1 when search/filter changes
    useEffect(() => {
        setCurrentPage(1)
    }, [selectedEvent, itemsPerPage])

    const handleDelete = async (id: string) => {
        if (!confirm('Apakah anda yakin ingin menghapus mutasi ini?')) return

        const { error } = await supabase.from('fund_mutations').delete().eq('id', id)
        if (error) {
            alert('Gagal menghapus: ' + error.message)
        } else {
            fetchMutations()
        }
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount)
    }

    // Pagination Logic
    const totalItems = mutations.length
    const totalPages = Math.ceil(totalItems / itemsPerPage)
    const paginatedMutations = mutations.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    )

    return (
        <div className="h-full flex flex-col">
            <div className="shrink-0">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <h1 className="text-2xl font-bold text-gray-800 whitespace-nowrap">Mutasi Saldo</h1>

                    <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto items-center">
                        <select
                            value={selectedEvent}
                            onChange={(e) => setSelectedEvent(e.target.value)}
                            className="border rounded-lg px-4 py-2 bg-white focus:ring-2 focus:ring-blue-500 outline-none min-w-[200px] w-full md:w-auto"
                        >
                            <option value="all">Semua Event</option>
                            {events.map(e => (
                                <option key={e.id} value={e.id}>{e.name}</option>
                            ))}
                        </select>

                        <a
                            href="/admin/mutations/create"
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 whitespace-nowrap w-full md:w-auto"
                        >
                            <span>+</span> Buat Mutasi
                        </a>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-hidden bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col">
                <div className="flex-1 overflow-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-100 sticky top-0 z-10">
                            <tr>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Tanggal</th>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Dari Akun</th>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Ke Akun</th>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Keterangan</th>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Event</th>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase text-right">Jumlah</th>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">Loading data...</td>
                                </tr>
                            ) : paginatedMutations.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">Belum ada data mutasi.</td>
                                </tr>
                            ) : (
                                paginatedMutations.map((m) => (
                                    <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {format(new Date(m.mutation_date), 'dd MMM yyyy', { locale: id })}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-700">
                                                {m.from_account}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-700">
                                                {m.to_account}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {m.notes || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {m.events?.name || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-bold text-gray-800 text-right">
                                            {formatCurrency(m.amount)}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex justify-center gap-2">
                                                <a
                                                    href={`/admin/mutations/edit/${m.id}`}
                                                    className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 p-2 rounded-lg transition-colors"
                                                    title="Edit"
                                                >
                                                    ✏️
                                                </a>
                                                <button
                                                    onClick={() => handleDelete(m.id)}
                                                    className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors"
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
