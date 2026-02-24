import 'server-only'
import type { StructuredKnowledge, HotelEntry } from '@/types'

// ─── Config ─────────────────────────────────────────────────────────────────────
const USE_SUPABASE = !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY)

const STRUCTURED_FILES = [
    '1_brand_guidelines.md',
    '2_core_principles.md',
    '3_logistics_rules.json',
    '4_hotel_master.json',
]

// ─── In-Memory Cache ───────────────────────────────────────────────────────────
let cachedKnowledge: StructuredKnowledge | null = null

// ─── Supabase Client (lazy) ─────────────────────────────────────────────────────
async function getSupabase() {
    const { createClient } = await import('@supabase/supabase-js')
    return createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_KEY!
    )
}

// ─── Load Structured Knowledge ──────────────────────────────────────────────────

/**
 * Load and cache all 4 structured knowledge files.
 * Primary: Supabase table `structured_knowledge`
 * Fallback: Local filesystem `data/structured/`
 */
export async function loadStructuredKnowledge(): Promise<StructuredKnowledge> {
    if (cachedKnowledge) return cachedKnowledge

    const knowledge: StructuredKnowledge = {}

    if (USE_SUPABASE) {
        // ── Supabase Mode ──
        try {
            const supabase = await getSupabase()
            const { data, error } = await supabase
                .from('structured_knowledge')
                .select('filename, content')

            if (!error && data && data.length > 0) {
                for (const row of data) {
                    applyFileContent(knowledge, row.filename, row.content)
                }
            }
        } catch (err) {
            console.error('Supabase structured knowledge load error:', err)
        }
    }

    // ── Fallback: Local filesystem (works in dev / if Supabase has no data) ──
    if (!knowledge.brandGuidelines && !knowledge.corePrinciples &&
        !knowledge.logisticsRules && !knowledge.hotelMaster) {
        try {
            const fs = await import('fs/promises')
            const path = await import('path')
            const DATA_DIR = path.join(process.cwd(), 'data', 'structured')

            for (const filename of STRUCTURED_FILES) {
                try {
                    const content = await fs.readFile(path.join(DATA_DIR, filename), 'utf-8')
                    if (content) applyFileContent(knowledge, filename, content)
                } catch { }
            }
        } catch { }
    }

    cachedKnowledge = knowledge
    return knowledge
}

/**
 * Apply a file's content to the knowledge object based on filename
 */
function applyFileContent(knowledge: StructuredKnowledge, filename: string, content: string): void {
    const lower = filename.toLowerCase()
    if (lower.includes('brand_guidelines')) {
        knowledge.brandGuidelines = content
    } else if (lower.includes('core_principles')) {
        knowledge.corePrinciples = content
    } else if (lower.includes('logistics_rules')) {
        try { knowledge.logisticsRules = JSON.parse(content) } catch {
            knowledge.logisticsRules = content
        }
    } else if (lower.includes('hotel_master')) {
        try {
            const parsed = JSON.parse(content)
            knowledge.hotelMaster = flattenHotelData(parsed)
        } catch { }
    }
}

/**
 * Flatten nested hotel JSON (countries → cities → hotels) into HotelEntry[]
 * Supports both flat array format and nested format
 */
function flattenHotelData(data: any): HotelEntry[] {
    // Already a flat array
    if (Array.isArray(data)) return data

    // Nested format: { countries: [{ cities: [{ city, hotels: [...] }] }] }
    const hotels: HotelEntry[] = []

    const countries = data.countries || []
    for (const country of countries) {
        const cities = country.cities || []
        for (const cityObj of cities) {
            const cityName = cityObj.city || ''
            for (const hotel of (cityObj.hotels || [])) {
                hotels.push({
                    name: hotel.name,
                    city: cityName,
                    category: hotel.notable || '',
                    stars: hotel.stars,
                    tags: inferHotelTags(hotel, cityName),
                    description: hotel.notable || '',
                    priceRange: hotel.stars >= 5 ? '$$$' : hotel.stars >= 4 ? '$$' : '$',
                })
            }
        }
    }

    return hotels
}

