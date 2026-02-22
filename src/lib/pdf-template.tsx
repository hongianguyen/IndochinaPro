import 'server-only'
import type { Itinerary, DayData } from '@/types'

// ── Color Palette ─────────────────────────────────────────────────────────────
const NAVY_DARK = '#08152a'
const NAVY_MED = '#1a3a6b'
const GOLD = '#d4a017'
const CREAM = '#f9f2e3'
const CREAM_ALT = '#f0e8d5'
const WHITE = '#ffffff'

// ── Google Static Maps Route URL Builder ──────────────────────────────────────
function buildStaticMapUrl(destinations: string[], startPoint: string): string | null {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  if (!apiKey) return null

  const allPoints = [startPoint, ...destinations]
  const markers = allPoints
    .map((loc, i) => `markers=color:0xd4a017%7Clabel:${i === 0 ? 'S' : String(i)}%7C${encodeURIComponent(loc)}`)
    .join('&')

  // Build path (polyline) through all points
  const pathPoints = allPoints.map(loc => encodeURIComponent(loc)).join('%7C')
  const path = `path=color:0xd4a01799%7Cweight:3%7C${pathPoints}`

  return `https://maps.googleapis.com/maps/api/staticmap?${markers}&${path}&size=480x220&maptype=roadmap&style=feature:all%7Celement:geometry.fill%7Ccolor:0x1a3a6b&style=feature:water%7Ccolor:0x08152a&key=${apiKey}`
}

// ── Fetch image buffer from URL ────────────────────────────────────────────────
async function fetchImageBuffer(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const arrayBuffer = await res.arrayBuffer()
    return Buffer.from(arrayBuffer)
  } catch {
    return null
  }
}

