'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  ChevronLeft, Download, RefreshCw, Calendar,
  MapPin, Users, Compass, Star, Map, MessageSquare, PanelRightClose, PanelRightOpen
} from 'lucide-react'
import { useItineraryStore, useChatStore } from '@/store'
import { DayCard } from '@/components/DayCard'
import { ChatPanel } from '@/components/ChatPanel'
import type { Itinerary } from '@/types'

// ── Route Map component ───────────────────────────────────────────────────────
function RouteMap({ startPoint, destinations }: { startPoint: string; destinations: string[] }) {
  const points = destinations.join('|')
  const src = `/api/map?start=${encodeURIComponent(startPoint)}&points=${encodeURIComponent(points)}`
  const [status, setStatus] = useState<'loading' | 'ok' | 'unavailable'>('loading')

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="card-luxury overflow-hidden"
    >
      <div className="flex items-center gap-3 px-6 pt-4 pb-3 border-b border-navy-700">
        <Map size={14} className="text-gold-500" />
        <div className="label-field">Dynamic Route Map</div>
      </div>
      {status === 'unavailable' ? (
        <div className="px-6 py-8 text-center text-navy-500 text-sm">
          Route map unavailable — add <code className="text-navy-400">GOOGLE_MAPS_API_KEY</code> to enable
        </div>
      ) : (
        <div className="relative">
          {status === 'loading' && (
            <div className="absolute inset-0 flex items-center justify-center bg-navy-900/80 z-10">
              <div className="w-6 h-6 border-2 border-gold-500/40 border-t-gold-500 rounded-full animate-spin" />
            </div>
          )}
          <img
            src={src}
            alt="Route map"
            className="w-full object-cover"
            style={{ minHeight: 180 }}
            onLoad={() => setStatus('ok')}
            onError={() => setStatus('unavailable')}
          />
          {status === 'ok' && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-navy-950/90 to-transparent px-6 py-3">
              <div className="flex flex-wrap gap-2 text-xs">
                {[startPoint, ...destinations].map((loc, i) => (
                  <span key={i} className="flex items-center gap-1.5 text-cream-100/80">
                    <span className="w-5 h-5 rounded-full bg-gold-500 text-navy-950 font-bold text-[10px] flex items-center justify-center flex-shrink-0">
                      {i === 0 ? 'S' : i}
                    </span>
                    {loc}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </motion.div>
  )
}

// ── Itinerary Preview (Left Panel) ────────────────────────────────────────────
function ItineraryPreview({ itinerary }: { itinerary: Itinerary }) {
  const [pdfLoading, setPdfLoading] = useState(false)
  const { title, subtitle, overview, highlights, days, request, generatedAt, ragSources } = itinerary

  const handleExportPDF = async () => {
    setPdfLoading(true)
    try {
      const res = await fetch('/api/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itinerary),
      })
      if (res.ok) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${title.replace(/[^a-zA-Z0-9\s]/g, '')}.pdf`
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch {
      alert('Failed to export PDF. Please try again.')
    } finally {
      setPdfLoading(false)
    }
  }

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      {/* Compact Hero */}
      <div className="relative bg-navy-gradient bg-luxury-pattern border-b border-navy-700/50">
        <div className="px-6 py-8 max-w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <div className="flex items-center gap-3 text-gold-500/70 text-xs tracking-[0.3em] uppercase">
              <div className="h-px w-6 bg-gold-500/40" />
              AI-Generated · {days.length} Days
              <div className="h-px w-6 bg-gold-500/40" />
            </div>
            <h1 className="font-display text-3xl lg:text-4xl text-cream-100 font-light leading-tight">
              {title}
            </h1>
            <p className="font-display text-lg text-gold-400/80 italic">{subtitle}</p>

            {/* Meta row */}
            <div className="flex flex-wrap gap-4 pt-2 text-xs text-navy-300">
              <span className="flex items-center gap-1.5">
                <Calendar size={12} className="text-gold-500" />
                {request.duration} Days
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin size={12} className="text-gold-500" />
                {request.startPoint} → {request.destinations.join(', ')}
              </span>
              {request.groupSize && (
                <span className="flex items-center gap-1.5">
                  <Users size={12} className="text-gold-500" />
                  {request.groupSize} Travelers
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Star size={12} className="text-gold-500" />
                {request.travelStyle || 'Standard'}
              </span>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3 pt-3">
              {ragSources && ragSources.length > 0 && (
                <span className="text-xs text-emerald-400/70 tracking-wider">
                  ✓ RAG: {ragSources[0]}
                </span>
              )}
              <div className="ml-auto flex gap-2">
                <Link href="/wizard">
                  <button className="btn-outline-gold text-xs flex items-center gap-1.5 py-1.5 px-3">
                    <RefreshCw size={12} />
                    New
                  </button>
                </Link>
                <button
                  onClick={handleExportPDF}
                  disabled={pdfLoading}
                  className="btn-gold text-xs flex items-center gap-1.5 py-1.5 px-3"
                >
                  <Download size={12} />
                  {pdfLoading ? 'Exporting...' : 'Export PDF'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-8 space-y-8">
        {/* Overview */}
        {overview && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="card-luxury p-6"
          >
            <div className="label-field mb-3">Journey Overview</div>
            <p className="font-body text-navy-200 leading-relaxed text-sm">{overview}</p>

            {highlights.length > 0 && (
              <div className="mt-4 pt-4 border-t border-navy-700">
                <div className="label-field mb-2">Key Highlights</div>
                <div className="grid md:grid-cols-2 gap-2">
                  {highlights.map((h, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-navy-200">
                      <span className="text-gold-500 flex-shrink-0 mt-0.5">◆</span>
                      {h}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Route Map */}
        <RouteMap startPoint={request.startPoint} destinations={request.destinations} />

        {/* Interest Tags */}
        {request.interests.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {request.interests.map(interest => (
              <span key={interest}
                className="px-2.5 py-1 border border-gold-500/30 text-gold-400/80 
                           text-[10px] tracking-wider uppercase">
                {interest}
              </span>
            ))}
          </div>
        )}

        {/* Day-by-Day */}
        <div>
          <div className="flex items-center gap-3 mb-6">
            <h2 className="font-display text-2xl text-cream-100">Day-by-Day Itinerary</h2>
            <div className="flex-1 h-px bg-gradient-to-r from-gold-500/30 to-transparent" />
          </div>

          <div className="space-y-3">
            {days.map((day, i) => (
              <DayCard key={`${day.dayNumber}-${day.highlights}`} day={day} index={i} />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center py-6 border-t border-navy-800">
          <p className="text-navy-600 text-[10px] tracking-widest uppercase">
            Indochina Travel Pro · AI Itinerary · {new Date(generatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Main Page (Split-Screen Workspace) ────────────────────────────────────────
export default function ItineraryPage() {
  const { current, isGenerating } = useItineraryStore()
  const { clearChat } = useChatStore()
  const [chatOpen, setChatOpen] = useState(true)

  // Reset chat when a new itinerary is loaded
  useEffect(() => {
    clearChat()
  }, [current?.id])

  // ── Loading State ──
  if (isGenerating) {
    return (
      <main className="min-h-screen bg-navy-950 flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="relative w-24 h-24 mx-auto">
            <div className="absolute inset-0 border-2 border-gold-500/20 rounded-full animate-ping" />
            <div className="absolute inset-2 border-2 border-gold-500/40 rounded-full animate-ping"
              style={{ animationDelay: '0.3s' }} />
            <div className="absolute inset-4 flex items-center justify-center">
              <Compass size={32} className="text-gold-400 animate-spin"
                style={{ animationDuration: '3s' }} />
            </div>
          </div>
          <div>
            <h2 className="font-display text-3xl text-cream-100 mb-2">
              AI is crafting your journey...
            </h2>
            <p className="text-navy-400 text-sm">
              Analyzing 2,000+ tour programs to build your perfect itinerary
            </p>
          </div>
          <div className="flex justify-center gap-1">
            {[0, 1, 2].map(i => (
              <div key={i} className="w-2 h-2 bg-gold-400 rounded-full animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        </div>
      </main>
    )
  }

  // ── Empty State ──
  if (!current) {
    return (
      <main className="min-h-screen bg-navy-950 flex items-center justify-center">
        <div className="text-center space-y-6">
          <Compass size={48} className="text-navy-600 mx-auto" />
          <h2 className="font-display text-3xl text-cream-100">No Itinerary Yet</h2>
          <p className="text-navy-400">Build a new journey from the wizard</p>
          <Link href="/wizard">
            <button className="btn-gold">Build New Itinerary</button>
          </Link>
        </div>
      </main>
    )
  }

  // ── Interactive Workspace (Split-Screen) ──
  return (
    <main className="h-screen bg-navy-950 flex flex-col overflow-hidden">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-navy-700/50 bg-navy-900/80 flex-shrink-0">
        <Link href="/wizard" className="flex items-center gap-2 text-navy-400 hover:text-gold-400 transition-colors text-xs">
          <ChevronLeft size={14} />
          Back to Wizard
        </Link>

        <div className="flex items-center gap-4">
          <span className="text-xs text-navy-500">
            {current.days.length} Days · {current.request.destinations.join(', ')}
          </span>

          <button
            onClick={() => setChatOpen(!chatOpen)}
            className="flex items-center gap-1.5 text-xs text-navy-400 hover:text-gold-400 transition-colors
                       border border-navy-700/50 px-3 py-1.5 rounded-lg hover:border-gold-500/30"
          >
            {chatOpen ? (
              <>
                <PanelRightClose size={14} />
                Hide Chat
              </>
            ) : (
              <>
                <MessageSquare size={14} />
                AI Assistant
              </>
            )}
          </button>
        </div>
      </div>

      {/* Split-Screen Content */}
      <div className="flex flex-1 min-h-0">
        {/* Left Panel — Itinerary Preview (60% or 100%) */}
        <div className={`transition-all duration-300 ${chatOpen ? 'w-[60%]' : 'w-full'}`}>
          <ItineraryPreview itinerary={current} />
        </div>

        {/* Right Panel — Chat Assistant (40%) */}
        {chatOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: '40%', opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="h-full"
          >
            <ChatPanel />
          </motion.div>
        )}
      </div>
    </main>
  )
}
