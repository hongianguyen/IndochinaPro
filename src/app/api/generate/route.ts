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
        { success: false, error: 'Thiếu thông tin bắt buộc' },
        { status: 400 }
      )
    }

    const itinerary = await generateItinerary(request)

    return Response.json({ success: true, data: itinerary })
  } catch (err: any) {
    console.error('Generate error:', err)
    return Response.json(
      { success: false, error: err.message || 'Lỗi tạo lịch trình' },
      { status: 500 }
    )
  }
}
