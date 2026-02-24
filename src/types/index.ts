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

  /** 1. Highlights / Headline: key destinations separated by " | " */
  highlights: string

  /** 2. Experience: blended step-by-step itinerary + atmospheric narrative */
  experience: string

  /** 3. Pickup: location & time */
  pickupPlace: string
  pickupTime: string

  /** 4. Drop-off: location & time */
  dropoffPlace: string
  dropoffTime: string

  /** 5. Meals */
  meals: {
    breakfast: string | MealType
    lunch: string | MealType
    dinner: string | MealType
  }

  /** 6. Transportation Details */
  transportation: TransportDetail[]

  /** 7. Hotel / Accommodation (sourced from 4_hotel_master.json) */
  hotel: string

  /** 8. Image search keyword */
  imageKeyword: string

  /** Optional enrichment */
  activities?: string[]
  accommodation?: string  // kept for backward compat
  notes?: string
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
  | 'parsing-structured'
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
  structuredFilesFound?: string[]
}

// ─── Structured Knowledge (4 authority files) ──────────────────────────────────
export interface StructuredKnowledge {
  brandGuidelines?: string       // 1_brand_guidelines.md
  corePrinciples?: string        // 2_core_principles.md
  logisticsRules?: any           // 3_logistics_rules.json (parsed)
  hotelMaster?: HotelEntry[]     // 4_hotel_master.json (parsed)
}

export interface HotelEntry {
  name: string
  city: string
  category: string
  stars?: number
  tags: string[]              // matched against user interests
  description?: string
  priceRange?: string
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

