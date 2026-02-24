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
function buildSystemPrompt(knowledgeBlock: string): string {
  return `You are a MASTER TRAVEL CONSULTANT for Indochina Travel Pro — a premium luxury travel brand serving discerning travelers from North America and Canada. You have 20+ years of expertise curating bespoke journeys across Vietnam, Cambodia, Laos, Myanmar, and Thailand.

YOUR PERSONA:
- Speak with sophistication, warmth, and authority
- Your language is polished, evocative, and aspirational — befitting a premium travel brand
- Use vivid sensory language that makes clients visualize the experience
- Reference specific cultural insights, local knowledge, and insider tips
- All output MUST be in professional English — ABSOLUTELY NO Vietnamese

MANDATORY OUTPUT RULES:
Every day MUST return a JSON object with EXACTLY these fields:

1. "highlights" — Key destinations separated by " | " (e.g. "Hanoi Old Quarter | Temple of Literature | Hoan Kiem Lake")
2. "experience" — 1-2+ eloquent English paragraphs describing the day's immersive activities, cultural significance, and sensory details. This is the SOUL of each day — make it unforgettable.
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

CRITICAL: Return PURE JSON only — no markdown code blocks, no prose outside the JSON. The JSON must be valid and parseable.`
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

Return a JSON object with this EXACT structure:
{
  "title": "Evocative, aspirational journey title (English)",
  "subtitle": "Compelling tagline that captures the essence of the trip",
  "overview": "2-3 sentences painting a vivid picture of the entire journey — make the client dream",
  "highlights": ["Top highlight 1", "Top highlight 2", "Top highlight 3", "Top highlight 4"],
  "days": [
    {
      "dayNumber": 1,
      "highlights": "Hanoi Old Quarter | Hoan Kiem Lake | Temple of Literature",
      "experience": "Your Indochina odyssey begins in the ancient heart of Hanoi, where centuries of Vietnamese civilization converge in the labyrinthine streets of the Old Quarter... [1-2+ rich paragraphs with sensory details, cultural context, and emotional resonance]",
      "pickupPlace": "Hotel lobby / Airport name",
      "pickupTime": "07:30",
      "dropoffPlace": "Hotel name / Final destination",
      "dropoffTime": "20:00",
      "meals": {
        "breakfast": "Buffet breakfast at Sofitel Legend Metropole",
        "lunch": "La Badiane Restaurant — exquisite French-Vietnamese fusion",
        "dinner": "Cha Ca La Vong — Hanoi's legendary turmeric fish since 1871"
      },
      "transportation": [
        {
          "type": "Car",
          "operator": "Private luxury sedan with multilingual guide",
          "departure": "Hanoi",
          "arrival": "Ninh Binh",
          "etd": "08:00",
          "eta": "10:30",
          "class": "Premium",
          "notes": "English-speaking driver and guide"
        }
      ],
      "hotel": "Sofitel Legend Metropole Hanoi",
      "activities": ["Guided cyclo tour through the 36 Old Streets", "Private boat ride on Hoan Kiem Lake"],
      "imageKeyword": "Hanoi Old Quarter Vietnam"
    }
  ]
}`
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

  const systemPrompt = buildSystemPrompt(knowledgeBlock)
  const userPrompt = buildUserPrompt(request, ragContext, hotelSuggestions)

  let rawResponse = ''

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 16384,
      response_format: { type: 'json_object' },
    })

    rawResponse = completion.choices[0].message.content || '{}'
  } catch (err: any) {
    console.error('First attempt failed, retrying:', err.message)
    // Fallback retry
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 16384,
      response_format: { type: 'json_object' },
    })
    rawResponse = completion.choices[0].message.content || '{}'
  }

  const parsed = JSON.parse(rawResponse)

  // Map and validate all fields per day — enforce strict schema
  const days: DayData[] = (parsed.days || []).map((day: any, i: number) => ({
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
      type: t.type || 'Car',
      flightNumber: t.flightNumber,
      trainNumber: t.trainNumber,
      operator: t.operator || '',
      departure: t.departure || '',
      arrival: t.arrival || '',
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

  return {
    id: randomUUID(),
    title: parsed.title || `${request.destinations.join(' — ')} Journey`,
    subtitle: parsed.subtitle || `${request.duration}-Day Indochina Discovery`,
    request,
    days,
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
    message: `Found ${ragContext.length} reference programs. Crafting your bespoke itinerary...`
  }

  const systemPrompt = buildSystemPrompt(knowledgeBlock)
  const userPrompt = buildUserPrompt(request, ragContext, '')

  const stream = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.7,
    max_tokens: 16384,
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
