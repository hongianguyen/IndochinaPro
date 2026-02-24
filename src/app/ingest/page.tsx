'use client'

import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload, CheckCircle, AlertCircle, Loader2,
  FileText, Database, Cpu, Sparkles, ChevronLeft,
  BookOpen, Settings, Shield
} from 'lucide-react'
import Link from 'next/link'

type Phase = 'idle' | 'uploading' | 'extracting' | 'parsing-structured' | 'reading' | 'vectorizing' | 'done' | 'error'

interface IngestState {
  phase: Phase
  message: string
  totalFiles: number
  processedFiles: number
  vectorsCreated: number
  currentFile: string
  structuredFilesFound: string[]
  errors: string[]
}

const PHASES: { key: Phase; label: string; desc: string; icon: React.ReactNode }[] = [
  { key: 'uploading', label: 'Receiving File', desc: 'Uploading ZIP archive', icon: <Upload size={14} /> },
  { key: 'extracting', label: 'Extracting ZIP', desc: 'Decompressing archive', icon: <FileText size={14} /> },
  { key: 'parsing-structured', label: 'Knowledge Hub', desc: 'Loading structured data files', icon: <Shield size={14} /> },
  { key: 'reading', label: 'RAG Processing', desc: 'Reading unstructured documents', icon: <BookOpen size={14} /> },
  { key: 'vectorizing', label: 'Vectorizing', desc: 'Creating AI embeddings', icon: <Cpu size={14} /> },
  { key: 'done', label: 'Complete', desc: 'All data ingested', icon: <CheckCircle size={14} /> },
]

const phaseOrder = ['uploading', 'extracting', 'parsing-structured', 'reading', 'vectorizing', 'done']

const STRUCTURED_FILE_LABELS: Record<string, { label: string; icon: React.ReactNode }> = {
  '1_brand_guidelines.md': { label: 'Brand Guidelines', icon: <Shield size={12} /> },
  '2_core_principles.md': { label: 'Core Principles', icon: <BookOpen size={12} /> },
  '3_logistics_rules.json': { label: 'Logistics Rules', icon: <Settings size={12} /> },
  '4_hotel_master.json': { label: 'Hotel Database', icon: <Database size={12} /> },
}

