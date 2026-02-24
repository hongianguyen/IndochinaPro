// ============================================
// INDOCHINA TRAVEL PRO — TYPE DEFINITIONS
// ============================================

export type TransportType = 'Car' | 'Flight' | 'Boat' | 'Ferry' | 'Train' | 'Bus' | 'Speedboat' | 'Seaplane'
export type ServiceClass = 'Economy' | 'Business' | 'First Class' | 'Private' | 'Standard' | 'Premium'
export type MealType = 'Included' | 'Not Included' | 'Optional'

// ─── Core Day Structure (strict JSON schema) ──────────────────────────────────
export interface DayData {
  dayNumber: number
  date?: string

  /** 1. Highlights: key destinations separated by " | " */
  highlights: string

  /** 2. Experience: 1-2 rich English paragraphs */
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
  duration: number
  startPoint: string
  destinations: string[]
  interests: InterestTheme[]
  specialRequirements?: string
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
  ragSources?: string[]
}

// ─── Structured Knowledge Hub ──────────────────────────────────────────────────
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
  structuredFilesFound: string[]
  errors: string[]
  startedAt?: string
  completedAt?: string
}

export interface IngestionResult {
  structured: StructuredKnowledge
  unstructuredCount: number
  vectorsCreated: number
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
  structuredDataReady: boolean
  lastIngested?: string
}
