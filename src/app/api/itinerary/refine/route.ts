import 'server-only'
import { NextRequest } from 'next/server'
import OpenAI from 'openai'
import { loadStructuredKnowledge, buildKnowledgeBlock } from '@/lib/knowledge-hub'

export const runtime = 'nodejs'
export const maxDuration = 120

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const REFINE_SYSTEM_PROMPT = `You are a MASTER TRAVEL CONSULTANT for Indochina Travel Pro. 
A client has an existing itinerary and wants to make changes. Your job is to:

1. Read the current itinerary JSON
2. Apply the client's requested changes
3. Return the COMPLETE updated itinerary JSON

RULES:
- ONLY modify the days/fields the client asked to change
- Keep ALL other days and fields EXACTLY as they are
- Maintain the same JSON structure with all fields: highlights, experience, pickupPlace, pickupTime, dropoffPlace, dropoffTime, meals, transportation, hotel, imageKeyword
- The "experience" field must be a BLENDED step-by-step itinerary with atmospheric narrative (specific times, actions, AND evocative descriptions)
- Use REAL location names, restaurants, and hotels
- All output in professional English
- Return PURE JSON only — no markdown, no commentary

IMPORTANT: Return the FULL itinerary JSON including title, subtitle, overview, highlights, and ALL days — not just the changed days.`

export async function POST(req: NextRequest) {
    try {
        const { currentItinerary, userPrompt, chatHistory } = await req.json()

        if (!currentItinerary || !userPrompt) {
            return Response.json(
                { success: false, error: 'Missing itinerary or prompt' },
                { status: 400 }
            )
        }

        // Load structured knowledge for context
        const knowledge = await loadStructuredKnowledge()
        const knowledgeBlock = buildKnowledgeBlock(knowledge)

        // Build conversation history for context
        const historyMessages = (chatHistory || [])
            .filter((m: any) => m.role === 'user' || m.role === 'assistant')
            .slice(-6) // Keep last 6 messages for context
            .map((m: any) => ({
                role: m.role as 'user' | 'assistant',
                content: m.content,
            }))

        const itineraryJSON = JSON.stringify(currentItinerary, null, 2)

        const completion = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                {
                    role: 'system',
                    content: REFINE_SYSTEM_PROMPT + (knowledgeBlock ? `\n\n${knowledgeBlock}` : ''),
                },
                {
                    role: 'user',
                    content: `Here is the current itinerary:\n\n${itineraryJSON}`,
                },
                ...historyMessages,
                {
                    role: 'user',
                    content: `Client request: "${userPrompt}"\n\nPlease apply this change and return the COMPLETE updated itinerary JSON.`,
                },
            ],
            temperature: 0.7,
            max_tokens: 16384,
            response_format: { type: 'json_object' },
        })

        const rawResponse = completion.choices[0].message.content || '{}'
        const updated = JSON.parse(rawResponse)

        // Validate the response has days
        if (!updated.days || !Array.isArray(updated.days) || updated.days.length === 0) {
            return Response.json(
                { success: false, error: 'AI returned invalid itinerary structure' },
                { status: 500 }
            )
        }

        // Build a summary of what changed for the chat response
        const changedDays: number[] = []
        const originalDays = currentItinerary.days || []
        for (let i = 0; i < updated.days.length; i++) {
            const orig = originalDays[i]
            const upd = updated.days[i]
            if (!orig || JSON.stringify(orig) !== JSON.stringify(upd)) {
                changedDays.push(i + 1)
            }
        }

        const summary = changedDays.length > 0
            ? `Updated Day${changedDays.length > 1 ? 's' : ''} ${changedDays.join(', ')}. The itinerary has been refreshed.`
            : 'Changes applied to the itinerary.'

        return Response.json({
            success: true,
            data: {
                ...currentItinerary,
                ...updated,
                // Preserve original metadata
                id: currentItinerary.id,
                request: currentItinerary.request,
                generatedAt: currentItinerary.generatedAt,
                ragSources: currentItinerary.ragSources,
            },
            summary,
            changedDays,
        })
    } catch (err: any) {
        console.error('Refine error:', err)
        return Response.json(
            { success: false, error: err.message || 'Failed to refine itinerary' },
            { status: 500 }
        )
    }
}
