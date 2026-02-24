import 'server-only'
import fs from 'fs/promises'
import path from 'path'
import type { StructuredKnowledge, HotelEntry } from '@/types'

// ─── In-Memory Cache ───────────────────────────────────────────────────────────
let cachedKnowledge: StructuredKnowledge | null = null

const DATA_DIR = path.join(process.cwd(), 'data', 'structured')

/**
 * Load and cache all 4 structured knowledge files.
 * These are injected directly into the System Prompt or used for query logic.
 */
export async function loadStructuredKnowledge(): Promise<StructuredKnowledge> {
    if (cachedKnowledge) return cachedKnowledge

    const knowledge: StructuredKnowledge = {}

    try {
        const brandPath = path.join(DATA_DIR, '1_brand_guidelines.md')
        knowledge.brandGuidelines = await safeReadText(brandPath)
    } catch { }

    try {
        const principlesPath = path.join(DATA_DIR, '2_core_principles.md')
        knowledge.corePrinciples = await safeReadText(principlesPath)
    } catch { }

    try {
        const logisticsPath = path.join(DATA_DIR, '3_logistics_rules.json')
        const raw = await safeReadText(logisticsPath)
        if (raw) knowledge.logisticsRules = JSON.parse(raw)
    } catch { }

    try {
        const hotelPath = path.join(DATA_DIR, '4_hotel_master.json')
        const raw = await safeReadText(hotelPath)
        if (raw) knowledge.hotelMaster = JSON.parse(raw)
    } catch { }

    cachedKnowledge = knowledge
    return knowledge
}

/**
 * Clear the cache (call after re-ingestion)
 */
export function clearKnowledgeCache(): void {
    cachedKnowledge = null
}

/**
 * Save structured files extracted from ZIP to the data/structured directory
 */
export async function saveStructuredFile(filename: string, content: string | Buffer): Promise<void> {
    await fs.mkdir(DATA_DIR, { recursive: true })
    const filePath = path.join(DATA_DIR, filename)
    await fs.writeFile(filePath, content, 'utf-8')
    clearKnowledgeCache()
}

/**
 * Check which structured files are available
 */
export async function getStructuredFileStatus(): Promise<string[]> {
    const expected = [
        '1_brand_guidelines.md',
        '2_core_principles.md',
        '3_logistics_rules.json',
        '4_hotel_master.json',
    ]
    const found: string[] = []
    for (const f of expected) {
        try {
            await fs.access(path.join(DATA_DIR, f))
            found.push(f)
        } catch { }
    }
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

    // Try to find matching route in logistics rules
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
        // Truncate if too large
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

// ─── Utilities ──────────────────────────────────────────────────────────────────

async function safeReadText(filePath: string): Promise<string | undefined> {
    try {
        return await fs.readFile(filePath, 'utf-8')
    } catch {
        return undefined
    }
}