export default function IngestPage() {
  const [dragOver, setDragOver] = useState(false)
  const [state, setState] = useState<IngestState>({
    phase: 'idle',
    message: '',
    totalFiles: 0,
    processedFiles: 0,
    vectorsCreated: 0,
    currentFile: '',
    structuredFilesFound: [],
    errors: [],
  })
  const fileRef = useRef<HTMLInputElement>(null)

  const processFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.zip')) {
      setState(s => ({ ...s, phase: 'error', message: 'Please select a ZIP file' }))
      return
    }

    const formData = new FormData()
    formData.append('file', file)

    setState(s => ({ ...s, phase: 'uploading', message: 'Uploading...' }))

    try {
      const response = await fetch('/api/ingest', {
        method: 'POST',
        body: formData,
      })

      if (!response.body) throw new Error('No response body')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const text = decoder.decode(value)
        const lines = text.split('\n').filter(l => l.startsWith('data: '))

        for (const line of lines) {
          try {
            const data = JSON.parse(line.slice(6))
            setState(s => ({
              ...s,
              phase: data.phase || s.phase,
              message: data.message || s.message,
              totalFiles: data.totalFiles ?? s.totalFiles,
              processedFiles: data.processedFiles ?? s.processedFiles,
              vectorsCreated: data.vectorsCreated ?? s.vectorsCreated,
              currentFile: data.currentFile || s.currentFile,
              structuredFilesFound: data.structuredFilesFound || s.structuredFilesFound,
            }))
          } catch { }
        }
      }
    } catch (err: any) {
      setState(s => ({ ...s, phase: 'error', message: err.message }))
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }, [processFile])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }, [processFile])

  const currentPhaseIndex = phaseOrder.indexOf(state.phase)
  const progress = state.totalFiles > 0
    ? Math.round((state.processedFiles / state.totalFiles) * 100)
    : 0

  const isProcessing = ['uploading', 'extracting', 'parsing-structured', 'reading', 'vectorizing'].includes(state.phase)

  return (
    <main className="min-h-screen bg-navy-950 bg-luxury-pattern">
      {/* Header */}
      <header className="border-b border-navy-700/50 px-8 py-5 flex items-center gap-4">
        <Link href="/" className="text-navy-400 hover:text-gold-400 transition-colors">
          <ChevronLeft size={20} />
        </Link>
        <div>
          <h1 className="font-display text-2xl text-cream-100">Data Ingestion Dashboard</h1>
          <p className="text-navy-400 text-xs tracking-widest uppercase mt-0.5">
            Load 2,000+ tour programs into the Knowledge Hub & Vector Database
          </p>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-8 py-12">
        {/* Upload Zone */}
        {state.phase === 'idle' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {/* Explanation of 2-stream pipeline */}
            <div className="card-luxury p-6">
              <div className="label-field mb-4">How It Works — Dual-Stream Pipeline</div>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-gold-400 font-body font-medium text-sm">
                    <Shield size={14} />
                    Stream A — Structured Knowledge (Supreme Authority)
                  </div>
                  <p className="text-navy-300 text-xs leading-relaxed">
                    Detects and loads 4 structured files directly into the AI system prompt:
                  </p>
                  <ul className="space-y-1.5">
                    {Object.entries(STRUCTURED_FILE_LABELS).map(([file, info]) => (
                      <li key={file} className="flex items-center gap-2 text-xs text-navy-400">
                        {info.icon}
                        <code className="text-navy-300 font-mono text-[10px]">{file}</code>
                        <span className="text-navy-500">— {info.label}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-blue-400 font-body font-medium text-sm">
                    <Database size={14} />
                    Stream B — Unstructured Data (RAG Reference)
                  </div>
                  <p className="text-navy-300 text-xs leading-relaxed">
                    All remaining <code className="text-navy-200">.docx</code> files are processed, chunked, and vectorized into the database for contextual AI retrieval during itinerary generation.
                  </p>
                </div>
              </div>
            </div>

            {/* Drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className={`
                border-2 border-dashed rounded-sm p-16 text-center cursor-pointer
                transition-all duration-300
                ${dragOver
                  ? 'border-gold-400 bg-gold-500/5 scale-[1.01]'
                  : 'border-navy-600 hover:border-gold-500/60 hover:bg-navy-800/50'}
              `}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".zip"
                className="hidden"
                onChange={handleFileInput}
              />
              <div className="flex flex-col items-center gap-4">
                <div className={`
                  w-20 h-20 border flex items-center justify-center transition-colors
                  ${dragOver ? 'border-gold-400 text-gold-400' : 'border-navy-600 text-navy-400'}
                `}>
                  <Upload size={32} />
                </div>
                <div>
                  <p className="font-display text-3xl text-cream-100 mb-2">
                    Drop Your ZIP File Here
                  </p>
                  <p className="text-navy-400 text-sm font-body">
                    or click to browse · Supports ZIP containing .docx + structured data files
                  </p>
                </div>
                <div className="flex items-center gap-8 mt-4 text-xs tracking-wider uppercase">
                  {[
                    { label: 'Format', value: '.ZIP' },
                    { label: 'Max Size', value: '50 MB' },
                    { label: 'Documents', value: '2,000+ files' },
                  ].map(item => (
                    <div key={item.label} className="text-center">
                      <div className="text-gold-500 font-mono text-base">{item.value}</div>
                      <div className="text-navy-500 mt-0.5">{item.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Processing State */}
        {isProcessing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-8"
          >
            {/* Phase Timeline */}
            <div className="card-luxury p-8">
              <h2 className="label-field mb-6">Processing Pipeline</h2>
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-[18px] top-8 bottom-0 w-px bg-navy-700" />

                <div className="space-y-6">
                  {PHASES.map((phase, i) => {
                    const isActive = phase.key === state.phase
                    const isDone = phaseOrder.indexOf(phase.key) < currentPhaseIndex
                    const isPending = !isActive && !isDone

                    return (
                      <div key={phase.key} className="flex items-start gap-4">
                        <div className={`
                          relative z-10 w-9 h-9 border flex items-center justify-center flex-shrink-0
                          transition-all duration-500
                          ${isActive ? 'border-gold-400 text-gold-400 bg-navy-900' : ''}
                          ${isDone ? 'border-emerald-500 text-emerald-400 bg-navy-900' : ''}
                          ${isPending ? 'border-navy-600 text-navy-600' : ''}
                        `}>
                          {isActive ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : isDone ? (
                            <CheckCircle size={14} />
                          ) : (
                            phase.icon
                          )}
                        </div>
                        <div className="flex-1 pt-1.5">
                          <div className={`text-sm font-body font-medium tracking-wide
                            ${isActive ? 'text-gold-400' : isDone ? 'text-emerald-400' : 'text-navy-500'}
                          `}>
                            {phase.label}
                            <span className="text-navy-500 text-xs ml-2 font-normal">{phase.desc}</span>
                          </div>
                          {isActive && (
                            <motion.div
                              initial={{ opacity: 0, y: 4 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="text-xs text-navy-400 mt-1 font-mono"
                            >
                              {state.currentFile || state.message}
                            </motion.div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Structured Data Status */}
            {state.structuredFilesFound.length > 0 && (
              <div className="card-luxury p-6">
                <div className="label-field mb-4">Knowledge Hub — Structured Data Loaded</div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {Object.entries(STRUCTURED_FILE_LABELS).map(([file, info]) => {
                    const loaded = state.structuredFilesFound.includes(file)
                    return (
                      <div key={file} className={`p-3 border text-center text-xs
                        ${loaded
                          ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-400'
                          : 'border-navy-700 text-navy-600'}
                      `}>
                        <div className="mb-1">{loaded ? <CheckCircle size={14} className="mx-auto" /> : info.icon}</div>
                        <div className="font-medium">{info.label}</div>
                        <div className="text-[10px] mt-0.5 font-mono opacity-60">{file}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Progress Stats */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Files Processed', value: state.processedFiles, total: state.totalFiles, color: 'text-gold-400' },
                { label: 'Vectors Created', value: state.vectorsCreated, total: null, color: 'text-blue-400' },
                { label: 'Progress', value: `${progress}%`, total: null, color: 'text-emerald-400' },
              ].map(stat => (
                <div key={stat.label} className="card-luxury p-6 text-center">
                  <div className={`font-mono text-3xl font-normal ${stat.color} mb-1`}>
                    {stat.value}
                    {stat.total ? <span className="text-navy-500 text-lg">/{stat.total}</span> : ''}
                  </div>
                  <div className="label-field text-navy-400">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Progress Bar */}
            {state.totalFiles > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-navy-400 tracking-wider uppercase">
                  <span>Overall Progress</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-1 bg-navy-800 overflow-hidden">
                  <motion.div
                    className="h-full progress-gold"
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Done State */}
        {state.phase === 'done' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-8"
          >
            <div className="card-luxury p-16 flex flex-col items-center gap-6">
              <div className="w-20 h-20 border border-emerald-500 flex items-center 
                              justify-center text-emerald-400">
                <CheckCircle size={36} />
              </div>
              <div>
                <h2 className="font-display text-4xl text-cream-100 mb-2">
                  Ingestion Complete!
                </h2>
                <p className="text-navy-300 font-body">
                  {state.message}
                </p>
              </div>

              {/* Structured files summary */}
              {state.structuredFilesFound.length > 0 && (
                <div className="bg-navy-900/50 border border-navy-700 p-4 w-full max-w-md">
                  <div className="label-field mb-3 text-center">Knowledge Hub Files</div>
                  <div className="space-y-1.5">
                    {state.structuredFilesFound.map(f => (
                      <div key={f} className="flex items-center gap-2 text-xs text-emerald-400">
                        <CheckCircle size={10} />
                        <span className="font-mono">{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-8 text-center">
                <div>
                  <div className="font-mono text-3xl text-gold-400">{state.vectorsCreated.toLocaleString()}</div>
                  <div className="label-field text-navy-400 mt-1">Documents</div>
                </div>
                <div className="w-px bg-navy-700" />
                <div>
                  <div className="font-mono text-3xl text-gold-400">{state.structuredFilesFound.length}</div>
                  <div className="label-field text-navy-400 mt-1">Structured Files</div>
                </div>
              </div>
              <Link href="/wizard">
                <button className="btn-gold flex items-center gap-2 mt-4">
                  <Sparkles size={16} />
                  Start Building Itineraries
                </button>
              </Link>
            </div>
          </motion.div>
        )}

        {/* Error State */}
        {state.phase === 'error' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="card-luxury border-red-500/30 p-8 text-center"
          >
            <AlertCircle size={40} className="text-red-400 mx-auto mb-4" />
            <h2 className="font-display text-2xl text-cream-100 mb-2">An Error Occurred</h2>
            <p className="text-red-400 font-mono text-sm mb-6">{state.message}</p>
            <button
              onClick={() => setState(s => ({ ...s, phase: 'idle', message: '', structuredFilesFound: [] }))}
              className="btn-outline-gold"
            >
              Try Again
            </button>
          </motion.div>
        )}
      </div>
    </main>
  )
}
