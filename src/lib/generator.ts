import 'server-only'

/**
 * Itinerary Generator — GPT-4o + RAG + Structured Knowledge Hub
 * Master Travel Consultant persona — Premium English output
 */

import OpenAI from 'openai'
import { retrieveRelevantTours } from './rag-engine'
import { loadStructuredKnowledge, buildKnowledgeBlock, matchHotels } from './knowledge-hub'
import type { Itinerary, ItineraryRequest, DayData } from '@/types'
import { randomUUID } from 'crypto'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// ─── Master Travel Consultant System Prompt ──────────────────────────────────
function buildSystemPrompt(knowledgeBlock: string, totalDays: number): string {
  return `You are a MASTER TRAVEL CONSULTANT for Indochina Travel Pro — a premium luxury travel brand serving discerning travelers from North America and Canada. You have 20+ years of expertise curating bespoke journeys across Vietnam, Cambodia, Laos, Myanmar, and Thailand.

YOUR PERSONA:
- Speak with sophistication, warmth, and authority
- Your language is polished, evocative, and aspirational — befitting a premium travel brand
- Use vivid sensory language that makes clients visualize the experience
- Reference specific cultural insights, local knowledge, and insider tips
- All output MUST be in professional English — ABSOLUTELY NO Vietnamese

═══════════════════════════════════════════════════════
ABSOLUTE RULE — NUMBER OF DAYS: ${totalDays}
You MUST generate EXACTLY ${totalDays} day objects in the "days" array.
The "days" array MUST contain exactly ${totalDays} elements.
dayNumber must go from 1 to ${totalDays} — no skipping, no stopping early.
DO NOT stop at 1 day. DO NOT abbreviate. Generate ALL ${totalDays} days.
═══════════════════════════════════════════════════════

MANDATORY OUTPUT RULES:
Every day MUST return a JSON object with EXACTLY these fields:

1. "highlights" — Headline: key destinations using format "CITY NAME - ACTIVITY" separated by " | " (e.g. "HANOI - ARRIVAL | CITY TOUR", "HA LONG BAY - OVERNIGHT CRUISE")
2. "experience" — THIS IS THE MOST IMPORTANT FIELD. Write a FULL, DETAILED day description that BLENDS step-by-step tour operator itinerary WITH atmospheric, evocative narrative. Include specific times, actions, transitions, AND sensory/cultural details woven together. It should read like a premium tour program — professional yet inspiring. Must be at least 3-4 paragraphs.
3. "pickupPlace" — Specific pickup location name
4. "pickupTime" — Time in HH:MM format
5. "dropoffPlace" — Specific drop-off location name
6. "dropoffTime" — Time in HH:MM format
7. "meals" — Object with breakfast, lunch, dinner (include specific restaurant names when possible)
8. "transportation" — Array with type, class, operator, departure, arrival, etd, eta. PRIORITIZE data from Logistics Rules if provided.
9. "hotel" — Hotel name for overnight stay. MUST be sourced from Hotel Master Database if provided, matching guest interests/tags.
10. "imageKeyword" — Primary landmark name for image fetching (e.g. "Halong Bay Vietnam")

ADDITIONAL OPTIONAL FIELDS:
- "activities" — Array of specific activities
- "notes" — Special notes for the day

QUALITY STANDARDS:
- Use REAL location names, logical driving/flying times, and accurate ETD/ETA
- Restaurant recommendations should be specific and renowned
- Transportation details must be realistic and well-researched
- Hotel selections must match the travel style and interests
- Every description should transport the reader to that destination

${knowledgeBlock}

CRITICAL: Return PURE JSON only — no markdown code blocks, no prose outside the JSON. The JSON must be valid and parseable.
CRITICAL: The "days" array MUST have EXACTLY ${totalDays} elements. This is NON-NEGOTIABLE.`
}

