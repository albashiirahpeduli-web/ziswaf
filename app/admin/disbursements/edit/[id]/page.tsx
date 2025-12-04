'use client'

import { useState, useEffect, use } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

const supabase = createClient()

export default function EditDisbursement({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter()
    const { id } = use(params)
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)

    const [formData, setFormData] = useState({
        description: '',
        amount: 0,
        disbursement_date: '',
        recipient: '',
        method: 'Tunai',
        category: 'Operasional',
        notes: ''
    })

    const [displayAmount, setDisplayAmount] = useState('')

    useEffect(() => {
        fetchDisbursement()
    }, [])

    const fetchDisbursement = async () => {
        const { data, error } = await supabase
            .from('disbursements')
            .select('*')
            .eq('id', id)
            .single()

        if (error) {
            alert('Data tidak ditemukan')
            router.push('/admin/disbursements')
            return
        }

        setFormData({
            description: data.description,
            amount: data.amount,
            disbursement_date: new Date(data.disbursement_date).toISOString().slice(0, 16),
            recipient: data.recipient || '',
            method: data.method || 'Tunai',
            category: data.category || 'Operasional',
            notes: data.notes || ''
        })
        setDisplayAmount(new Intl.NumberFormat('id-ID').format(data.amount))
        setLoading(false)
    }

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, '')
        const numericValue = parseInt(value || '0', 10)
        setFormData({ ...formData, amount: numericValue })
        setDisplayAmount(value ? new Intl.NumberFormat('id-ID').format(numericValue) : '')
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitting(true)

        try {
            const { error } = await supabase
                .from('disbursements')
                .update({
                    ...formData,
                    disbursement_date: new Date(formData.disbursement_date).toISOString()
                })
                .eq('id', id)

            if (error) throw error

            alert('Data berhasil diperbarui!')
            router.push('/admin/disbursements')
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
                <a href="/admin/disbursements" className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500">
                    &larr;
                </a>
                <h1 className="text-2xl font-bold text-slate-800">Edit Penyaluran</h1>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 md:p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Deskripsi */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Deskripsi Penyaluran</label>
                        <input
                            type="text"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                            required
                        />
                    </div>

                    {/* Kategori */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Kategori</label>
                        <select
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all bg-white"
                        >
                            <option value="Operasional">Operasional</option>
                            <option value="Penyaluran Zakat">Penyaluran Zakat</option>
                            <option value="Penyaluran Infaq">Penyaluran Infaq</option>
                            <option value="Penyaluran Wakaf">Penyaluran Wakaf</option>
                            <option value="Lainnya">Lainnya</option>
                        </select>
                    </div>

                    {/* Jumlah */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Jumlah (Rp)</label>
                        <input
                            type="text"
                            value={displayAmount}
                            onChange={handleAmountChange}
                            className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-lg font-semibold text-slate-800"
                            placeholder="0"
                            required
                        />
                    </div>

                    {/* Tanggal */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Tanggal & Waktu</label>
                        <input
                            type="datetime-local"
                            value={formData.disbursement_date}
                            onChange={(e) => setFormData({ ...formData, disbursement_date: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                            required
                        />
                    </div>

                    {/* Penerima */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Penerima</label>
                        <input
                            type="text"
                            value={formData.recipient}
                            onChange={(e) => setFormData({ ...formData, recipient: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                            placeholder="Nama penerima atau lembaga..."
                            required
                        />
                    </div>

                    {/* Metode */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Metode Penyaluran</label>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, method: 'Tunai' })}
                                className={`px-4 py-3 rounded-lg border transition-all font-medium ${formData.method === 'Tunai'
                                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700 ring-1 ring-emerald-500'
                                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                                    }`}
                            >
                                💵 Tunai
                            </button>
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, method: 'Transfer' })}
                                className={`px-4 py-3 rounded-lg border transition-all font-medium ${formData.method === 'Transfer'
                                    ? 'bg-blue-50 border-blue-500 text-blue-700 ring-1 ring-blue-500'
                                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                                    }`}
                            >
                                💳 Transfer
                            </button>
                        </div>
                    </div>

                    {/* Catatan */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Catatan Tambahan</label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all h-24"
                            placeholder="Keterangan tambahan..."
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
                            {submitting ? 'Menyimpan...' : 'Update Penyaluran'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
