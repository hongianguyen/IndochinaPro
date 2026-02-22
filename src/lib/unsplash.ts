import 'server-only'

/**
 * Unsplash Image Fetcher
 * Fetches destination images for PDF export
 */

const UNSPLASH_BASE = 'https://api.unsplash.com'
const ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY

const cache = new Map<string, string>()

export async function fetchDestinationImage(query: string): Promise<string | null> {
  if (!ACCESS_KEY) {
    console.warn('No Unsplash key configured')
    return null
  }

  // Check cache
  if (cache.has(query)) return cache.get(query)!

  try {
    const res = await fetch(
      `${UNSPLASH_BASE}/search/photos?query=${encodeURIComponent(query + ' travel landscape')}&per_page=1&orientation=landscape`,
      {
        headers: {
          Authorization: `Client-ID ${ACCESS_KEY}`,
        },
      }
    )

    if (!res.ok) return null

    const data = await res.json()
    const url = data.results?.[0]?.urls?.regular || null

    if (url) cache.set(query, url)
    return url
  } catch (err) {
    console.error('Unsplash fetch error:', err)
    return null
  }
}

export async function enrichDaysWithImages(days: any[]): Promise<any[]> {
  return Promise.all(
    days.map(async (day) => {
      const imageUrl = await fetchDestinationImage(
        day.imageKeyword || day.dropoffPlace || 'Vietnam travel'
      )
      return { ...day, imageUrl }
    })
  )
}
