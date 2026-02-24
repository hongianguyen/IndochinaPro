import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Itinerary, ItineraryRequest, IngestionStatus } from '@/types'

// ─── Wizard Store ──────────────────────────────────────────────────────────────
interface WizardState {
  step: number
  request: Partial<ItineraryRequest>
  setStep: (step: number) => void
  setRequest: (data: Partial<ItineraryRequest>) => void
  reset: () => void
}

export const useWizardStore = create<WizardState>()((set) => ({
  step: 1,
  request: {
    duration: 7,
    destinations: [],
    interests: [],
  },
  setStep: (step) => set({ step }),
  setRequest: (data) =>
    set((state) => ({ request: { ...state.request, ...data } })),
  reset: () =>
    set({ step: 1, request: { duration: 7, destinations: [], interests: [] } }),
}))

// ─── Itinerary Store ───────────────────────────────────────────────────────────
interface ItineraryState {
  current: Itinerary | null
  history: Itinerary[]
  isGenerating: boolean
  error: string | null
  setCurrent: (itinerary: Itinerary) => void
  updateDays: (days: Itinerary['days']) => void
  setGenerating: (v: boolean) => void
  setError: (e: string | null) => void
  clearCurrent: () => void
}

export const useItineraryStore = create<ItineraryState>()(
  persist(
    (set) => ({
      current: null,
      history: [],
      isGenerating: false,
      error: null,
      setCurrent: (itinerary) =>
        set((state) => ({
          current: itinerary,
          history: [itinerary, ...state.history.slice(0, 9)],
        })),
      updateDays: (days) =>
        set((state) => ({
          current: state.current ? { ...state.current, days } : null,
        })),
      setGenerating: (isGenerating) => set({ isGenerating }),
      setError: (error) => set({ error }),
      clearCurrent: () => set({ current: null }),
    }),
    { name: 'itinerary-store' }
  )
)

// ─── Chat Store (AI Revision Assistant) ─────────────────────────────────────
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
  isRefining?: boolean // true while waiting for AI response
}

interface ChatState {
  messages: ChatMessage[]
  isRefining: boolean
  addMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => void
  setRefining: (v: boolean) => void
  clearChat: () => void
}

export const useChatStore = create<ChatState>()((set) => ({
  messages: [{
    id: 'welcome',
    role: 'assistant',
    content: "I'm your AI Travel Assistant. I can help you refine this itinerary — try asking me to swap activities, change hotels, adjust the schedule, or add new experiences to any day.",
    timestamp: new Date().toISOString(),
  }],
  isRefining: false,
  addMessage: (msg) =>
    set((state) => ({
      messages: [...state.messages, {
        ...msg,
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toISOString(),
      }],
    })),
  setRefining: (isRefining) => set({ isRefining }),
  clearChat: () => set({
    messages: [{
      id: 'welcome',
      role: 'assistant',
      content: "I'm your AI Travel Assistant. I can help you refine this itinerary — try asking me to swap activities, change hotels, adjust the schedule, or add new experiences to any day.",
      timestamp: new Date().toISOString(),
    }],
    isRefining: false,
  }),
}))

// ─── Ingestion Store ───────────────────────────────────────────────────────────
interface IngestionState {
  status: IngestionStatus
  setStatus: (s: Partial<IngestionStatus>) => void
  reset: () => void
}

const defaultIngestionStatus: IngestionStatus = {
  phase: 'idle',
  totalFiles: 0,
  processedFiles: 0,
  currentFile: '',
  vectorsCreated: 0,
  structuredFilesFound: [],
  errors: [],
}

export const useIngestionStore = create<IngestionState>()((set) => ({
  status: defaultIngestionStatus,
  setStatus: (s) =>
    set((state) => ({ status: { ...state.status, ...s } })),
  reset: () => set({ status: defaultIngestionStatus }),
}))
