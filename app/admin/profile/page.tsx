'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

const supabase = createClient()

export default function Profile() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [user, setUser] = useState<any>(null)

    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        password: ''
    })

    useEffect(() => {
        fetchProfile()
    }, [])

    const fetchProfile = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            router.push('/admin/login')
            return
        }
        setUser(user)

        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single()

        if (profile) {
            setFormData({
                full_name: profile.full_name || '',
                email: user.email || '',
                password: ''
            })
        }
        setLoading(false)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitting(true)

        try {
            // Update profile
            const { error: profileError } = await supabase
                .from('profiles')
                .update({ full_name: formData.full_name })
                .eq('id', user.id)

            if (profileError) throw profileError

            // Update password if provided
            if (formData.password) {
                const { error: authError } = await supabase.auth.updateUser({
                    password: formData.password
                })
                if (authError) throw authError
            }

            alert('Profil berhasil diperbarui!')
            setFormData(prev => ({ ...prev, password: '' }))
        } catch (error: any) {
            alert('Error: ' + error.message)
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) return <div className="p-8 text-center">Loading...</div>

    return (
        <div className="max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold text-slate-800 mb-8">Profil Saya</h1>

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

                    {/* Email */}
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
                    <div className="pt-4 border-t border-slate-100">
                        <h3 className="text-sm font-semibold text-slate-800 mb-4">Ganti Password</h3>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Password Baru</label>
                        <input
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                            placeholder="Kosongkan jika tidak ingin mengubah password"
                            minLength={6}
                        />
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-4 pt-4 mt-8">
                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full px-6 py-3 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {submitting ? 'Menyimpan...' : 'Simpan Perubahan'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
