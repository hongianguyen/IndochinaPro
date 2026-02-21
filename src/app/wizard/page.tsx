'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft, ChevronRight, Check, Compass, MapPin,
  Calendar, Heart, MessageSquare, Loader2, Sparkles
} from 'lucide-react'
import { useWizardStore, useItineraryStore } from '@/store'
import type { InterestTheme } from '@/types'

// ─── Step Components ───────────────────────────────────────────────────────────

function Step1Duration({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const options = [3, 5, 7, 10, 14, 21]
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="font-display text-5xl text-cream-100 mb-3">
          Chuyến đi bao nhiêu ngày?
        </h2>
        <p className="text-navy-400 font-body">Chọn thời gian hành trình mong muốn của bạn</p>
      </div>
      <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
        {options.map(n => (
          <button
            key={n}
            onClick={() => onChange(n)}
            className={`
              py-6 border text-center transition-all duration-200 group
              ${value === n
                ? 'border-gold-500 bg-gold-500/10 text-gold-400'
                : 'border-navy-600 text-navy-300 hover:border-gold-500/50'}
            `}
          >
            <span className="font-display text-4xl block">{n}</span>
            <span className="text-xs tracking-widest uppercase mt-1 block">
              {n === 1 ? 'ngày' : 'ngày'}
            </span>
          </button>
        ))}
      </div>
      <div className="max-w-lg mx-auto">
        <label className="label-field block mb-2">Hoặc nhập số ngày cụ thể</label>
        <input
          type="number"
          min={1} max={60}
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="input-luxury text-center text-2xl font-mono"
        />
      </div>
    </div>
  )
}

