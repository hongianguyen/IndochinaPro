import { NextRequest } from 'next/server'
import { generateItinerary } from '@/lib/generator'
import type { ItineraryRequest } from '@/types'

export const runtime = 'nodejs'
export const maxDuration = 120

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const request = body as ItineraryRequest

    // Validate
    if (!request.duration || !request.startPoint || !request.destinations?.length) {
      return Response.json(
        { success: false, error: 'Missing required information. Please provide duration, start point, and destinations.' },
        { status: 400 }
      )
    }

    const itinerary = await generateItinerary(request)

    return Response.json({ success: true, data: itinerary })
  } catch (err: any) {
    console.error('Generate error:', err)
    return Response.json(
      { success: false, error: err.message || 'Failed to generate itinerary. Please try again.' },
      { status: 500 }
    )
  }
}
