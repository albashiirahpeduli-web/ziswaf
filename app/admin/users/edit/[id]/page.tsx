'use client'

import { useState, useEffect, use } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

const supabase = createClient()

export default function EditUser({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter()
    const { id } = use(params)
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [isAdmin, setIsAdmin] = useState(false)

    const [formData, setFormData] = useState({
        email: '',
        full_name: '',
        role: 'staff',
        password: '' // Optional for update
    })

    useEffect(() => {
        checkAdminRole()
    }, [])

    const checkAdminRole = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            router.push('/admin/login')
            return
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (profile?.role !== 'admin') {
            alert('Akses ditolak. Hanya admin yang bisa mengedit pengguna.')
            router.push('/admin/dashboard')
        } else {
            setIsAdmin(true)
            fetchUser()
        }
    }

    const fetchUser = async () => {
        // Fetch profile data
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', id)
            .single()

        if (error) {
            alert('Pengguna tidak ditemukan')
            router.push('/admin/users')
            return
        }

        setFormData({
            email: profile.email || '',
            full_name: profile.full_name || '',
            role: profile.role || 'staff',
            password: ''
        })
        setLoading(false)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitting(true)

        try {
            const res = await fetch('/api/admin/users', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id,
                    ...formData
                })
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Gagal update pengguna')

            alert('Pengguna berhasil diperbarui!')
            router.push('/admin/users')
        } catch (error: any) {
            alert('Error: ' + error.message)
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) return <div className="p-8 text-center">Loading...</div>
    if (!isAdmin) return null

    return (
        <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-4 mb-8">
                <a href="/admin/users" className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500">
                    &larr;
                </a>
                <h1 className="text-2xl font-bold text-slate-800">Edit Pengguna</h1>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 md:p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Nama Lengkap */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Nama Lengkap</label>
                        <input
                            type="text"
                            value={formData.full_name}
                            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                            required
                        />
                    </div>

                    {/* Email (Read Only usually, but let's allow edit if needed via API) */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                        <input
                            type="email"
                            value={formData.email}
                            disabled
                            className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed"
                        />
                        <p className="text-xs text-slate-400 mt-1">Email tidak dapat diubah.</p>
                    </div>

                    {/* Password */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Password Baru (Opsional)</label>
                        <input
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                            placeholder="Kosongkan jika tidak ingin mengubah password"
                            minLength={6}
                        />
                    </div>

                    {/* Role */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Role / Hak Akses</label>
                        <select
                            value={formData.role}
                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all bg-white"
                        >
                            <option value="staff">Staff (Terbatas)</option>
                            <option value="admin">Admin (Penuh)</option>
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
                            disabled={submitting}
                            className="flex-1 px-6 py-3 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {submitting ? 'Menyimpan...' : 'Update Pengguna'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
