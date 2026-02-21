'use client'

import { motion } from 'framer-motion'
import {
  MapPin, Clock, Coffee, Utensils, Moon,
  Car, Plane, Ship, Train, ChevronDown, ChevronUp
} from 'lucide-react'
import { useState } from 'react'
import type { DayData, TransportDetail } from '@/types'

const TRANSPORT_ICONS: Record<string, React.ReactNode> = {
  Car:       <Car size={12} />,
  Flight:    <Plane size={12} />,
  Boat:      <Ship size={12} />,
  Ferry:     <Ship size={12} />,
  Speedboat: <Ship size={12} />,
  Train:     <Train size={12} />,
  Bus:       <Car size={12} />,
}

const TRANSPORT_COLORS: Record<string, string> = {
  Car:       'border-blue-500/50 text-blue-400',
  Flight:    'border-purple-500/50 text-purple-400',
  Boat:      'border-cyan-500/50 text-cyan-400',
  Ferry:     'border-cyan-500/50 text-cyan-400',
  Speedboat: 'border-cyan-500/50 text-cyan-400',
  Train:     'border-orange-500/50 text-orange-400',
  Bus:       'border-gray-500/50 text-gray-400',
}

function TransportBadge({ transport }: { transport: TransportDetail }) {
  const color = TRANSPORT_COLORS[transport.type] || 'border-navy-500 text-navy-400'
  const icon = TRANSPORT_ICONS[transport.type]

  return (
    <div className={`border rounded-sm p-4 ${color.split(' ')[0]} bg-navy-900/50`}>
      <div className="flex items-center justify-between mb-3">
        <span className={`badge-transport ${color}`}>
          {icon}
          {transport.type}
          {transport.flightNumber && ` · ${transport.flightNumber}`}
          {transport.trainNumber && ` · ${transport.trainNumber}`}
        </span>
        <span className={`text-xs font-mono font-500 px-2 py-1 border ${color}`}>
          {transport.class}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3 text-xs">
        <div>
          <div className="text-navy-500 uppercase tracking-wider mb-1">ETD</div>
          <div className="font-mono text-gold-400">{transport.etd}</div>
          <div className="text-navy-400 mt-0.5 truncate">{transport.departure}</div>
        </div>
        <div className="flex items-center justify-center">
          <div className="text-navy-600">→</div>
        </div>
        <div className="text-right">
          <div className="text-navy-500 uppercase tracking-wider mb-1">ETA</div>
          <div className="font-mono text-gold-400">{transport.eta}</div>
          <div className="text-navy-400 mt-0.5 truncate">{transport.arrival}</div>
        </div>
      </div>

      {transport.operator && (
        <div className="mt-2 pt-2 border-t border-navy-700 text-xs text-navy-400">
          {transport.operator}
        </div>
      )}
      {transport.notes && (
        <div className="text-xs text-navy-500 mt-1 italic">{transport.notes}</div>
      )}
    </div>
  )
}