function buildUserPrompt(
  request: ItineraryRequest,
  ragContext: string[],
  hotelSuggestions: string
): string {
  const contextSection = ragContext.length
    ? `\n\nREFERENCE DATA FROM 2,000+ CURATED TOUR PROGRAMS:\n${ragContext.slice(0, 5).join('\n---\n')}`
    : ''

  const hotelSection = hotelSuggestions
    ? `\n\nRECOMMENDED HOTELS (from Hotel Master Database — prioritize these):\n${hotelSuggestions}`
    : ''

  // Build day list to reinforce the count
  const dayList = Array.from({ length: request.duration }, (_, i) => `Day ${i + 1}`).join(', ')

  return `Craft a ${request.duration}-day extraordinary journey for:

CLIENT PROFILE:
- Starting Point: ${request.startPoint}
- Destinations: ${request.destinations.join(', ')}
- Interests: ${request.interests.join(', ')}
- Group Size: ${request.groupSize || 2} travelers
- Travel Style: ${request.travelStyle || 'Standard'}
- Special Requirements: ${request.specialRequirements || 'None'}
${contextSection}
${hotelSection}

IMPORTANT: You MUST generate ALL ${request.duration} days: ${dayList}.
Each day must be a separate object in the "days" array.

Return a JSON object with this EXACT structure:
{
  "title": "Evocative, aspirational journey title (English)",
  "subtitle": "Compelling tagline that captures the essence of the trip",
  "overview": "2-3 sentences painting a vivid picture of the entire journey — make the client dream",
  "highlights": ["Top highlight 1", "Top highlight 2", "Top highlight 3", "Top highlight 4"],
  "days": [
    {
      "dayNumber": 1,
      "highlights": "HANOI - ARRIVAL | OLD QUARTER DISCOVERY",
      "experience": "Arrive at Noi Bai International Airport where your English-speaking guide greets you at arrivals with a warm welcome. Transfer by private car to the Sofitel Legend Metropole in the heart of the Old Quarter (approx. 45 minutes), crossing the iconic Long Bien Bridge en route.\n\nAfter checking in and freshening up, at 14:00 you step into the labyrinthine 36 Old Streets — a living museum where each lane bears the name of the guild that once defined it. The air hums with the clatter of artisan workshops as you weave through Hang Bac (Silver Street) and pause at the 11th-century Bach Ma Temple, Hanoi's oldest pagoda. At 15:30, climb aboard a cyclo for a leisurely ride through the vibrant Dong Xuan Market district, where vendors have traded for over a century.\n\nBy 16:30, savor Hanoi's legendary egg coffee at Cafe Giang — a frothy, custard-like creation invented in the 1940s when milk was scarce. Return to the hotel by 18:00 to freshen up. At 19:00, dinner awaits at Cha Ca La Vong, where turmeric-marinated fish has been served at the same address since 1871 — a true Hanoi institution.",
      "pickupPlace": "Noi Bai International Airport",
      "pickupTime": "12:00",
      "dropoffPlace": "Sofitel Legend Metropole Hanoi",
      "dropoffTime": "21:00",
      "meals": {
        "breakfast": "On arrival — not included",
        "lunch": "La Badiane Restaurant — French-Vietnamese fusion",
        "dinner": "Cha Ca La Vong — legendary turmeric fish since 1871"
      },
      "transportation": [
        {
          "type": "Car",
          "operator": "Private luxury sedan with guide",
          "departure": "Noi Bai Airport",
          "arrival": "Hanoi Old Quarter",
          "etd": "12:30",
          "eta": "13:15",
          "class": "Premium"
        }
      ],
      "hotel": "Sofitel Legend Metropole Hanoi",
      "activities": ["Airport meet & greet", "Walking tour 36 Old Streets", "Cyclo ride", "Egg coffee at Cafe Giang"],
      "imageKeyword": "Hanoi Old Quarter Vietnam"
    },
    ... (continue for ALL ${request.duration} days — dayNumber 2, 3, 4... up to ${request.duration})
  ]
}

Remember: the "days" array MUST contain EXACTLY ${request.duration} day objects.`
}

export async function generateItinerary(
  request: ItineraryRequest
): Promise<Itinerary> {
  // Load structured knowledge
  const knowledge = await loadStructuredKnowledge()
  const knowledgeBlock = buildKnowledgeBlock(knowledge)

  // Build RAG query
  const ragQuery = `${request.destinations.join(' ')} ${request.interests.join(' ')} ${request.duration} day luxury tour`
  const ragContext = await retrieveRelevantTours(ragQuery, 8)

  // Build hotel suggestions from master DB
  let hotelSuggestions = ''
  if (knowledge.hotelMaster && knowledge.hotelMaster.length > 0) {
    const allDestinations = [request.startPoint, ...request.destinations]
    const suggestions: string[] = []
    for (const dest of allDestinations) {
      const matched = matchHotels(
        knowledge.hotelMaster,
        request.interests,
        dest,
        request.travelStyle
      )
      if (matched.length > 0) {
        suggestions.push(
          `${dest}: ${matched.slice(0, 3).map(h => `${h.name} (${h.stars || '?'}★, Tags: ${h.tags.join(', ')})`).join(' | ')}`
        )
      }
    }
    hotelSuggestions = suggestions.join('\n')
  }

  const systemPrompt = buildSystemPrompt(knowledgeBlock, request.duration)
  const userPrompt = buildUserPrompt(request, ragContext, hotelSuggestions)

  // Scale max_tokens based on duration — ~1200 tokens per day
  const maxTokens = Math.min(16384, Math.max(4096, request.duration * 1500))

  let rawResponse = ''
  let parsedDays: any[] = []

  // Attempt up to 2 tries to get the correct number of days
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const messages: any[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ]

      // If retry, add a reminder about the missing days
      if (attempt > 0 && parsedDays.length > 0) {
        messages.push({
          role: 'assistant',
          content: rawResponse,
        })
        messages.push({
          role: 'user',
          content: `You only generated ${parsedDays.length} days but I need EXACTLY ${request.duration} days. Please regenerate the COMPLETE itinerary with ALL ${request.duration} days in the "days" array. Return the full JSON again.`,
        })
      }

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages,
        temperature: 0.7,
        max_tokens: maxTokens,
        response_format: { type: 'json_object' },
      })

      rawResponse = completion.choices[0].message.content || '{}'
      const parsed = JSON.parse(rawResponse)
      parsedDays = parsed.days || []

      // Check if we got enough days
      if (parsedDays.length >= request.duration) {
        // Success — map and return
        return buildItinerary(parsed, request, ragContext)
      }

      console.warn(`Attempt ${attempt + 1}: Got ${parsedDays.length}/${request.duration} days, retrying...`)

    } catch (err: any) {
      console.error(`Attempt ${attempt + 1} failed:`, err.message)
      if (attempt === 1) throw err
    }
  }

  // If we still don't have enough days, pad with placeholder days
  const parsed = JSON.parse(rawResponse)
  return buildItinerary(parsed, request, ragContext)
}