export async function generatePDF(itinerary: Itinerary): Promise<Buffer> {
  const PDFDocument = (await import('pdfkit')).default

  // Pre-fetch map image if possible
  const mapUrl = buildStaticMapUrl(itinerary.request.destinations, itinerary.request.startPoint)
  const mapBuffer = mapUrl ? await fetchImageBuffer(mapUrl) : null

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 0,
      info: {
        Title: itinerary.title,
        Author: 'Indochina Travel Pro',
      },
    })

    const chunks: Buffer[] = []
    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const W = 595.28  // A4 width in points
    const H = 841.89  // A4 height in points

    const hexToRgb = (hex: string): [number, number, number] => {
      const r = parseInt(hex.slice(1, 3), 16)
      const g = parseInt(hex.slice(3, 5), 16)
      const b = parseInt(hex.slice(5, 7), 16)
      return [r, g, b]
    }

    const fill = (hex: string) => doc.fillColor(hexToRgb(hex))
    const stroke = (hex: string) => doc.strokeColor(hexToRgb(hex))

    // ── COVER PAGE ─────────────────────────────────────────────────────────────
    doc.rect(0, 0, W, H).fill(hexToRgb(NAVY_DARK))

    // Gold accent bar
    doc.rect(50, 60, 3, 120).fill(hexToRgb(GOLD))

    // Logo
    fill(CREAM).fontSize(18).font('Helvetica-Bold').text('Indochina Travel', 65, 70)
    fill(GOLD).fontSize(8).font('Helvetica').text('P R O  ·  A I  I T I N E R A R Y', 65, 94, { characterSpacing: 3 })

    // Main title
    fill(CREAM).fontSize(44).font('Helvetica-Bold')
      .text(itinerary.title, 50, 180, { width: W - 100, lineGap: 4 })

    // Subtitle
    const titleHeight = doc.heightOfString(itinerary.title, { width: W - 100 })
    fill(GOLD).fontSize(20).font('Helvetica-Oblique')
      .text(itinerary.subtitle, 50, 200 + titleHeight, { width: W - 100 })

    // Gold divider
    stroke(GOLD).opacity(0.3).lineWidth(1)
      .moveTo(50, H - 120).lineTo(W - 50, H - 120).stroke()
    doc.opacity(1)

    // Bottom meta bar
    doc.rect(0, H - 100, W, 100).fill(hexToRgb(NAVY_MED))

    const coverMetas = [
      { label: 'DURATION', value: `${itinerary.request.duration} Days` },
      { label: 'STARTING FROM', value: itinerary.request.startPoint },
      { label: 'DESTINATIONS', value: itinerary.request.destinations.slice(0, 2).join(' · ') },
      { label: 'GENERATED', value: new Date(itinerary.generatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) },
    ]
    coverMetas.forEach((m, i) => {
      const x = 50 + i * (W - 100) / 4
      fill(GOLD).fontSize(7).font('Helvetica').text(m.label, x, H - 85, { characterSpacing: 2 })
      fill(CREAM).fontSize(11).font('Helvetica').text(m.value, x, H - 70)
    })

    // ── SUMMARY PAGE ───────────────────────────────────────────────────────────
    doc.addPage()
    doc.rect(0, 0, W, H).fill(hexToRgb(CREAM))

    fill(NAVY_DARK).fontSize(30).font('Helvetica-Bold').text('Journey Overview', 50, 50)
    stroke(GOLD).lineWidth(2).moveTo(50, 90).lineTo(W - 50, 90).stroke()

    // Meta boxes
    const summaryBoxes = [
      { label: 'DURATION', value: `${itinerary.request.duration} Days` },
      { label: 'DEPARTURE', value: itinerary.request.startPoint },
      { label: 'GROUP SIZE', value: String(itinerary.request.groupSize || 'N/A') },
      { label: 'STYLE', value: itinerary.request.travelStyle || 'Standard' },
    ]
    const bw = (W - 100 - 30) / 4
    summaryBoxes.forEach((b, i) => {
      const bx = 50 + i * (bw + 10)
      doc.rect(bx, 106, bw, 56).fill(hexToRgb(NAVY_DARK))
      fill(GOLD).fontSize(7).font('Helvetica').text(b.label, bx + 10, 116, { characterSpacing: 2 })
      fill(CREAM).fontSize(12).font('Helvetica-Bold').text(b.value, bx + 10, 132)
    })

    // Overview text
    fill(NAVY_DARK).fontSize(11).font('Helvetica')
      .text(itinerary.overview || '', 50, 180, { width: W - 100, lineGap: 5 })

    // Highlights
    let hy = 270
    fill(GOLD).fontSize(8).font('Helvetica').text('JOURNEY HIGHLIGHTS', 50, hy, { characterSpacing: 2 })
    hy += 18
    itinerary.highlights.forEach(h => {
      fill(GOLD).fontSize(8).text('◆', 50, hy)
      fill(NAVY_DARK).fontSize(10).font('Helvetica').text(h, 66, hy, { width: W - 120 })
      hy += doc.heightOfString(h, { width: W - 120 }) + 8
    })

    // Interests tags
    if (itinerary.request.interests.length > 0) {
      hy += 10
      fill(GOLD).fontSize(8).font('Helvetica').text('TRAVEL INTERESTS', 50, hy, { characterSpacing: 2 })
      hy += 18
      let tx = 50
      itinerary.request.interests.forEach(interest => {
        const tw = doc.widthOfString(interest) + 20
        if (tx + tw > W - 50) { tx = 50; hy += 26 }
        stroke(NAVY_MED).lineWidth(1).rect(tx, hy, tw, 20).stroke()
        fill(NAVY_DARK).fontSize(9).font('Helvetica').text(interest, tx + 10, hy + 5)
        tx += tw + 8
      })
      hy += 34
    }

    // Route Map
    if (mapBuffer) {
      hy += 10
      fill(GOLD).fontSize(8).font('Helvetica').text('ROUTE MAP', 50, hy, { characterSpacing: 2 })
      hy += 14
      try {
        doc.image(mapBuffer, 50, hy, { width: W - 100, height: 200 })
        // Map border
        stroke(NAVY_MED).lineWidth(1).rect(50, hy, W - 100, 200).stroke()
      } catch { /* skip if image fails */ }
    }

    // ── DAY PAGES ──────────────────────────────────────────────────────────────
    itinerary.days.forEach((day: DayData) => {
      doc.addPage()
      doc.rect(0, 0, W, H).fill(hexToRgb(CREAM_ALT))

      // ── Day Header (dark navy band) ──
      doc.rect(0, 0, W, 90).fill(hexToRgb(NAVY_DARK))

      // Day number box
      stroke(GOLD).lineWidth(1.5).rect(50, 14, 56, 60).stroke()
      fill(GOLD).fontSize(7).font('Helvetica').text('DAY', 64, 22, { characterSpacing: 3 })
      fill(CREAM).fontSize(30).font('Helvetica-Bold').text(String(day.dayNumber), 62, 34)

      // Highlights — large gold text, primary visual element
      fill(GOLD).fontSize(15).font('Helvetica-Bold')
        .text(day.highlights, 120, 14, { width: W - 175, lineGap: 3 })

      // Pickup → Dropoff quick summary
      fill(CREAM).fillOpacity(0.6).fontSize(9).font('Helvetica')
        .text(`${day.pickupPlace}  →  ${day.dropoffPlace}`, 120, 60, { width: W - 175 })
      doc.fillOpacity(1)

      let bodyY = 100

      // ── Destination Image ──
      if (day.imageUrl) {
        try {
          doc.image(day.imageUrl, 0, bodyY, { width: W, height: 110, cover: [W, 110] })
          // Dark overlay for readability
          doc.rect(0, bodyY, W, 110).fillOpacity(0.25).fill(hexToRgb(NAVY_DARK))
          doc.fillOpacity(1)
          bodyY += 118
        } catch { bodyY += 0 }
      }

      // ── Experience Section (narrative) ──
      if (day.experience) {
        const expPad = 14
        const expH = Math.min(120, doc.heightOfString(day.experience, { width: W - 100 - expPad * 2 }) + expPad * 2)
        doc.rect(50, bodyY, W - 100, expH).fill(hexToRgb(WHITE))
        stroke(GOLD).lineWidth(3).moveTo(50, bodyY).lineTo(50, bodyY + expH).stroke()
        fill(NAVY_DARK).fontSize(9).font('Helvetica-Oblique')
          .text(day.experience, 50 + expPad + 3, bodyY + expPad, { width: W - 100 - expPad * 2 - 3 })
        bodyY += expH + 10
      }

      // ── Info Grid ──────────────────────────────────────────────────────────
      const colW = (W - 110) / 2
      const col1X = 50
      const col2X = 60 + colW
      let y1 = bodyY + 6
      let y2 = bodyY + 6

      // Helper: draw a dark card field
      const drawCard = (x: number, y: number, label: string, value: string, w: number, valueColor = CREAM, highlight = false): number => {
        const valueH = doc.heightOfString(value, { width: w - 20 })
        const bh = highlight ? 48 : Math.max(44, valueH + 24)
        doc.rect(x, y, w, bh).fill(hexToRgb(NAVY_DARK))
        fill(GOLD).fontSize(6).font('Helvetica').text(label, x + 10, y + 8, { characterSpacing: 2 })
        if (highlight) {
          fill(GOLD).fontSize(18).font('Helvetica-Bold').text(value, x + 10, y + 20)
        } else {
          fill(valueColor).fontSize(9).font('Helvetica').text(value, x + 10, y + 22, { width: w - 20 })
        }
        return y + bh + 5
      }

      // Column 1: Pickup & Drop-off
      y1 = drawCard(col1X, y1, 'PICKUP PLACE', day.pickupPlace, colW)
      y1 = drawCard(col1X, y1, 'PICKUP TIME', day.pickupTime, colW, CREAM, true)
      y1 = drawCard(col1X, y1, 'DROP-OFF PLACE', day.dropoffPlace, colW)
      y1 = drawCard(col1X, y1, 'DROP-OFF TIME', day.dropoffTime, colW, CREAM, true)
      if (day.accommodation) {
        doc.rect(col1X, y1, colW, 2).fill(hexToRgb(GOLD))
        y1 += 7
        y1 = drawCard(col1X, y1, 'ACCOMMODATION', day.accommodation, colW)
      }

      // Column 2: Meals
      fill(GOLD).fontSize(6).font('Helvetica').text('MEALS', col2X, y2 + 4, { characterSpacing: 2 })
      y2 += 18
      const mw = (colW - 10) / 3
      const mealRows = [
        { label: 'BREAKFAST (B)', value: day.meals.breakfast },
        { label: 'LUNCH (L)', value: day.meals.lunch },
        { label: 'DINNER (D)', value: day.meals.dinner },
      ]
      mealRows.forEach((meal, i) => {
        const mx = col2X + i * (mw + 5)
        const mh = Math.max(56, doc.heightOfString(String(meal.value), { width: mw - 14 }) + 28)
        doc.rect(mx, y2, mw, mh).fill(hexToRgb(NAVY_DARK))
        fill(GOLD).fontSize(6).font('Helvetica').text(meal.label, mx + 7, y2 + 7, { characterSpacing: 0.5 })
        fill(CREAM).fontSize(8).font('Helvetica').text(String(meal.value), mx + 7, y2 + 22, { width: mw - 14 })
      })
      y2 += 76

      // Column 2: Transport
      if (day.transportation && day.transportation.length > 0) {
        fill(GOLD).fontSize(6).font('Helvetica').text('TRANSPORT', col2X, y2 + 4, { characterSpacing: 2 })
        y2 += 18
        day.transportation.forEach(t => {
          doc.rect(col2X, y2, colW, 62).fill(hexToRgb(NAVY_DARK))
          doc.rect(col2X, y2, 3, 62).fill(hexToRgb(GOLD))

          fill(GOLD).fontSize(7).font('Helvetica-Bold')
            .text(`${t.type}${t.flightNumber ? ' · ' + t.flightNumber : ''}`, col2X + 11, y2 + 8)
          fill(CREAM).fontSize(7).font('Helvetica').text(t.class, col2X + colW - 52, y2 + 8)

          // ETD
          fill(GOLD).fontSize(13).font('Helvetica-Bold').text(t.etd, col2X + 11, y2 + 21)
          fill(CREAM).fontSize(7).font('Helvetica').text(t.departure, col2X + 11, y2 + 38)

          // Arrow
          fill(CREAM).fontSize(11).text('→', col2X + colW / 2 - 8, y2 + 24)

          // ETA
          fill(GOLD).fontSize(13).font('Helvetica-Bold').text(t.eta, col2X + colW - 55, y2 + 21)
          fill(CREAM).fontSize(7).font('Helvetica').text(t.arrival, col2X + colW - 55, y2 + 38)

          if (t.operator) {
            fill(CREAM).fillOpacity(0.5).fontSize(7).font('Helvetica')
              .text(t.operator, col2X + 11, y2 + 50, { width: colW - 20 })
            doc.fillOpacity(1)
          }
          y2 += 67
        })
      }

      // ── Page Footer ──
      doc.rect(0, H - 30, W, 30).fill(hexToRgb(NAVY_DARK))
      fill(GOLD).fontSize(7).font('Helvetica')
        .text('Indochina Travel Pro', 50, H - 18, { characterSpacing: 2 })
      fill(GOLD).fontSize(7).font('Helvetica')
        .text(`Day ${day.dayNumber} of ${itinerary.request.duration}`, W - 120, H - 18)
    })

    doc.end()
  })
}
