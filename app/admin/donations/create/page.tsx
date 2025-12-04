'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

const supabase = createClient()

export default function CreateDonation() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [events, setEvents] = useState<any[]>([])

    // Form State
    const [formData, setFormData] = useState({
        transaction_date: new Date().toISOString().slice(0, 10), // For date input
        donor_id: '',
        donor_name_snapshot: '',
        event_id: '',
        type: 'Tunai', // 'Tunai' or 'Transfer'
        bank_name: '', // Only for transfer
        amount: 0,
    })

    // Donor Search State
    const [donorSearch, setDonorSearch] = useState('')
    const [donors, setDonors] = useState<any[]>([])
    const [showDonorList, setShowDonorList] = useState(false)

    // Amount Display State
    const [displayAmount, setDisplayAmount] = useState('')

    // Bank Options
    const bankOptions = [
        { id: 'bsi1', name: 'BSI', number: '7185674333', holder: 'Yayasan Al-Kahfi' },
        { id: 'bsi2', name: 'BSI', number: '7147181978', holder: 'Yayasan Al-Kahfi' },
    ]

    useEffect(() => {
        fetchEvents()
        fetchDonors()
    }, [])

    // Fetch active events
    const fetchEvents = async () => {
        const { data } = await supabase
            .from('events')
            .select('id, name')
            .order('created_at', { ascending: false })

        if (data && data.length > 0) {
            setEvents(data)
            setFormData(prev => ({ ...prev, event_id: data[0].id })) // Default to newest event
        }
    }

    // Fetch all donors for initial suggestion list
    const fetchDonors = async () => {
        const { data } = await supabase
            .from('donors')
            .select('id, name')
            .order('name', { ascending: true })
            .limit(100) // Limit to a reasonable number for initial load

        if (data) setDonors(data)
    }

    // Handle amount input formatting
    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, '') // Remove non-digits
        const numericValue = parseInt(value || '0', 10)

        setFormData(prev => ({ ...prev, amount: numericValue }))
        setDisplayAmount(value ? new Intl.NumberFormat('id-ID').format(numericValue) : '')
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            let finalDonorId = formData.donor_id

            // 1. If no existing donor selected (donor_id is empty), create new one
            if (!finalDonorId && formData.donor_name_snapshot) {
                const { data: newDonor, error: donorError } = await supabase
                    .from('donors')
                    .insert([{ name: formData.donor_name_snapshot, phone: '-' }]) // Assuming phone is optional or can be default
                    .select()
                    .single()

                if (donorError) throw donorError
                finalDonorId = newDonor.id
            } else if (!finalDonorId && !formData.donor_name_snapshot) {
                throw new Error('Nama donatur tidak boleh kosong.')
            }

            // 2. Determine Type string for transaction record
            let transactionType = formData.type
            if (formData.type === 'Transfer' && formData.bank_name) {
                transactionType = `Transfer (${formData.bank_name})`
            }

            // 3. Create Transaction
            const { error: transError } = await supabase
                .from('transactions')
                .insert({
                    event_id: formData.event_id,
                    donor_id: finalDonorId,
                    amount: formData.amount,
                    type: transactionType,
                    transaction_date: new Date(formData.transaction_date).toISOString(),
                    donor_name_snapshot: formData.donor_name_snapshot
                })

            if (transError) throw transError

            alert('Donasi berhasil disimpan!')
            router.push('/admin/donations')
        } catch (error: any) {
            alert('Error: ' + error.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-4 mb-8">
                <a href="/admin/donations" className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500">
                    &larr;
                </a>
                <h1 className="text-2xl font-bold text-slate-800">Catat Donasi Baru</h1>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 md:p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Tanggal */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Tanggal</label>
                        <input
                            type="date"
                            value={formData.transaction_date}
                            onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                            required
                        />
                    </div>

                    {/* Donatur */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Nama Donatur</label>
                        <div className="relative">
                            <input
                                type="text"
                                value={donorSearch}
                                onChange={(e) => {
                                    setDonorSearch(e.target.value)
                                    setFormData({ ...formData, donor_id: '', donor_name_snapshot: e.target.value })
                                    setShowDonorList(true)
                                }}
                                onFocus={() => setShowDonorList(true)}
                                placeholder="Ketik nama donatur..."
                                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                                required
                            />
                            {showDonorList && donorSearch && (
                                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                    {donors
                                        .filter(d => d.name.toLowerCase().includes(donorSearch.toLowerCase()))
                                        .map(d => (
                                            <div
                                                key={d.id}
                                                onClick={() => {
                                                    setFormData({ ...formData, donor_id: d.id, donor_name_snapshot: d.name })
                                                    setDonorSearch(d.name)
                                                    setShowDonorList(false)
                                                }}
                                                className="px-4 py-3 hover:bg-emerald-50 cursor-pointer text-slate-700 border-b border-slate-50 last:border-0"
                                            >
                                                {d.name}
                                            </div>
                                        ))}
                                    <div
                                        onClick={() => setShowDonorList(false)}
                                        className="px-4 py-3 hover:bg-slate-50 cursor-pointer text-emerald-600 font-medium border-t border-slate-100"
                                    >
                                        + Gunakan "{donorSearch}" sebagai nama baru
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Event */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Program / Event</label>
                        <select
                            value={formData.event_id}
                            onChange={(e) => setFormData({ ...formData, event_id: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all bg-white"
                            required
                        >
                            <option value="">Pilih Event</option>
                            {events.map(e => (
                                <option key={e.id} value={e.id}>{e.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Metode Pembayaran */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Metode Pembayaran</label>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, type: 'Tunai', bank_name: '' })}
                                className={`px-4 py-3 rounded-lg border transition-all font-medium ${formData.type === 'Tunai'
                                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700 ring-1 ring-emerald-500'
                                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                                    }`}
                            >
                                💵 Tunai
                            </button>
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, type: 'Transfer' })}
                                className={`px-4 py-3 rounded-lg border transition-all font-medium ${formData.type === 'Transfer'
                                    ? 'bg-blue-50 border-blue-500 text-blue-700 ring-1 ring-blue-500'
                                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                                    }`}
                            >
                                💳 Transfer
                            </button>
                        </div>
                    </div>

                    {/* Bank Selection (Only if Transfer) */}
                    {formData.type === 'Transfer' && (
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 animate-in fade-in slide-in-from-top-2 duration-200">
                            <label className="block text-sm font-medium text-slate-700 mb-2">Pilih Bank Tujuan</label>
                            <div className="space-y-2">
                                {bankOptions.map((bank) => (
                                    <label
                                        key={bank.id}
                                        className={`flex items-center p-3 border rounded-lg cursor-pointer transition-all ${formData.bank_name === bank.name
                                            ? 'bg-white border-blue-500 ring-1 ring-blue-500 shadow-sm'
                                            : 'bg-white border-slate-200 hover:border-blue-300'
                                            }`}
                                    >
                                        <input
                                            type="radio"
                                            name="bank"
                                            value={bank.name}
                                            checked={formData.bank_name === bank.name}
                                            onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                                            className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                                        />
                                        <div className="ml-3">
                                            <span className="block text-sm font-medium text-slate-900">{bank.name}</span>
                                            <span className="block text-xs text-slate-500">{bank.number} a.n {bank.holder}</span>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Jumlah Donasi */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Jumlah Donasi (Rp)</label>
                        <input
                            type="text"
                            value={displayAmount}
                            onChange={handleAmountChange}
                            className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-lg font-semibold text-slate-800"
                            placeholder="0"
                            required
                        />
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-4 pt-4 border-t border-slate-100 mt-8">
                        <button
                            type="button"
                            onClick={() => window.history.back()}
                            className="flex-1 px-6 py-3 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-6 py-3 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Menyimpan...' : 'Simpan Donasi'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