/**
 * Infer interest tags from hotel data (since source JSON doesn't have explicit tags)
 */
function inferHotelTags(hotel: any, city: string): string[] {
    const tags: string[] = []
    const text = `${hotel.name} ${hotel.notable || ''} ${hotel.address || ''}`.toLowerCase()

    if (text.includes('spa') || text.includes('wellness') || text.includes('retreat'))
        tags.push('Luxury & Wellness')
    if (text.includes('beach') || text.includes('island') || text.includes('bay') || text.includes('resort'))
        tags.push('Beach & Relaxation')
    if (text.includes('heritage') || text.includes('colonial') || text.includes('historic') || text.includes('temple'))
        tags.push('Culture & Heritage')
    if (text.includes('boutique') || text.includes('romantic') || text.includes('villa'))
        tags.push('Honeymoon & Romance')
    if (text.includes('mountain') || text.includes('trek') || text.includes('nature') || text.includes('eco'))
        tags.push('Adventure & Trekking')
    if (text.includes('pool') || text.includes('panoram') || text.includes('view'))
        tags.push('Photography')
    if (hotel.stars >= 5)
        tags.push('Luxury & Wellness')
    if (hotel.stars <= 3)
        tags.push('Budget Friendly')

    // Deduplicate
    return [...new Set(tags)]
}

/**
 * Clear the cache (call after re-ingestion)
 */
export function clearKnowledgeCache(): void {
    cachedKnowledge = null
}

// ─── Save Structured File ───────────────────────────────────────────────────────

/**
 * Save a structured file — to Supabase if configured, otherwise local disk
 */
export async function saveStructuredFile(filename: string, content: string | Buffer): Promise<void> {
    const textContent = typeof content === 'string' ? content : content.toString('utf-8')

    if (USE_SUPABASE) {
        try {
            const supabase = await getSupabase()
            const { error } = await supabase
                .from('structured_knowledge')
                .upsert(
                    { filename, content: textContent, updated_at: new Date().toISOString() },
                    { onConflict: 'filename' }
                )
            if (error) {
                console.error('Supabase save error:', error.message)
                // If table doesn't exist, try to create it and retry
                if (error.message.includes('does not exist') || error.code === '42P01') {
                    await ensureSupabaseTable()
                    const { error: retryError } = await supabase
                        .from('structured_knowledge')
                        .upsert(
                            { filename, content: textContent, updated_at: new Date().toISOString() },
                            { onConflict: 'filename' }
                        )
                    if (retryError) throw retryError
                } else {
                    throw error
                }
            }
        } catch (err) {
            console.error('Failed to save to Supabase, falling back to local:', err)
            await saveToLocal(filename, textContent)
        }
    } else {
        await saveToLocal(filename, textContent)
    }

    clearKnowledgeCache()
}

/**
 * Save to local filesystem (dev fallback)
 */
async function saveToLocal(filename: string, content: string): Promise<void> {
    const fs = await import('fs/promises')
    const path = await import('path')
    const DATA_DIR = path.join(process.cwd(), 'data', 'structured')
    await fs.mkdir(DATA_DIR, { recursive: true })
    await fs.writeFile(path.join(DATA_DIR, filename), content, 'utf-8')
}

/**
 * Create the structured_knowledge table if it doesn't exist
 */
async function ensureSupabaseTable(): Promise<void> {
    try {
        const supabase = await getSupabase()
        await supabase.rpc('exec_sql', {
            sql: `
        CREATE TABLE IF NOT EXISTS structured_knowledge (
          filename TEXT PRIMARY KEY,
          content TEXT NOT NULL,
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `
        })
    } catch (err) {
        console.error('Could not auto-create table. Please create it manually:', err)
    }
}

// ─── Check Status ───────────────────────────────────────────────────────────────

/**
 * Check which structured files are available
 */