function buildItinerary(
  parsed: any,
  request: ItineraryRequest,
  ragContext: string[]
): Itinerary {
  let days: DayData[] = (parsed.days || []).map((day: any, i: number) => ({
    dayNumber: day.dayNumber || i + 1,
    highlights: day.highlights || `Day ${i + 1} — ${request.destinations[0] || 'Indochina Discovery'}`,
    experience: day.experience || '',
    pickupPlace: day.pickupPlace || 'Hotel lobby',
    pickupTime: day.pickupTime || '08:00',
    dropoffPlace: day.dropoffPlace || 'Hotel',
    dropoffTime: day.dropoffTime || '21:00',
    meals: {
      breakfast: day.meals?.breakfast || 'Buffet breakfast at hotel',
      lunch: day.meals?.lunch || 'Included',
      dinner: day.meals?.dinner || 'Included',
    },
    transportation: (day.transportation || []).map((t: any) => ({
      type: t.type || t.mode || 'Car',
      flightNumber: t.flightNumber,
      trainNumber: t.trainNumber,
      operator: t.operator || '',
      departure: t.departure || t.from || '',
      arrival: t.arrival || t.to || '',
      etd: t.etd || '',
      eta: t.eta || '',
      class: t.class || 'Standard',
      notes: t.notes,
    })),
    hotel: day.hotel || day.accommodation || '',
    activities: day.activities || [],
    accommodation: day.hotel || day.accommodation || '',
    notes: day.notes,
    imageKeyword: day.imageKeyword || request.destinations[0] || 'Vietnam travel',
  }))

  // Ensure we have the correct number of days — pad if needed
  while (days.length < request.duration) {
    const dayNum = days.length + 1
    const destIdx = (dayNum - 1) % request.destinations.length
    const dest = request.destinations[destIdx] || 'the region'
    days.push({
      dayNumber: dayNum,
      highlights: `${dest.toUpperCase()} - FREE DAY EXPLORATION`,
      experience: `After breakfast at the hotel, Day ${dayNum} offers a wonderful opportunity to explore ${dest} at your leisure. Your English-speaking guide remains available to suggest hidden gems and local favorites — from tucked-away artisan workshops to serene pagodas off the beaten path. Enjoy a leisurely lunch at a local restaurant recommended by your guide. In the afternoon, you may choose to visit a local market, take a cooking class, or simply relax at the hotel spa. Return to the hotel by 18:00. Dinner is at a local restaurant selected by your guide.`,
      pickupPlace: 'Hotel lobby',
      pickupTime: '08:00',
      dropoffPlace: 'Hotel',
      dropoffTime: '18:00',
      meals: { breakfast: 'Buffet breakfast at hotel', lunch: 'Included', dinner: 'Included' },
      transportation: [],
      hotel: days[days.length - 1]?.hotel || '',
      activities: [],
      imageKeyword: dest || 'Vietnam travel',
    })
  }

  return {
    id: randomUUID(),
    title: parsed.title || `${request.destinations.join(' — ')} Journey`,
    subtitle: parsed.subtitle || `${request.duration}-Day Indochina Discovery`,
    request,
    days: days.slice(0, request.duration),
    overview: parsed.overview || '',
    highlights: parsed.highlights || [],
    generatedAt: new Date().toISOString(),
    ragSources: ragContext.length ? [`${ragContext.length} reference programs from database`] : [],
  }
}

// Streaming version for real-time UI
export async function* generateItineraryStream(request: ItineraryRequest) {
  const knowledge = await loadStructuredKnowledge()
  const knowledgeBlock = buildKnowledgeBlock(knowledge)

  const ragQuery = `${request.destinations.join(' ')} ${request.interests.join(' ')} ${request.duration} days luxury`

  yield { type: 'status', message: 'Searching curated tour database...' }

  const ragContext = await retrieveRelevantTours(ragQuery, 8)

  yield {
    type: 'status',
    message: `Found ${ragContext.length} reference programs. Crafting your bespoke ${request.duration}-day itinerary...`
  }

  const systemPrompt = buildSystemPrompt(knowledgeBlock, request.duration)
  const userPrompt = buildUserPrompt(request, ragContext, '')
  const maxTokens = Math.min(16384, Math.max(4096, request.duration * 1500))

  const stream = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.7,
    max_tokens: maxTokens,
    stream: true,
    response_format: { type: 'json_object' },
  })

  let buffer = ''
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content || ''
    buffer += delta
    yield { type: 'chunk', content: delta }
  }

  yield { type: 'done', buffer }
}
