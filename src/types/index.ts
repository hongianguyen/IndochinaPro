// ============================================
// INDOCHINA TRAVEL PRO — TYPE DEFINITIONS
// ============================================

export type TransportType = 'Car' | 'Flight' | 'Boat' | 'Ferry' | 'Train' | 'Bus' | 'Speedboat' | 'Seaplane'
export type ServiceClass = 'Economy' | 'Business' | 'First Class' | 'Private' | 'Standard' | 'Premium'
export type MealType = 'Included' | 'Not Included' | 'Optional'

// ─── Core Day Structure (7 bắt buộc fields) ───────────────────────────────────
export interface DayData {
  dayNumber: number
  date?: string

  /** 1. Highlights: Tóm tắt điểm nhấn chính */
  highlights: string

  /** 2. Pickup Place */
  pickupPlace: string

  /** 3. Pickup Time */
  pickupTime: string

  /** 4. Drop-off Place */
  dropoffPlace: string

  /** 5. Drop-off Time */
  dropoffTime: string

  /** 6. Meals */
  meals: {
    breakfast: string | MealType
    lunch: string | MealType
    dinner: string | MealType
  }

  /** 7. Transportation Details */
  transportation: TransportDetail[]

  /** 8. Experience narrative (1-2 paragraphs, English) */
  experience?: string

  /** Optional enrichment */
  activities?: string[]
  accommodation?: string
  notes?: string
  imageKeyword?: string // for Unsplash / image fetch
  imageUrl?: string
}

export interface TransportDetail {
  type: TransportType
  flightNumber?: string
  trainNumber?: string
  operator?: string
  departure: string    // location
  arrival: string      // location
  etd: string          // Estimated Time of Departure
  eta: string          // Estimated Time of Arrival
  class: ServiceClass
  notes?: string
}

// ─── Itinerary (full trip) ─────────────────────────────────────────────────────
export type InterestTheme =
  | 'Culture & Heritage'
  | 'Food & Culinary'
  | 'Family & Kids'
  | 'Adventure & Trekking'
  | 'Beach & Relaxation'
  | 'Photography'
  | 'Wildlife & Nature'
  | 'Luxury & Wellness'
  | 'Budget Friendly'
  | 'Honeymoon & Romance'

export interface ItineraryRequest {
  duration: number                    // Step 1: số ngày
  startPoint: string                  // Step 2: điểm bắt đầu
  destinations: string[]              // Step 3: điểm đến mong muốn
  interests: InterestTheme[]          // Step 4: sở thích
  specialRequirements?: string        // Step 5: yêu cầu đặc biệt
  groupSize?: number
  travelStyle?: 'Budget' | 'Standard' | 'Luxury'
}

export interface Itinerary {
  id: string
  title: string
  subtitle: string
  request: ItineraryRequest
  days: DayData[]
  overview: string
  highlights: string[]
  generatedAt: string
  ragSources?: string[]  // filenames used from vector DB
}

// ─── Ingestion / Data Pipeline ─────────────────────────────────────────────────
export type IngestionPhase =
  | 'idle'
  | 'uploading'
  | 'extracting'
  | 'reading'
  | 'vectorizing'
  | 'done'
  | 'error'

export interface IngestionStatus {
  phase: IngestionPhase
  totalFiles: number
  processedFiles: number
  currentFile: string
  vectorsCreated: number
  errors: string[]
  startedAt?: string
  completedAt?: string
}

// ─── API Responses ──────────────────────────────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export interface StatusResponse {
  vectorStoreReady: boolean
  documentCount: number
  lastIngested?: string
}
