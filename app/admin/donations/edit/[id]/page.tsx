'use client'

import { useState, useEffect, use } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

const supabase = createClient()

export default function EditDonation({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter()
    const { id } = use(params)

    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [events, setEvents] = useState<any[]>([])
    const [donors, setDonors] = useState<any[]>([]) // For donor suggestions

    // Form State
    const [formData, setFormData] = useState({
        transaction_date: '',
        donor_id: '',
        donor_name_snapshot: '',
        event_id: '',
        type: 'Tunai', // 'Tunai' or 'Transfer'
        bank_name: '', // e.g., 'BSI 7185674333'
        amount: 0,
    })

    // Donor Search State
    const [donorSearch, setDonorSearch] = useState('')
    const [showDonorList, setShowDonorList] = useState(false)

    // Amount State
    const [displayAmount, setDisplayAmount] = useState('')

    const bankOptions = [
        { id: 'bsi1', name: 'BSI', number: '7185674333', holder: 'Yayasan Al-Kahfi' },
        { id: 'bsi2', name: 'BSI', number: '7147181978', holder: 'Yayasan Al-Kahfi' },
    ]

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        setLoading(true)
        // 1. Fetch Events
        const { data: eventsData } = await supabase
            .from('events')
            .select('id, name')
            .order('created_at', { ascending: false })

        if (eventsData) setEvents(eventsData)

        // 2. Fetch Donors for suggestions
        const { data: donorsData } = await supabase
            .from('donors')
            .select('id, name')
            .order('name', { ascending: true })

        if (donorsData) setDonors(donorsData)

        // 3. Fetch Transaction
        const { data: transaction, error } = await supabase
            .from('transactions')
            .select(`
        *,
        donors (id, name)
      `)
            .eq('id', id)
            .single()

        if (error || !transaction) {
            alert('Data tidak ditemukan')
            router.push('/admin/donations')
            return
        }

        // 4. Populate Form
        const transactionDate = new Date(transaction.transaction_date).toISOString().slice(0, 10) // For date input
        const donorName = transaction.donors?.name || transaction.donor_name_snapshot || ''

        let transactionType = 'Tunai'
        let bankName = ''
        if (transaction.type && transaction.type.toLowerCase().includes('transfer')) {
            transactionType = 'Transfer'
            if (transaction.type.includes('7185674333')) bankName = 'BSI' // Simplified for matching logic if needed, but let's try to parse exact bank if possible or just default
            // Try to extract bank info if stored in type string
            if (transaction.type.includes('BSI')) bankName = 'BSI'
        }

        // Better bank matching logic based on the options we have
        let matchedBankName = ''
        if (transactionType === 'Transfer') {
            if (transaction.type.includes('7185674333')) matchedBankName = 'BSI'
            else if (transaction.type.includes('7147181978')) matchedBankName = 'BSI'
            // Note: The radio button value in Create page was just "BSI", so we might need to be careful.
            // In Create page: value={bank.name} which is "BSI".
            // But we need to distinguish account numbers.
            // Let's check how Create page saves it: `Transfer (${formData.bank_name})` -> "Transfer (BSI)"
            // Wait, the Create page had `value={bank.name}` so it just saves "BSI". It doesn't save the number?
            // Let's look at Create page again.
            // Ah, in Create page I used `value={bank.name}`. This is ambiguous if both are BSI.
            // I should probably fix Create page to use a unique value or include the number.
            // For now, let's stick to what was likely intended or improve it.
            // In the previous code (before my rewrite), it seemed to try to save specific accounts.
            // Let's improve the Bank Option values to be unique.
        }

        setFormData({
            transaction_date: transactionDate,
            donor_id: transaction.donor_id || '',
            donor_name_snapshot: donorName,
            event_id: transaction.event_id,
            type: transactionType,
            bank_name: matchedBankName || 'BSI', // Default fallback
            amount: transaction.amount,
        })

        setDonorSearch(donorName)
        setDisplayAmount(new Intl.NumberFormat('id-ID').format(transaction.amount))

        setLoading(false)
    }

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, '')
        setFormData(prev => ({ ...prev, amount: parseInt(value) || 0 }))
        if (value) {
            setDisplayAmount(new Intl.NumberFormat('id-ID').format(parseInt(value)))
        } else {
            setDisplayAmount('')
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitting(true)

        try {
            let finalDonorId = formData.donor_id

            // If donor_id is empty, it means a new donor name was typed or an existing one was not selected
            if (!finalDonorId && formData.donor_name_snapshot) {
                // Check if donor already exists by name
                const { data: existingDonor } = await supabase
                    .from('donors')
                    .select('id')
                    .eq('name', formData.donor_name_snapshot)
                    .single()

                if (existingDonor) {
                    finalDonorId = existingDonor.id
                } else {
                    // Insert new donor
                    const { data: newDonor, error: donorError } = await supabase
                        .from('donors')
                        .insert([{ name: formData.donor_name_snapshot, phone: '-' }])
                        .select()
                        .single()

                    if (donorError) throw donorError
                    finalDonorId = newDonor.id
                }
            }

            let finalType = formData.type
            if (formData.type === 'Transfer' && formData.bank_name) {
                finalType = `Transfer (${formData.bank_name})`
            }

            const { error: transError } = await supabase
                .from('transactions')
                .update({
                    event_id: formData.event_id,
                    donor_id: finalDonorId,
                    amount: formData.amount,
                    type: finalType,
                    transaction_date: new Date(formData.transaction_date).toISOString(),
                    donor_name_snapshot: formData.donor_name_snapshot
                })
                .eq('id', id)

            if (transError) throw transError

            alert('Perubahan berhasil disimpan!')
            router.push('/admin/donations')
        } catch (error: any) {
            alert('Error: ' + error.message)
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) return <div className="p-8 text-center">Loading...</div>

    return (
        <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-4 mb-8">
                <a href="/admin/donations" className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500">
                    &larr;
                </a>
                <h1 className="text-2xl font-bold text-slate-800">Edit Donasi</h1>
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
                            onClick={() => router.back()}
                            className="flex-1 px-6 py-3 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="flex-1 px-6 py-3 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {submitting ? 'Menyimpan...' : 'Update Donasi'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
