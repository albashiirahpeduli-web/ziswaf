'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

const supabase = createClient()

export default function CreateEvent() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        target_amount: 0,
        start_date: '',
        end_date: '',
        status: 'active'
    })

    const [displayAmount, setDisplayAmount] = useState('')

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, '')
        const numericValue = parseInt(value || '0', 10)
        setFormData({ ...formData, target_amount: numericValue })
        setDisplayAmount(value ? new Intl.NumberFormat('id-ID').format(numericValue) : '')
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const { error } = await supabase
                .from('events')
                .insert([formData])

            if (error) throw error

            alert('Event berhasil dibuat!')
            router.push('/admin/events')
        } catch (error: any) {
            alert('Error: ' + error.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-4 mb-8">
                <a href="/admin/events" className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500">
                    &larr;
                </a>
                <h1 className="text-2xl font-bold text-slate-800">Buat Event Baru</h1>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 md:p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Nama Event */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Nama Event</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                            placeholder="Contoh: Wakaf Masjid Al-Barakah"
                            required
                        />
                    </div>

                    {/* Deskripsi */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Deskripsi</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all h-32"
                            placeholder="Deskripsi singkat mengenai event ini..."
                        />
                    </div>

                    {/* Target Donasi */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Target Donasi (Rp)</label>
                        <input
                            type="text"
                            value={displayAmount}
                            onChange={handleAmountChange}
                            className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-lg font-semibold text-slate-800"
                            placeholder="0"
                        />
                        <p className="text-xs text-slate-500 mt-1">Biarkan 0 jika tidak ada target spesifik.</p>
                    </div>

                    {/* Tanggal Mulai & Selesai */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Tanggal Mulai</label>
                            <input
                                type="date"
                                value={formData.start_date}
                                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Tanggal Selesai</label>
                            <input
                                type="date"
                                value={formData.end_date}
                                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                            />
                        </div>
                    </div>

                    {/* Status */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
                        <select
                            value={formData.status}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all bg-white"
                        >
                            <option value="active">Aktif</option>
                            <option value="completed">Selesai</option>
                            <option value="cancelled">Dibatalkan</option>
                        </select>
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
                            disabled={loading}
                            className="flex-1 px-6 py-3 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Menyimpan...' : 'Buat Event'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