export async function getStructuredFileStatus(): Promise<string[]> {
    if (USE_SUPABASE) {
        try {
            const supabase = await getSupabase()
            const { data, error } = await supabase
                .from('structured_knowledge')
                .select('filename')
            if (!error && data) {
                return data
                    .map((d: any) => d.filename)
                    .filter((f: string) => STRUCTURED_FILES.includes(f))
            }
        } catch { }
    }

    // Fallback: local files
    const found: string[] = []
    try {
        const fs = await import('fs/promises')
        const path = await import('path')
        const DATA_DIR = path.join(process.cwd(), 'data', 'structured')
        for (const f of STRUCTURED_FILES) {
            try {
                await fs.access(path.join(DATA_DIR, f))
                found.push(f)
            } catch { }
        }
    } catch { }
    return found
}

// ─── Query Helpers ──────────────────────────────────────────────────────────────

/**
 * Find hotels matching user interests and destination city.
 * Prioritizes by tag overlap count.
 */
export function matchHotels(
    hotels: HotelEntry[] | undefined,
    interests: string[],
    city?: string,
    travelStyle?: string
): HotelEntry[] {
    if (!hotels || hotels.length === 0) return []

    const interestLower = interests.map(i => i.toLowerCase())

    return hotels
        .filter(h => {
            if (city && !h.city.toLowerCase().includes(city.toLowerCase())) return false
            if (travelStyle === 'Budget' && h.stars && h.stars > 3) return false
            if (travelStyle === 'Luxury' && h.stars && h.stars < 4) return false
            return true
        })
        .map(h => ({
            hotel: h,
            score: h.tags.reduce((sum, tag) =>
                sum + (interestLower.some(i => tag.toLowerCase().includes(i) || i.includes(tag.toLowerCase())) ? 1 : 0)
                , 0),
        }))
        .sort((a, b) => b.score - a.score)
        .map(h => h.hotel)
}

/**
 * Build a concise logistics summary for a specific route segment
 */
export function lookupLogistics(
    rules: any,
    from: string,
    to: string
): string | null {
    if (!rules) return null

    const routes = rules.routes || rules.segments || rules
    if (!Array.isArray(routes)) return null

    const fromLower = from.toLowerCase()
    const toLower = to.toLowerCase()

    const match = routes.find((r: any) => {
        const rFrom = (r.from || r.departure || r.origin || '').toLowerCase()
        const rTo = (r.to || r.arrival || r.destination || '').toLowerCase()
        return (rFrom.includes(fromLower) || fromLower.includes(rFrom)) &&
            (rTo.includes(toLower) || toLower.includes(rTo))
    })

    if (match) {
        return JSON.stringify(match, null, 2)
    }
    return null
}

/**
 * Build the System Prompt injection block with structured knowledge
 */
export function buildKnowledgeBlock(knowledge: StructuredKnowledge): string {
    const sections: string[] = []

    if (knowledge.brandGuidelines) {
        sections.push(`=== BRAND GUIDELINES (MANDATORY) ===\n${knowledge.brandGuidelines}`)
    }

    if (knowledge.corePrinciples) {
        sections.push(`=== CORE PRINCIPLES (MANDATORY) ===\n${knowledge.corePrinciples}`)
    }

    if (knowledge.logisticsRules) {
        const logisticsStr = typeof knowledge.logisticsRules === 'string'
            ? knowledge.logisticsRules
            : JSON.stringify(knowledge.logisticsRules, null, 2)
        const maxLen = 4000
        const truncated = logisticsStr.length > maxLen
            ? logisticsStr.slice(0, maxLen) + '\n... [truncated — use route-specific lookup]'
            : logisticsStr
        sections.push(`=== LOGISTICS RULES (HIGHEST PRIORITY for Transport) ===\n${truncated}`)
    }

    if (knowledge.hotelMaster && knowledge.hotelMaster.length > 0) {
        const hotelSummary = knowledge.hotelMaster.slice(0, 50).map(h =>
            `• ${h.name} (${h.city}) — ${h.stars || '?'}★ — Tags: ${h.tags.join(', ')}`
        ).join('\n')
        sections.push(`=== HOTEL MASTER DATABASE (Use for accommodation selection) ===\n${hotelSummary}`)
    }

    return sections.length > 0
        ? `\n\n--- STRUCTURED KNOWLEDGE HUB (Supreme Authority) ---\n${sections.join('\n\n')}\n--- END KNOWLEDGE HUB ---\n`
        : ''
}