export function DayCard({ day, index }: { day: DayData; index: number }) {
  const [expanded, setExpanded] = useState(index === 0)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="card-luxury overflow-hidden"
    >
      {/* Day Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start gap-6 p-6 text-left hover:bg-navy-700/20 transition-colors"
      >
        {/* Day number */}
        <div className="flex-shrink-0">
          <div className="w-14 h-14 border border-gold-500/50 flex flex-col items-center justify-center">
            <div className="text-gold-500 text-xs tracking-widest uppercase">Ngày</div>
            <div className="font-display text-2xl text-cream-100 leading-none">
              {day.dayNumber}
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-xl text-cream-100 mb-2 leading-snug">
            {day.highlights}
          </h3>
          <div className="flex flex-wrap items-center gap-4 text-xs text-navy-400">
            <span className="flex items-center gap-1">
              <MapPin size={10} className="text-gold-500" />
              {day.pickupPlace}
            </span>
            <span className="text-navy-600">→</span>
            <span className="flex items-center gap-1">
              <MapPin size={10} className="text-gold-500" />
              {day.dropoffPlace}
            </span>
            {day.transportation?.[0] && (
              <span className={`badge-transport ${TRANSPORT_COLORS[day.transportation[0].type] || 'border-navy-600 text-navy-400'}`}>
                {TRANSPORT_ICONS[day.transportation[0].type]}
                {day.transportation[0].type}
              </span>
            )}
          </div>
        </div>

        <div className="flex-shrink-0 text-navy-500 mt-1">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {/* Expanded Content — 7 Fields */}
      {expanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="border-t border-navy-700"
        >
          {/* Destination image */}
          {day.imageUrl && (
            <div className="h-48 overflow-hidden">
              <img
                src={day.imageUrl}
                alt={day.dropoffPlace}
                className="w-full h-full object-cover opacity-70"
              />
            </div>
          )}

          <div className="p-6 grid md:grid-cols-2 gap-6">
            {/* LEFT COLUMN */}
            <div className="space-y-5">
              {/* Field 1: Highlights (already in header, show activities here) */}
              {day.activities && day.activities.length > 0 && (
                <div>
                  <div className="label-field mb-2">Hoạt động trong ngày</div>
                  <ul className="space-y-1.5">
                    {day.activities.map((act, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-navy-300">
                        <span className="text-gold-500 mt-0.5">◆</span>
                        {act}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Fields 2 & 3: Pickup */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-navy-900 p-4 border border-navy-700">
                  <div className="label-field mb-2 text-[10px]">
                    📍 Pickup Place
                  </div>
                  <div className="text-cream-100 text-sm font-500">{day.pickupPlace}</div>
                </div>
                <div className="bg-navy-900 p-4 border border-navy-700">
                  <div className="label-field mb-2 text-[10px]">
                    🕐 Pickup Time
                  </div>
                  <div className="font-mono text-gold-400 text-lg">{day.pickupTime}</div>
                </div>
              </div>

              {/* Fields 4 & 5: Drop-off */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-navy-900 p-4 border border-navy-700">
                  <div className="label-field mb-2 text-[10px]">
                    🏨 Drop-off Place
                  </div>
                  <div className="text-cream-100 text-sm font-500">{day.dropoffPlace}</div>
                </div>
                <div className="bg-navy-900 p-4 border border-navy-700">
                  <div className="label-field mb-2 text-[10px]">
                    🕖 Drop-off Time
                  </div>
                  <div className="font-mono text-gold-400 text-lg">{day.dropoffTime}</div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div className="space-y-5">
              {/* Field 6: Meals */}
              <div>
                <div className="label-field mb-3">Bữa ăn (Meals)</div>
                <div className="space-y-2">
                  {[
                    { label: 'Sáng', value: day.meals.breakfast, icon: <Coffee size={12} /> },
                    { label: 'Trưa', value: day.meals.lunch, icon: <Utensils size={12} /> },
                    { label: 'Tối', value: day.meals.dinner, icon: <Moon size={12} /> },
                  ].map(meal => (
                    <div key={meal.label} className="flex items-start gap-3 bg-navy-900 px-4 py-3 border border-navy-700">
                      <div className="text-gold-500 mt-0.5 flex-shrink-0">{meal.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-navy-500 text-[10px] uppercase tracking-wider">{meal.label}</div>
                        <div className="text-cream-100 text-sm mt-0.5">{meal.value}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Field 7: Transportation Details */}
              {day.transportation && day.transportation.length > 0 && (
                <div>
                  <div className="label-field mb-3">Phương tiện (Transportation)</div>
                  <div className="space-y-3">
                    {day.transportation.map((t, i) => (
                      <TransportBadge key={i} transport={t} />
                    ))}
                  </div>
                </div>
              )}

              {/* Accommodation */}
              {day.accommodation && (
                <div className="bg-gold-500/5 border border-gold-500/20 p-4">
                  <div className="label-field mb-1 text-[10px]">🏨 Lưu trú</div>
                  <div className="text-cream-100 text-sm">{day.accommodation}</div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}
