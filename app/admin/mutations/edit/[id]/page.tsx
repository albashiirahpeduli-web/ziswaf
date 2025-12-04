'use client'

import { useState, useEffect, use } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

const supabase = createClient()

export default function EditFundMutation({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter()
    const { id } = use(params)

    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [events, setEvents] = useState<any[]>([])

    // Form State
    const [eventId, setEventId] = useState('')
    const [date, setDate] = useState('')
    const [fromAccount, setFromAccount] = useState('tunai')
    const [toAccount, setToAccount] = useState('BSI 7185674333')
    const [notes, setNotes] = useState('')
    const [amountRaw, setAmountRaw] = useState('')
    const [amountFormatted, setAmountFormatted] = useState('')

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        // 1. Fetch Events
        const { data: eventsData } = await supabase
            .from('events')
            .select('id, name')
            .order('created_at', { ascending: false })

        if (eventsData) setEvents(eventsData)

        // 2. Fetch Mutation
        const { data: mutation, error } = await supabase
            .from('fund_mutations')
            .select('*')
            .eq('id', id)
            .single()

        if (error || !mutation) {
            alert('Data tidak ditemukan')
            router.push('/admin/mutations')
            return
        }

        // 3. Populate Form
        setEventId(mutation.event_id)
        setDate(new Date(mutation.mutation_date).toISOString().split('T')[0])
        setFromAccount(mutation.from_account)
        setToAccount(mutation.to_account)
        setNotes(mutation.notes || '')

        const amt = mutation.amount.toString()
        setAmountRaw(amt)
        setAmountFormatted(new Intl.NumberFormat('id-ID').format(parseInt(amt)))

        setLoading(false)
    }

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, '')
        setAmountRaw(value)
        if (value) {
            setAmountFormatted(new Intl.NumberFormat('id-ID').format(parseInt(value)))
        } else {
            setAmountFormatted('')
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitting(true)

        try {
            if (fromAccount === toAccount) {
                throw new Error('Akun asal dan tujuan tidak boleh sama')
            }

            const { error } = await supabase
                .from('fund_mutations')
                .update({
                    event_id: eventId,
                    mutation_date: new Date(date).toISOString(),
                    from_account: fromAccount,
                    to_account: toAccount,
                    amount: parseInt(amountRaw),
                    notes: notes
                })
                .eq('id', id)

            if (error) throw error

            alert('Perubahan berhasil disimpan!')
            router.push('/admin/mutations')
        } catch (error: any) {
            alert('Error: ' + error.message)
        } finally {
            setSubmitting(false)
        }
    }

    const accountOptions = [
        { value: 'tunai', label: 'Tunai' },
        { value: 'BSI 7185674333', label: 'BSI 7185674333' },
        { value: 'BSI 7147181978', label: 'BSI 7147181978' },
    ]

    if (loading) return <div className="p-8 text-center">Loading...</div>

    return (
        <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Edit Mutasi Saldo</h1>
                <button
                    onClick={() => router.back()}
                    className="text-gray-600 hover:text-gray-900"
                >
                    Kembali
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <form onSubmit={handleSubmit} className="space-y-6">

                    {/* Event Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Program / Event</label>
                        <select
                            value={eventId}
                            onChange={(e) => setEventId(e.target.value)}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                            required
                        >
                            {events.map(e => (
                                <option key={e.id} value={e.id}>{e.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Date Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Transaksi</label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* From Account */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Dari Akun</label>
                            <select
                                value={fromAccount}
                                onChange={(e) => setFromAccount(e.target.value)}
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                            >
                                {accountOptions.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* To Account */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Ke Akun</label>
                            <select
                                value={toAccount}
                                onChange={(e) => setToAccount(e.target.value)}
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                            >
                                {accountOptions.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Amount */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah Mutasi (Rp)</label>
                        <div className="relative">
                            <span className="absolute left-4 top-2 text-gray-500 font-bold">Rp</span>
                            <input
                                type="text"
                                value={amountFormatted}
                                onChange={handleAmountChange}
                                className="w-full pl-12 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-bold text-lg text-gray-800"
                                placeholder="0"
                                required
                            />
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Keterangan (Opsional)</label>
                        <input
                            type="text"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Contoh: Setor tunai ke bank..."
                        />
                    </div>

                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:opacity-50"
                        >
                            {submitting ? 'Menyimpan...' : 'Simpan Perubahan'}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    )
}
