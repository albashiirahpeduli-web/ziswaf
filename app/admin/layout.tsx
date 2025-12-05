'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

const supabase = createClient()

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const router = useRouter()
    const [isSidebarOpen, setSidebarOpen] = useState(false) // Default closed for mobile
    const [role, setRole] = useState<string | null>(null)

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (session) {
                fetchRole(session.user.id)
            } else {
                setRole(null)
            }
        })

        return () => subscription.unsubscribe()
    }, [])

    const fetchRole = async (userId: string) => {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', userId)
            .single()
        if (profile) {
            setRole(profile.role)
        }
    }

    // Auto-logout logic
    const [lastActivity, setLastActivity] = useState(Date.now())

    useEffect(() => {
        // Events to track activity
        const events = ['mousemove', 'keydown', 'click', 'scroll']

        const resetTimer = () => {
            setLastActivity(Date.now())
        }

        // Add listeners
        events.forEach(event => {
            window.addEventListener(event, resetTimer)
        })

        // Check for inactivity every minute
        const interval = setInterval(() => {
            const now = Date.now()
            const timeSinceLastActivity = now - lastActivity
            const MAX_INACTIVITY = 10 * 60 * 1000 // 10 minutes

            if (timeSinceLastActivity >= MAX_INACTIVITY) {
                handleLogout()
            }
        }, 60 * 1000) // Check every minute

        return () => {
            events.forEach(event => {
                window.removeEventListener(event, resetTimer)
            })
            clearInterval(interval)
        }
    }, [lastActivity])

    // If we are on the login page, don't show the layout shell
    if (pathname === '/admin/login') {
        return <>{children}</>
    }

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/admin/login')
    }

    const menuItems = [
        { name: 'Dashboard', href: '/admin/dashboard', icon: '📊' },
        { name: 'Donasi', href: '/admin/donations', icon: '💰' },
        { name: 'Events', href: '/admin/events', icon: '📅' },
        { name: 'Pengeluaran', href: '/admin/disbursements', icon: '💸' },
        { name: 'Mutasi Saldo', href: '/admin/mutations', icon: '🔄' },
        { name: 'Users', href: '/admin/users', icon: '👥', adminOnly: true },
        { name: 'Profil Saya', href: '/admin/profile', icon: '👤' },
    ]

    const filteredMenuItems = menuItems.filter(item => {
        if (item.adminOnly) return role?.toLowerCase() === 'admin'
        return true
    })

    return (
        <div className="h-screen overflow-hidden bg-slate-50 flex font-sans">
            {/* Mobile Backdrop */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`bg-white border-r border-slate-200 fixed inset-y-0 left-0 z-50 w-72 transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
                    } lg:static lg:inset-auto lg:translate-x-0 flex flex-col`}
            >
                {/* Logo Area */}
                <div className="h-20 flex items-center px-8 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-emerald-200">
                            Z
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-800 tracking-tight">Ziswaf Admin</h1>
                            <p className="text-xs text-slate-500 font-medium">Al Bashiirah</p>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
                    {filteredMenuItems.map((item) => {
                        const isActive = pathname === item.href
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setSidebarOpen(false)} // Close sidebar on mobile click
                                className={`group flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 ${isActive
                                    ? 'bg-emerald-50 text-emerald-700 font-semibold shadow-sm ring-1 ring-emerald-100'
                                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 font-medium'
                                    }`}
                            >
                                <span className={`text-xl transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
                                    {item.icon}
                                </span>
                                <span>{item.name}</span>
                                {isActive && (
                                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                )}
                            </Link>
                        )
                    })}
                </nav>

                {/* User Profile / Logout */}
                <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-3 w-full text-left text-slate-600 hover:bg-white hover:text-red-600 hover:shadow-sm hover:ring-1 hover:ring-slate-200 rounded-xl transition-all duration-200 group"
                    >
                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center group-hover:bg-red-50 transition-colors">
                            <span className="text-sm">🚪</span>
                        </div>
                        <span className="font-medium">Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50">
                {/* Mobile Header */}
                <div className="lg:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between shadow-sm sticky top-0 z-30">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-bold shadow-md">Z</div>
                        <h1 className="font-bold text-slate-800">Ziswaf Admin</h1>
                    </div>
                    <button
                        onClick={() => setSidebarOpen(!isSidebarOpen)}
                        className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                </div>

                <div className="flex-1 flex flex-col overflow-hidden p-4 lg:p-8">
                    <div className="max-w-7xl mx-auto w-full h-full flex flex-col">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    )
}
