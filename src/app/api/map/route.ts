import { NextRequest } from 'next/server'

export const runtime = 'nodejs'

/**
 * GET /api/map?points=Hanoi,Vietnam|Halong Bay,Vietnam&start=Hanoi,Vietnam
 * Proxies Google Static Maps to keep API key server-side.
 * Falls back to 404 if GOOGLE_MAPS_API_KEY is not configured.
 */
export async function GET(req: NextRequest) {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY
    if (!apiKey) {
        return new Response(JSON.stringify({ error: 'GOOGLE_MAPS_API_KEY not configured' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
        })
    }

    const { searchParams } = new URL(req.url)
    const pointsParam = searchParams.get('points') || ''
    const start = searchParams.get('start') || ''

    const rawPoints = pointsParam.split('|').filter(Boolean)
    const allPoints = [start, ...rawPoints].filter(Boolean)

    if (allPoints.length === 0) {
        return new Response('No points provided', { status: 400 })
    }

    // Build markers (gold color, labeled S / 1 / 2 / ...)
    const markers = allPoints
        .map((loc, i) =>
            `markers=color:0xd4a017%7Clabel:${i === 0 ? 'S' : String(i)}%7C${encodeURIComponent(loc)}`
        )
        .join('&')

    // Polyline path through all points
    const pathEncoded = allPoints.map(p => encodeURIComponent(p)).join('%7C')
    const path = `path=color:0xd4a01799%7Cweight:3%7C${pathEncoded}`

    // Map style — dark navy matching the brand
    const styles = [
        'style=feature:all%7Celement:geometry%7Ccolor:0x1a2744',
        'style=feature:water%7Ccolor:0x08152a',
        'style=feature:road%7Celement:geometry%7Ccolor:0x2a456b',
        'style=feature:poi%7Cvisibility:off',
        'style=feature:administrative%7Celement:labels.text.fill%7Ccolor:0xd4a017',
        'style=feature:road%7Celement:labels.text.fill%7Ccolor:0xf9f2e3',
    ].join('&')

    const mapUrl =
        `https://maps.googleapis.com/maps/api/staticmap` +
        `?${markers}&${path}&${styles}` +
        `&size=800x320&scale=2&maptype=roadmap` +
        `&key=${apiKey}`

    try {
        const res = await fetch(mapUrl)

        // Google might return an error image or non-200 status
        if (!res.ok) {
            const errorText = await res.text()
            console.error('Google Maps API error:', res.status, errorText)
            return new Response(JSON.stringify({
                error: `Google Maps returned status ${res.status}`,
                hint: 'Ensure Static Maps API is enabled in Google Cloud Console and the API key has no IP/referrer restrictions for server-side calls.',
            }), {
                status: 502,
                headers: { 'Content-Type': 'application/json' },
            })
        }

        const contentType = res.headers.get('content-type') || ''

        // Google sometimes returns JSON error instead of image
        if (contentType.includes('application/json')) {
            const errorData = await res.json()
            console.error('Google Maps API JSON error:', errorData)
            return new Response(JSON.stringify({
                error: 'Google Maps API returned an error',
                details: errorData,
                hint: 'Check: 1) Static Maps API is enabled, 2) Billing is active, 3) API key has no IP restrictions',
            }), {
                status: 502,
                headers: { 'Content-Type': 'application/json' },
            })
        }

        const imgBuffer = await res.arrayBuffer()
        return new Response(imgBuffer, {
            headers: {
                'Content-Type': 'image/png',
                'Cache-Control': 'public, max-age=3600',
            },
        })
    } catch (err: any) {
        console.error('Map fetch error:', err.message)
        return new Response(JSON.stringify({
            error: 'Failed to fetch map',
            message: err.message,
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        })
    }
}
