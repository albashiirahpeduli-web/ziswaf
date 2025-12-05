'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

// Types
type Event = {
  id: string
  name: string
  description: string | null
  start_date: string | null
  end_date: string | null
}

type DonationStats = {
  totalAmount: number
  totalDonors: number
}

type Transaction = {
  id: string
  donor_name_snapshot: string
  amount: number
  transaction_date: string
  type: string
}

export default function Home() {
  const [activeEvent, setActiveEvent] = useState<Event | null>(null)
  const [stats, setStats] = useState<DonationStats>({ totalAmount: 0, totalDonors: 0 })
  const [recentDonations, setRecentDonations] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [showBannerModal, setShowBannerModal] = useState(false)

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)
  const [viewMode, setViewMode] = useState<'summary' | 'paginated'>('summary')
  const ITEMS_PER_PAGE = 20
  const MAX_ITEMS = 50

  useEffect(() => {
    fetchData()

    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    if (activeEvent && viewMode === 'paginated') {
      fetchHistory(currentPage)
    }
  }, [currentPage, viewMode, activeEvent])

  async function fetchData() {
    try {
      // 1. Get Active Event
      const { data: events } = await supabase
        .from('events')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)

      if (events && events.length > 0) {
        const event = events[0]
        setActiveEvent(event)

        // 2. Get Stats for this event
        const { data: transactions } = await supabase
          .from('transactions')
          .select('amount, donor_id')
          .eq('event_id', event.id)

        if (transactions) {
          const totalAmount = transactions.reduce((sum, t) => sum + (t.amount || 0), 0)
          const totalDonors = transactions.length
          setStats({ totalAmount, totalDonors })
        }

        // 3. Get Initial Recent Donations (Summary)
        fetchHistory(1, true, event.id)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchHistory(page: number, isInitial = false, eventId?: string) {
    const id = eventId || activeEvent?.id
    if (!id) return

    const start = (page - 1) * ITEMS_PER_PAGE
    const end = start + ITEMS_PER_PAGE - 1
    const effectiveEnd = isInitial ? 9 : Math.min(end, MAX_ITEMS - 1)

    if (start >= MAX_ITEMS) return

    // Strategy: 
    // 1. Fetch "Pinned" donations (SDIT Albashiirah)
    // 2. Fetch "Recent" donations normally (up to MAX_ITEMS)
    // 3. Merge, Deduplicate, Sort (Pinned first), then Slice

    const { data: pinned } = await supabase
      .from('transactions')
      .select('*')
      .eq('event_id', id)
      .ilike('donor_name_snapshot', '%SDIT Albashiirah%')
      .order('transaction_date', { ascending: false })
      .limit(MAX_ITEMS)

    const { data: recent } = await supabase
      .from('transactions')
      .select('*')
      .eq('event_id', id)
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(MAX_ITEMS)

    if (pinned || recent) {
      const all = [...(pinned || []), ...(recent || [])]

      // Deduplicate by ID
      const unique = Array.from(new Map(all.map(item => [item.id, item])).values())

      // Sort: Pinned first, then by Date
      unique.sort((a, b) => {
        const isAPinned = a.donor_name_snapshot?.toLowerCase().includes('sdit albashiirah')
        const isBPinned = b.donor_name_snapshot?.toLowerCase().includes('sdit albashiirah')

        if (isAPinned && !isBPinned) return -1
        if (!isAPinned && isBPinned) return 1

        // If both pinned or both not pinned, sort by date desc
        return new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime()
      })

      // Apply Pagination Slice
      // Note: effectiveEnd is an index, slice end is exclusive, so +1
      const paginated = unique.slice(start, effectiveEnd + 1)

      setRecentDonations(paginated)
    }
  }

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 font-sans text-gray-900 relative">
      {/* Navbar / Header */}
      <div className="bg-green-700 text-white py-4 md:py-6 px-4 shadow-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center gap-3 md:gap-4">
          <img
            src="/logo.png"
            alt="Logo"
            className="w-10 h-10 md:w-16 md:h-16 object-contain bg-white rounded-full p-1"
          />
          <div>
            <h1 className="text-lg md:text-2xl lg:text-3xl font-bold leading-tight">Ziswaf Al Bashiirah</h1>
            <p className="text-xs md:text-sm lg:text-base opacity-90">Laporan Penerimaan Donasi</p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 md:py-8">

        {/* Hero Section: Split Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 mb-8 md:mb-12 items-stretch">

          {/* Left: Info & Stats */}
          <div className="flex flex-col justify-center space-y-4 md:space-y-6">
            <div className="bg-white rounded-2xl shadow-sm p-5 md:p-6 border border-gray-100">
              <h2 className="text-sm text-green-600 font-semibold tracking-wide uppercase mb-1">
                Aksi Tanggap Nasional Ziswaf Al Bashiirah Peduli
              </h2>
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-3">
                {activeEvent?.name || 'Memuat Event...'}
              </h2>

              {activeEvent?.start_date && activeEvent?.end_date && (
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <div className="flex items-center gap-2 text-sm md:text-base text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="font-medium">
                      {new Date(activeEvent.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                      {' - '}
                      {new Date(activeEvent.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  </div>

                  {(() => {
                    const end = new Date(activeEvent.end_date);
                    const now = new Date();
                    // Normalize to midnight
                    const endMidnight = new Date(end.getFullYear(), end.getMonth(), end.getDate());
                    const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    const diffTime = endMidnight.getTime() - nowMidnight.getTime();
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                    if (diffDays < 0) return <span className="text-sm font-bold text-red-600 bg-red-50 px-3 py-1.5 rounded-lg border border-red-100">Selesai</span>;
                    return (
                      <div className="flex items-center gap-1.5 text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{diffDays} Hari Lagi</span>
                      </div>
                    );
                  })()}
                </div>
              )}

              <p className="text-gray-600 text-base md:text-lg leading-relaxed text-center md:text-left italic">
                {activeEvent?.description || '"Barangsiapa yang meringankan satu kesusahan seorang muslim, maka Allah akan menghilangkan satu kesusahan baginya dari kesusahan-kesusahan hari kiamat" (HR. Al-Bukhari).'}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Stats Cards */}

              <div className="bg-green-600 text-white p-6 rounded-2xl shadow-lg transform hover:scale-[1.02] transition-transform flex flex-col justify-center h-full relative overflow-hidden group gap-4">
                {/* Decorative Icon */}
                <div className="absolute top-0 right-0 -mt-6 -mr-6 opacity-10 group-hover:opacity-20 transition-opacity">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-32 w-32" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>

                <div className="relative z-10">
                  <p className="text-green-100 font-semibold mb-2 uppercase tracking-wider text-xs md:text-sm">Total Donasi</p>
                  <div className="flex flex-wrap items-baseline gap-1">
                    <span className="text-xl md:text-2xl font-medium opacity-80">Rp</span>
                    <span className="text-3xl md:text-4xl font-bold tracking-tight break-all">
                      {stats.totalAmount.toLocaleString('id-ID')}
                    </span>
                  </div>
                  <p className="text-green-50 text-xs mt-2 opacity-90 font-medium">
                    Donasi diterima dari para Muhsinin, Siswa/Siswa(walimurid) dan Guru/Pegawai SDIT Albashiirah
                  </p>
                </div>
              </div>
              <div className="bg-yellow-500 text-white p-5 md:p-6 rounded-2xl shadow-lg transform hover:scale-105 transition-transform flex flex-col justify-between h-full relative overflow-hidden">
                {/* Decorative Icon */}
                <div className="absolute top-0 right-0 -mt-4 -mr-4 opacity-10">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>

                <div>
                  <p className="text-yellow-100 font-medium mb-3 uppercase tracking-wider text-xs md:text-sm">Rekening Donasi</p>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-xl md:text-2xl">BSI</span>
                    <span className="font-bold text-xl md:text-2xl tracking-wide">718 567 4333</span>
                  </div>
                  <p className="text-sm md:text-base opacity-90 mb-4">a.n Yayasan Islam Albashiirah</p>
                </div>

                <div className="mt-auto pt-4 border-t border-yellow-400/30">
                  <a
                    href="https://wa.me/6281324796668"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm font-medium hover:underline group"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.008-.57-.008-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                    </svg>
                    Konfirmasi: 081324796668
                  </a>
                  <p className="text-xs mt-1 opacity-80">(a.n Sopyan Abu Hudzaifah)</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Banner Image */}
          <div
            className="rounded-2xl overflow-hidden shadow-xl h-[200px] sm:h-[300px] lg:h-auto lg:min-h-[350px] relative group order-first lg:order-last cursor-pointer"
            onClick={() => setShowBannerModal(true)}
          >
            <img
              src="/banner.jpg"
              alt="Banner Donasi"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-6">
              <p className="text-white font-semibold text-sm md:text-base">Salurkan bantuan terbaik anda</p>
            </div>
          </div>

        </div>

        {/* Recent Donations */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden max-w-4xl mx-auto border border-gray-100">
          <div className="px-4 md:px-6 py-4 border-b border-gray-100 bg-gray-50 flex flex-wrap justify-between items-center gap-3">
            <div className="flex items-center gap-3">
              <h3 className="text-base md:text-lg lg:text-xl font-bold text-gray-800">Riwayat Donasi Terbaru</h3>
              <div className="bg-yellow-100 text-yellow-800 text-xs md:text-sm font-bold px-3 py-1 rounded-full border border-yellow-200 flex items-center gap-1">
                <span>{stats.totalDonors}</span>
                <span className="font-normal">Muhsinin</span>
              </div>
            </div>
            <span className="text-[10px] md:text-xs font-medium text-gray-500 bg-gray-200 px-2 py-1 rounded-full">Realtime</span>
          </div>
          <div className="divide-y divide-gray-100">
            {recentDonations.length === 0 ? (
              <p className="p-8 text-center text-gray-500 italic text-sm md:text-base">Belum ada donasi tercatat untuk event ini.</p>
            ) : (
              recentDonations.map((t) => (
                <div key={t.id} className="p-4 md:p-6 flex items-start sm:items-center justify-between hover:bg-green-50 transition-colors group gap-3">
                  <div className="flex items-start sm:items-center gap-3 md:gap-4 flex-1 min-w-0">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-green-100 flex-shrink-0 flex items-center justify-center text-green-600 group-hover:bg-green-200 transition-colors mt-1 sm:mt-0">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 md:h-5 md:w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-gray-800 text-sm md:text-base truncate">
                        {(t.donor_name_snapshot && t.donor_name_snapshot.toLowerCase().includes('sdit albashiirah'))
                          ? t.donor_name_snapshot
                          : 'Hamba Alloh'}
                      </p>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-[10px] md:text-xs text-gray-500 mt-0.5">
                        <span className="whitespace-nowrap">
                          {new Date(t.transaction_date).toLocaleDateString('id-ID', {
                            day: 'numeric', month: 'long', year: 'numeric'
                          })}
                        </span>
                        <span className="hidden sm:inline">•</span>
                        <span className="capitalize bg-gray-100 px-2 py-0.5 rounded text-gray-600 w-fit truncate max-w-full">
                          {t.type}
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="font-bold text-green-700 text-sm md:text-lg lg:text-xl whitespace-nowrap flex-shrink-0 mt-1 sm:mt-0">
                    Rp {t.amount.toLocaleString('id-ID')}
                  </p>
                </div>
              ))
            )}
          </div>

          {/* Footer / Pagination */}
          <div className="p-4 bg-gray-50 border-t border-gray-100 text-center">
            {viewMode === 'summary' ? (
              <button
                onClick={() => setViewMode('paginated')}
                className="text-green-700 font-semibold text-sm md:text-base hover:text-green-800 hover:underline"
              >
                Lihat Lebih Banyak
              </button>
            ) : (
              <div className="flex justify-center items-center gap-4">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 rounded border border-gray-300 disabled:opacity-50 hover:bg-gray-50 text-sm md:text-base"
                >
                  Prev
                </button>
                <span className="text-sm md:text-base text-gray-600 font-medium">
                  Halaman {currentPage} (Max 20)
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(20, p + 1))}
                  disabled={currentPage === 20 || recentDonations.length < ITEMS_PER_PAGE}
                  className="px-3 py-1 rounded border border-gray-300 disabled:opacity-50 hover:bg-gray-50 text-sm md:text-base"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <footer className="text-center py-6 md:py-8 text-gray-500 text-xs md:text-sm bg-white mt-8 md:mt-12 border-t border-gray-100">
        <p>&copy; {new Date().getFullYear()} Yayasan Islam Al Bashiirah</p>
        <p className="text-xs mt-1">Kotabaru - Karawang</p>
      </footer>

      {/* Back to Top Button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 bg-green-600 text-white p-3 rounded-full shadow-lg hover:bg-green-700 transition-all duration-300 z-50 animate-bounce"
          aria-label="Back to Top"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        </button>
      )}

      {/* Banner Modal */}
      {showBannerModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 transition-opacity duration-300"
          onClick={() => setShowBannerModal(false)}
        >
          <div className="relative max-w-4xl w-full max-h-[90vh] flex items-center justify-center">
            <button
              onClick={() => setShowBannerModal(false)}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <img
              src="/banner.jpg"
              alt="Banner Fullscreen"
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()} // Prevent closing when clicking image
            />
          </div>
        </div>
      )}
    </main>
  )
}
