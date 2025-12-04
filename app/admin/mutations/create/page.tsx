'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

const supabase = createClient()

export default function CreateFundMutation() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [events, setEvents] = useState<any[]>([])

    // Form State
    const [eventId, setEventId] = useState('')
    const [date, setDate] = useState(new Date().toISOString().split('T')[0])
    const [fromAccount, setFromAccount] = useState('tunai')
    const [toAccount, setToAccount] = useState('BSI 7185674333')
    const [notes, setNotes] = useState('')

    // Amount State
    const [amountRaw, setAmountRaw] = useState('')
    const [amountFormatted, setAmountFormatted] = useState('')

    useEffect(() => {
        fetchEvents()
    }, [])

    const fetchEvents = async () => {
        const { data } = await supabase
            .from('events')
            .select('id, name')
            .order('created_at', { ascending: false })

        if (data && data.length > 0) {
            setEvents(data)
            setEventId(data[0].id)
        }
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
        setLoading(true)

        try {
            if (fromAccount === toAccount) {
                throw new Error('Akun asal dan tujuan tidak boleh sama')
            }

            const { error } = await supabase
                .from('fund_mutations')
                .insert({
                    event_id: eventId,
                    mutation_date: new Date(date).toISOString(),
                    from_account: fromAccount,
                    to_account: toAccount,
                    amount: parseInt(amountRaw),
                    notes: notes
                })

            if (error) throw error

            alert('Mutasi berhasil dicatat!')
            router.push('/admin/mutations')
        } catch (error: any) {
            alert('Error: ' + error.message)
        } finally {
            setLoading(false)
        }
    }

    const accountOptions = [
        { value: 'tunai', label: 'Tunai' },
        { value: 'BSI 7185674333', label: 'BSI 7185674333' },
        { value: 'BSI 7147181978', label: 'BSI 7147181978' },
    ]

    return (
        <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Catat Mutasi Saldo</h1>
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
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:opacity-50"
                        >
                            {loading ? 'Menyimpan...' : 'Simpan Mutasi'}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    )
}