function Step2StartPoint({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const common = [
    'Hà Nội', 'Hồ Chí Minh', 'Đà Nẵng', 'Huế',
    'Phú Quốc', 'Bangkok', 'Siem Reap', 'Vientiane'
  ]
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="font-display text-5xl text-cream-100 mb-3">
          Bắt đầu từ đâu?
        </h2>
        <p className="text-navy-400 font-body">Điểm khởi hành của hành trình</p>
      </div>
      <div className="max-w-lg mx-auto space-y-4">
        <input
          type="text"
          placeholder="Nhập điểm khởi hành..."
          value={value}
          onChange={e => onChange(e.target.value)}
          className="input-luxury text-lg"
        />
        <div>
          <label className="label-field block mb-3">Điểm khởi hành phổ biến</label>
          <div className="flex flex-wrap gap-2">
            {common.map(city => (
              <button
                key={city}
                onClick={() => onChange(city)}
                className={`
                  px-4 py-2 border text-sm tracking-wide transition-all
                  ${value === city
                    ? 'border-gold-500 bg-gold-500/10 text-gold-400'
                    : 'border-navy-600 text-navy-400 hover:border-gold-500/50 hover:text-gold-400'}
                `}
              >
                {city}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function Step3Destinations({
  value, onChange
}: { value: string[]; onChange: (v: string[]) => void }) {
  const [input, setInput] = useState('')

  const suggestions = [
    'Hạ Long Bay', 'Sapa', 'Ninh Bình', 'Hội An', 'Mỹ Sơn',
    'Nha Trang', 'Đà Lạt', 'Mekong Delta', 'Phú Quốc',
    'Angkor Wat', 'Phnom Penh', 'Luang Prabang', 'Vang Vieng',
    'Bangkok', 'Chiang Mai', 'Phuket', 'Krabi'
  ]

  const add = (dest: string) => {
    if (dest && !value.includes(dest)) {
      onChange([...value, dest])
      setInput('')
    }
  }

  const remove = (dest: string) => onChange(value.filter(d => d !== dest))

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="font-display text-5xl text-cream-100 mb-3">
          Muốn đến đâu?
        </h2>
        <p className="text-navy-400 font-body">Chọn một hoặc nhiều điểm đến · Kéo để sắp xếp</p>
      </div>

      <div className="max-w-2xl mx-auto space-y-6">
        {/* Selected */}
        {value.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {value.map(dest => (
              <span
                key={dest}
                className="flex items-center gap-2 px-4 py-2 bg-gold-500/10 
                           border border-gold-500 text-gold-400 text-sm"
              >
                <MapPin size={12} />
                {dest}
                <button
                  onClick={() => remove(dest)}
                  className="hover:text-red-400 transition-colors ml-1"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Nhập tên điểm đến..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && add(input)}
            className="input-luxury flex-1"
          />
          <button
            onClick={() => add(input)}
            className="btn-gold px-6 py-3"
          >
            Thêm
          </button>
        </div>

        {/* Suggestions */}
        <div>
          <label className="label-field block mb-3">Điểm đến gợi ý</label>
          <div className="flex flex-wrap gap-2">
            {suggestions.filter(s => !value.includes(s)).map(dest => (
              <button
                key={dest}
                onClick={() => add(dest)}
                className="px-3 py-1.5 border border-navy-600 text-navy-400 text-xs 
                           tracking-wide hover:border-gold-500/50 hover:text-gold-400 
                           transition-all"
              >
                + {dest}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

const INTERESTS: { id: InterestTheme; emoji: string; desc: string }[] = [
  { id: 'Culture & Heritage', emoji: '🏛️', desc: 'Đền chùa, lịch sử, kiến trúc cổ' },
  { id: 'Food & Culinary', emoji: '🍜', desc: 'Ẩm thực địa phương, cooking class' },
  { id: 'Family & Kids', emoji: '👨‍👩‍👧‍👦', desc: 'Phù hợp cho gia đình có trẻ em' },
  { id: 'Adventure & Trekking', emoji: '🏔️', desc: 'Trekking, cave, zipline' },
  { id: 'Beach & Relaxation', emoji: '🏖️', desc: 'Biển đẹp, nghỉ dưỡng, snorkeling' },
  { id: 'Photography', emoji: '📷', desc: 'Điểm check-in đẹp, landscape' },
  { id: 'Wildlife & Nature', emoji: '🦋', desc: 'Rừng quốc gia, động vật hoang dã' },
  { id: 'Luxury & Wellness', emoji: '✨', desc: 'Spa, resort 5 sao, private tour' },
  { id: 'Honeymoon & Romance', emoji: '💕', desc: 'Lãng mạn, sunset cruise, candlelight' },
  { id: 'Budget Friendly', emoji: '💰', desc: 'Tiết kiệm, backpacker, guesthouse' },
]

function Step4Interests({
  value, onChange
}: { value: InterestTheme[]; onChange: (v: InterestTheme[]) => void }) {
  const toggle = (id: InterestTheme) => {
    onChange(value.includes(id) ? value.filter(i => i !== id) : [...value, id])
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="font-display text-5xl text-cream-100 mb-3">
          Sở thích & Chủ đề
        </h2>
        <p className="text-navy-400 font-body">Chọn tất cả những gì phù hợp với bạn</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-w-2xl mx-auto">
        {INTERESTS.map(interest => (
          <button
            key={interest.id}
            onClick={() => toggle(interest.id)}
            className={`
              p-4 border text-left transition-all duration-200
              ${value.includes(interest.id)
                ? 'border-gold-500 bg-gold-500/10'
                : 'border-navy-600 hover:border-gold-500/40'}
            `}
          >
            <div className="text-2xl mb-2">{interest.emoji}</div>
            <div className={`text-sm font-body font-500 mb-1
              ${value.includes(interest.id) ? 'text-gold-400' : 'text-cream-100'}`}>
              {interest.id}
            </div>
            <div className="text-navy-400 text-xs font-300">{interest.desc}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

function Step5Special({
  value, onChange, groupSize, onGroupSize, travelStyle, onTravelStyle
}: {
  value: string; onChange: (v: string) => void
  groupSize: number; onGroupSize: (v: number) => void
  travelStyle: string; onTravelStyle: (v: string) => void
}) {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="font-display text-5xl text-cream-100 mb-3">
          Yêu cầu đặc biệt
        </h2>
        <p className="text-navy-400 font-body">Thông tin thêm để cá nhân hóa hành trình</p>
      </div>
      <div className="max-w-lg mx-auto space-y-6">
        <div>
          <label className="label-field block mb-2">Số người tham gia</label>
          <input
            type="number" min={1} max={100}
            value={groupSize}
            onChange={e => onGroupSize(Number(e.target.value))}
            className="input-luxury"
          />
        </div>

        <div>
          <label className="label-field block mb-3">Phong cách du lịch</label>
          <div className="grid grid-cols-3 gap-3">
            {(['Budget', 'Standard', 'Luxury'] as const).map(style => (
              <button
                key={style}
                onClick={() => onTravelStyle(style)}
                className={`
                  py-4 border text-sm tracking-widest uppercase transition-all
                  ${travelStyle === style
                    ? 'border-gold-500 bg-gold-500/10 text-gold-400'
                    : 'border-navy-600 text-navy-400 hover:border-gold-500/40'}
                `}
              >
                {style === 'Budget' ? '💰 Budget' : style === 'Standard' ? '⭐ Standard' : '✨ Luxury'}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label-field block mb-2">Yêu cầu đặc biệt khác</label>
          <textarea
            rows={4}
            placeholder="VD: Cần xe lăn, ăn chay, dị ứng thực phẩm, trẻ em dưới 5 tuổi, kỷ niệm đặc biệt..."
            value={value}
            onChange={e => onChange(e.target.value)}
            className="input-luxury resize-none leading-relaxed"
          />
        </div>
      </div>
    </div>
  )
}

// ─── Main Wizard ───────────────────────────────────────────────────────────────
const STEPS = [
  { label: 'Thời gian', icon: <Calendar size={14} /> },
  { label: 'Khởi hành', icon: <Compass size={14} /> },
  { label: 'Điểm đến', icon: <MapPin size={14} /> },
  { label: 'Sở thích', icon: <Heart size={14} /> },
  { label: 'Chi tiết', icon: <MessageSquare size={14} /> },
]

export default function WizardPage() {
  const router = useRouter()
  const { step, request, setStep, setRequest } = useWizardStore()
  const { setGenerating, setCurrent, setError } = useItineraryStore()
  const [isGenerating, setIsGenerating] = useState(false)

  const canNext = () => {
    if (step === 1) return (request.duration || 0) > 0
    if (step === 2) return (request.startPoint || '').trim().length > 0
    if (step === 3) return (request.destinations || []).length > 0
    if (step === 4) return (request.interests || []).length > 0
    return true
  }

  const handleGenerate = async () => {
    setIsGenerating(true)
    setGenerating(true)
    setError(null)

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      })
      const data = await res.json()

      if (data.success) {
        setCurrent(data.data)
        router.push('/itinerary')
      } else {
        setError(data.error || 'Lỗi tạo lịch trình')
        alert('Lỗi: ' + (data.error || 'Không thể tạo lịch trình'))
      }
    } catch (err: any) {
      setError(err.message)
      alert('Lỗi kết nối: ' + err.message)
    } finally {
      setIsGenerating(false)
      setGenerating(false)
    }
  }

  return (
    <main className="min-h-screen bg-navy-950 bg-luxury-pattern flex flex-col">
      {/* Header */}
      <header className="border-b border-navy-700/50 px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Compass size={20} className="text-gold-400" />
          <span className="font-display text-xl text-cream-100">Indochina Travel Pro</span>
        </div>
        <div className="text-xs text-navy-500 tracking-widest uppercase">
          Bước {step} / {STEPS.length}
        </div>
      </header>

      {/* Step Indicator */}
      <div className="px-8 py-6 border-b border-navy-800">
        <div className="max-w-2xl mx-auto flex items-center">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center flex-1">
              <button
                onClick={() => i + 1 < step && setStep(i + 1)}
                className={`
                  flex items-center gap-1.5 text-xs tracking-widest uppercase
                  transition-colors flex-shrink-0
                  ${step === i + 1 ? 'text-gold-400' :
                    step > i + 1 ? 'text-emerald-400 cursor-pointer' :
                    'text-navy-600 cursor-default'}
                `}
              >
                <div className={`
                  w-6 h-6 border flex items-center justify-center text-[10px]
                  ${step === i + 1 ? 'border-gold-400' :
                    step > i + 1 ? 'border-emerald-500' : 'border-navy-700'}
                `}>
                  {step > i + 1 ? <Check size={10} /> : i + 1}
                </div>
                <span className="hidden md:block">{s.label}</span>
              </button>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-px mx-3
                  ${step > i + 1 ? 'bg-emerald-500/30' : 'bg-navy-700'}`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="flex-1 flex items-center justify-center px-8 py-12">
        <div className="w-full max-w-3xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {step === 1 && (
                <Step1Duration
                  value={request.duration || 7}
                  onChange={v => setRequest({ duration: v })}
                />
              )}
              {step === 2 && (
                <Step2StartPoint
                  value={request.startPoint || ''}
                  onChange={v => setRequest({ startPoint: v })}
                />
              )}
              {step === 3 && (
                <Step3Destinations
                  value={request.destinations || []}
                  onChange={v => setRequest({ destinations: v })}
                />
              )}
              {step === 4 && (
                <Step4Interests
                  value={request.interests || []}
                  onChange={v => setRequest({ interests: v })}
                />
              )}
              {step === 5 && (
                <Step5Special
                  value={request.specialRequirements || ''}
                  onChange={v => setRequest({ specialRequirements: v })}
                  groupSize={request.groupSize || 2}
                  onGroupSize={v => setRequest({ groupSize: v })}
                  travelStyle={request.travelStyle || 'Standard'}
                  onTravelStyle={v => setRequest({ travelStyle: v as any })}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Navigation */}
      <div className="border-t border-navy-800 px-8 py-6">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button
            onClick={() => step > 1 ? setStep(step - 1) : router.push('/')}
            className="btn-outline-gold flex items-center gap-2 text-sm"
          >
            <ChevronLeft size={16} />
            {step === 1 ? 'Trang chủ' : 'Quay lại'}
          </button>

          {step < STEPS.length ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canNext()}
              className={`btn-gold flex items-center gap-2 text-sm
                ${!canNext() ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              Tiếp theo
              <ChevronRight size={16} />
            </button>
          ) : (
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="btn-gold flex items-center gap-2 text-sm"
            >
              {isGenerating ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  AI đang tạo lịch trình...
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  Tạo Hành Trình AI
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </main>
  )
}

// Add Sparkles to imports above
