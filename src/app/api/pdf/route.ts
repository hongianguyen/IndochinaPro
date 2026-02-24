import { NextRequest } from 'next/server'
import { generatePDF } from '@/lib/pdf-template'
import { enrichDaysWithImages } from '@/lib/unsplash'
import type { Itinerary } from '@/types'

export const runtime = 'nodejs'
export const maxDuration = 120

export async function POST(req: NextRequest) {
  try {
    let itinerary: Itinerary = await req.json()

    // Enrich with Unsplash images
    if (process.env.UNSPLASH_ACCESS_KEY) {
      itinerary = {
        ...itinerary,
        days: await enrichDaysWithImages(itinerary.days),
      }
    }

    const pdfBuffer = await generatePDF(itinerary)

    // Convert Uint8Array → Buffer (required for Next.js Response)
    const buffer = Buffer.from(pdfBuffer)

    const fileName = itinerary.title
      .replace(/[^\w\s]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .concat('.pdf')

    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
        'Content-Length': String(buffer.length),
      },
    })
  } catch (err: any) {
    console.error('PDF generation error:', err)
    return Response.json(
      { success: false, error: err.message || 'Failed to generate PDF. Please try again.' },
      { status: 500 }
    )
  }
}
