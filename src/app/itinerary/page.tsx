'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  ChevronLeft, Download, RefreshCw, Calendar,
  MapPin, Users, Compass, Star
} from 'lucide-react'
import { useItineraryStore } from '@/store'
import { DayCard } from '@/components/DayCard'
import type { Itinerary } from '@/types'

export default function ItineraryPage() {
  const { current, isGenerating } = useItineraryStore()
  const [pdfLoading, setPdfLoading] = useState(false)

  const handleExportPDF = async () => {
    if (!current) return
    setPdfLoading(true)
    try {
      const res = await fetch('/api/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(current),
      })
      if (res.ok) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${current.title.replace(/[^a-zA-Z0-9\s]/g, '')}.pdf`
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch (err) {
      alert('Lỗi xuất PDF. Vui lòng thử lại.')
    } finally {
      setPdfLoading(false)
    }
  }

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
              AI đang tạo hành trình...
            </h2>
            <p className="text-navy-400 text-sm">
              Đang phân tích 2,000 chương trình tour và tổng hợp lịch trình tối ưu
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

  if (!current) {
    return (
      <main className="min-h-screen bg-navy-950 flex items-center justify-center">
        <div className="text-center space-y-6">
          <Compass size={48} className="text-navy-600 mx-auto" />
          <h2 className="font-display text-3xl text-cream-100">Chưa có lịch trình</h2>
          <p className="text-navy-400">Hãy tạo hành trình mới từ wizard</p>
          <Link href="/wizard">
            <button className="btn-gold">Tạo Hành Trình Mới</button>
          </Link>
        </div>
      </main>
    )
  }

  const { title, subtitle, overview, highlights, days, request, generatedAt, ragSources } = current

  return (
    <main className="min-h-screen bg-navy-950">
      {/* Hero / Cover */}
      <div className="relative bg-navy-gradient bg-luxury-pattern border-b border-navy-700/50">
        {/* Nav */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-navy-800/50">
          <Link href="/wizard" className="flex items-center gap-2 text-navy-400 hover:text-gold-400 transition-colors text-sm">
            <ChevronLeft size={16} />
            Tạo hành trình khác
          </Link>
          <div className="flex items-center gap-3">
            {ragSources && ragSources.length > 0 && (
              <span className="text-xs text-emerald-400/70 tracking-wider">
                ✓ RAG: {ragSources[0]}
              </span>
            )}
            <button
              onClick={handleExportPDF}
              disabled={pdfLoading}
              className="btn-gold flex items-center gap-2 text-sm py-2"
            >
              <Download size={14} />
              {pdfLoading ? 'Đang xuất...' : 'Xuất PDF Proposal'}
            </button>
          </div>
        </div>

        {/* Title Block */}
        <div className="px-8 py-16 max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-3 text-gold-500/70 text-xs tracking-[0.4em] uppercase">
              <div className="h-px w-8 bg-gold-500/40" />
              AI-Generated · {days.length} Ngày
              <div className="h-px w-8 bg-gold-500/40" />
            </div>
            <h1 className="font-display text-5xl md:text-7xl text-cream-100 font-300 leading-tight">
              {title}
            </h1>
            <p className="font-display text-2xl text-gold-400/80 italic">{subtitle}</p>

            {/* Meta info */}
            <div className="flex flex-wrap gap-6 pt-4 text-sm text-navy-300">
              <span className="flex items-center gap-2">
                <Calendar size={14} className="text-gold-500" />
                {request.duration} ngày
              </span>
              <span className="flex items-center gap-2">
                <MapPin size={14} className="text-gold-500" />
                {request.startPoint} → {request.destinations.join(', ')}
              </span>
              {request.groupSize && (
                <span className="flex items-center gap-2">
                  <Users size={14} className="text-gold-500" />
                  {request.groupSize} người
                </span>
              )}
              <span className="flex items-center gap-2">
                <Star size={14} className="text-gold-500" />
                {request.travelStyle || 'Standard'}
              </span>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-8 py-12 space-y-12">
        {/* Overview */}
        {overview && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="card-luxury p-8"
          >
            <div className="label-field mb-4">Tổng Quan Hành Trình</div>
            <p className="font-body text-navy-200 leading-relaxed text-lg">{overview}</p>

            {highlights.length > 0 && (
              <div className="mt-6 pt-6 border-t border-navy-700">
                <div className="label-field mb-3">Điểm Nhấn Nổi Bật</div>
                <div className="grid md:grid-cols-2 gap-3">
                  {highlights.map((h, i) => (
                    <div key={i} className="flex items-start gap-3 text-sm text-navy-200">
                      <span className="text-gold-500 flex-shrink-0 mt-0.5">◆</span>
                      {h}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Interests Tags */}
        {request.interests.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {request.interests.map(interest => (
              <span key={interest}
                className="px-3 py-1.5 border border-gold-500/30 text-gold-400/80 
                           text-xs tracking-wider uppercase">
                {interest}
              </span>
            ))}
          </div>
        )}

        {/* Day-by-Day */}
        <div>
          <div className="flex items-center gap-4 mb-8">
            <h2 className="font-display text-3xl text-cream-100">Lịch Trình Chi Tiết</h2>
            <div className="flex-1 h-px bg-gradient-to-r from-gold-500/30 to-transparent" />
          </div>

          <div className="space-y-4">
            {days.map((day, i) => (
              <DayCard key={day.dayNumber} day={day} index={i} />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center py-8 border-t border-navy-800">
          <p className="text-navy-600 text-xs tracking-widest uppercase">
            Indochina Travel Pro · AI Itinerary · {new Date(generatedAt).toLocaleDateString('vi-VN')}
          </p>
          <div className="mt-4 flex justify-center gap-4">
            <Link href="/wizard">
              <button className="btn-outline-gold text-sm flex items-center gap-2">
                <RefreshCw size={14} />
                Tạo Lại
              </button>
            </Link>
            <button onClick={handleExportPDF} disabled={pdfLoading}
              className="btn-gold text-sm flex items-center gap-2">
              <Download size={14} />
              Xuất PDF
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
