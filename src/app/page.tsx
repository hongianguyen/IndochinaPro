'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Compass, FileText, Sparkles, ChevronRight, Upload } from 'lucide-react'

const destinations = [
  'Hà Nội · Hạ Long · Sapa',
  'Hội An · Đà Nẵng · Huế',
  'TP. Hồ Chí Minh · Mekong',
  'Angkor Wat · Phnom Penh',
  'Luang Prabang · Vang Vieng',
  'Bangkok · Chiang Mai · Phuket',
]

export default function HomePage() {
  const [destIndex, setDestIndex] = useState(0)
  const [dataReady, setDataReady] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setDestIndex(i => (i + 1) % destinations.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    // Check if vector store exists
    fetch('/api/status')
      .then(r => r.json())
      .then(d => setDataReady(d.vectorStoreReady))
      .catch(() => setDataReady(false))
  }, [])

  return (
    <main className="relative min-h-screen overflow-hidden bg-luxury-pattern">
      {/* Background gradient mesh */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] 
                        bg-gold-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] 
                        bg-navy-600/30 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between 
                         px-8 py-6 border-b border-navy-700/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 border border-gold-500 flex items-center 
                          justify-center rotate-45">
            <Compass size={16} className="text-gold-400 -rotate-45" />
          </div>
          <div>
            <div className="font-display text-lg text-cream-100 leading-tight">
              Indochina Travel
            </div>
            <div className="text-gold-500 text-xs tracking-[0.3em] uppercase">
              Pro
            </div>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-8">
          <Link href="/ingest" 
                className="text-xs tracking-widest uppercase text-navy-300 
                           hover:text-gold-400 transition-colors">
            Data Manager
          </Link>
          <Link href="/wizard"
                className="text-xs tracking-widest uppercase text-navy-300 
                           hover:text-gold-400 transition-colors">
            Tạo hành trình
          </Link>
        </nav>

        {/* Data status indicator */}
        <div className={`flex items-center gap-2 text-xs tracking-wider uppercase
                         ${dataReady ? 'text-emerald-400' : 'text-gold-400'}`}>
          <span className={`w-2 h-2 rounded-full animate-pulse
                            ${dataReady ? 'bg-emerald-400' : 'bg-gold-400'}`} />
          {dataReady ? 'Dữ liệu sẵn sàng' : 'Chưa có dữ liệu'}
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 flex flex-col items-center justify-center 
                           min-h-[calc(100vh-5rem)] px-4 text-center">
        
        {/* Ornamental top */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-6"
        >
          <div className="flex items-center gap-4 text-gold-500/60 text-xs tracking-[0.4em] uppercase">
            <div className="h-px w-16 bg-gold-500/40" />
            AI-Powered · RAG Technology
            <div className="h-px w-16 bg-gold-500/40" />
          </div>
        </motion.div>

        {/* Main headline */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.1 }}
          className="font-display text-6xl md:text-8xl font-300 leading-[0.9] 
                     text-cream-100 mb-4 max-w-4xl"
        >
          Hành Trình
          <br />
          <span className="italic text-gold-400">Đông Dương</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="font-body text-navy-300 text-lg font-300 mb-2 tracking-wide"
        >
          Xây dựng bởi AI · Lấy cảm hứng từ 2,000 chương trình thực tế
        </motion.p>

        {/* Animated destination ticker */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="h-8 flex items-center justify-center mb-12"
        >
          <motion.span
            key={destIndex}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-gold-400/80 font-body text-sm tracking-[0.2em]"
          >
            {destinations[destIndex]}
          </motion.span>
        </motion.div>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="flex flex-col sm:flex-row items-center gap-4"
        >
          <Link href="/wizard">
            <button className="btn-gold flex items-center gap-2 animate-pulse-gold">
              <Sparkles size={16} />
              Tạo Hành Trình AI
              <ChevronRight size={16} />
            </button>
          </Link>

          {!dataReady && (
            <Link href="/ingest">
              <button className="btn-outline-gold flex items-center gap-2">
                <Upload size={16} />
                Nạp Dữ Liệu 2000 Tour
              </button>
            </Link>
          )}
        </motion.div>

        {/* Feature grid */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.7 }}
          className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full"
        >
          {[
            {
              icon: <Upload size={20} />,
              title: '2,000 Chương Trình',
              desc: 'RAG từ kho dữ liệu tour thực tế của Indochina Travel',
            },
            {
              icon: <Sparkles size={20} />,
              title: '7 Trường Dữ Liệu / Ngày',
              desc: 'Highlights · Pickup · Drop-off · Meals · Transport',
            },
            {
              icon: <FileText size={20} />,
              title: 'Xuất PDF Proposal',
              desc: 'Template sang trọng với ảnh điểm đến từ Unsplash',
            },
          ].map((f, i) => (
            <div key={i} className="card-luxury p-6 text-left group">
              <div className="text-gold-400 mb-3 group-hover:scale-110 
                              transition-transform inline-block">
                {f.icon}
              </div>
              <h3 className="font-display text-xl text-cream-100 mb-2">{f.title}</h3>
              <p className="text-navy-300 text-sm font-300 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </motion.div>

      </section>

      {/* Footer ornament */}
      <div className="relative z-10 border-t border-navy-800 py-4 text-center">
        <p className="text-navy-500 text-xs tracking-[0.3em] uppercase">
          Indochina Travel Pro © 2025 · AI Itinerary System
        </p>
      </div>
    </main>
  )
}
