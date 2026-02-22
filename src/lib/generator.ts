import 'server-only'

/**
 * Itinerary Generator — GPT-4o + RAG
 * Generates structured day-by-day itineraries in professional English
 */

import OpenAI from 'openai'
import { retrieveRelevantTours } from './rag-engine'
import type { Itinerary, ItineraryRequest, DayData } from '@/types'
import { randomUUID } from 'crypto'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const SYSTEM_PROMPT = `You are a Professional Travel Consultant specializing in Indochina luxury travel with 20 years of expertise.
You craft DETAILED, REALISTIC itineraries grounded in real operational knowledge from 2,000+ tour programs across Vietnam, Cambodia, Laos, Myanmar, and Thailand.

MANDATORY RULES:
- Every day's JSON object MUST contain all 8 required fields: highlights, experience, pickupPlace, pickupTime, dropoffPlace, dropoffTime, meals, transportation, imageKeyword
- Use SPECIFIC real locations, logical timings, and appropriate transport for each route
- "experience": Write 1–2 rich English paragraphs describing the day's activities and their cultural significance — this is the heart of each day
- "highlights": List key landmarks separated by " | " (e.g. "Hanoi Old Quarter | Hoan Kiem Lake | Temple of Literature")
- Meals: specify exact restaurant names or clear descriptions (e.g. "Buffet breakfast at hotel", "Local pho restaurant — Pho Gia Truyen")
- Transportation: include vehicle type, service class, operator, ETD/ETA
- Style: upscale, evocative, premium — befitting a luxury travel brand

IMPORTANT: Return pure JSON only — no markdown code blocks, no prose outside the JSON.`

function buildUserPrompt(request: ItineraryRequest, ragContext: string[]): string {
  const contextSection = ragContext.length
    ? `\n\nREFERENCE DATA FROM 2,000+ TOUR PROGRAMS:\n${ragContext.slice(0, 5).join('\n---\n')}`
    : ''

  return `Create a ${request.duration}-day luxury itinerary for:
- Starting Point: ${request.startPoint}
- Destinations: ${request.destinations.join(', ')}
- Interests: ${request.interests.join(', ')}
- Group Size: ${request.groupSize || 'Unspecified'} travelers
- Travel Style: ${request.travelStyle || 'Standard'}
- Special Requirements: ${request.specialRequirements || 'None'}
${contextSection}

Return a JSON object with this exact structure:
{
  "title": "Evocative itinerary title in English",
  "subtitle": "Short inspiring tagline",
  "overview": "2–3 sentence overview of the entire journey",
  "highlights": ["Top highlight 1", "Top highlight 2", "Top highlight 3"],
  "days": [
    {
      "dayNumber": 1,
      "highlights": "Hanoi Old Quarter | Hoan Kiem Lake | Temple of Literature",
      "experience": "Begin your Indochina odyssey in the timeless heart of Hanoi... [1-2 rich English paragraphs describing the day's activities and cultural significance]",
      "pickupPlace": "Exact hotel or pickup location name",
      "pickupTime": "07:30",
      "dropoffPlace": "Exact hotel or final destination name",
      "dropoffTime": "20:00",
      "meals": {
        "breakfast": "Buffet breakfast at hotel",
        "lunch": "Lunch at La Badiane Restaurant — French-Vietnamese fusion",
        "dinner": "Dinner at Cha Ca La Vong — signature turmeric fish"
      },
      "transportation": [
        {
          "type": "Car",
          "operator": "Private 7-seat air-conditioned vehicle",
          "departure": "Hanoi",
          "arrival": "Ninh Binh",
          "etd": "08:00",
          "eta": "10:30",
          "class": "Premium",
          "notes": "English-speaking driver"
        }
      ],
      "activities": ["Cyclo tour of the Old Quarter", "Dragon Boat ride on Hoan Kiem Lake"],
      "accommodation": "Hotel name where guest stays tonight",
      "imageKeyword": "Hanoi Old Quarter Vietnam"
    }
  ]
}`
}

export async function generateItinerary(
  request: ItineraryRequest
): Promise<Itinerary> {
  // Build RAG query
  const ragQuery = `${request.destinations.join(' ')} ${request.interests.join(' ')} ${request.duration} day tour`
  const ragContext = await retrieveRelevantTours(ragQuery, 8)

  const userPrompt = buildUserPrompt(request, ragContext)

  let rawResponse = ''

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 16384,
      response_format: { type: 'json_object' },
    })

    rawResponse = completion.choices[0].message.content || '{}'
  } catch (err: any) {
    // Fallback retry
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 16384,
      response_format: { type: 'json_object' },
    })
    rawResponse = completion.choices[0].message.content || '{}'
  }

  const parsed = JSON.parse(rawResponse)

  // Map and validate all fields per day
  const days: DayData[] = (parsed.days || []).map((day: any, i: number) => ({
    dayNumber: day.dayNumber || i + 1,
    highlights: day.highlights || `Day ${i + 1} — ${request.destinations[0] || 'Indochina'}`,
    experience: day.experience || '',
    pickupPlace: day.pickupPlace || 'Hotel',
    pickupTime: day.pickupTime || '08:00',
    dropoffPlace: day.dropoffPlace || 'Hotel',
    dropoffTime: day.dropoffTime || '21:00',
    meals: {
      breakfast: day.meals?.breakfast || 'Included',
      lunch: day.meals?.lunch || 'Included',
      dinner: day.meals?.dinner || 'Included',
    },
    transportation: day.transportation || [],
    activities: day.activities || [],
    accommodation: day.accommodation,
    notes: day.notes,
    imageKeyword: day.imageKeyword || request.destinations[0],
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
  const ragQuery = `${request.destinations.join(' ')} ${request.interests.join(' ')} ${request.duration} days`

  yield { type: 'status', message: 'Searching for relevant tour data...' }

  const ragContext = await retrieveRelevantTours(ragQuery, 8)

  yield {
    type: 'status',
    message: `Found ${ragContext.length} reference programs. Crafting your itinerary...`
  }

  const userPrompt = buildUserPrompt(request, ragContext)

  const stream = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
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
