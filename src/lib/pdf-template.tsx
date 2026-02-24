import 'server-only'
import type { Itinerary, DayData } from '@/types'

// ── Color Palette ─────────────────────────────────────────────────────────────
const NAVY_DARK = '#08152a'
const NAVY_MED = '#1a3a6b'
const NAVY_LIGHT = '#2a4a7b'
const GOLD = '#d4a017'
const GOLD_LIGHT = '#f5d67a'
const CREAM = '#f9f2e3'
const CREAM_ALT = '#f0e8d5'
const WHITE = '#ffffff'
const GRAY = '#8896a6'

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

  // Pre-fetch all day images
  const dayImageBuffers: Map<number, Buffer> = new Map()
  for (const day of itinerary.days) {
    if (day.imageUrl) {
      const buf = await fetchImageBuffer(day.imageUrl)
      if (buf) dayImageBuffers.set(day.dayNumber, buf)
    }
  }

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 0,
      info: {
        Title: itinerary.title,
        Author: 'Indochina Travel Pro',
        Subject: 'Luxury Travel Itinerary Proposal',
      },
    })

    const chunks: Buffer[] = []
    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const W = 595.28  // A4 width in points
    const H = 841.89  // A4 height in points
    const MARGIN = 45
    const CONTENT_W = W - MARGIN * 2

    const hexToRgb = (hex: string): [number, number, number] => {
      const r = parseInt(hex.slice(1, 3), 16)
      const g = parseInt(hex.slice(3, 5), 16)
      const b = parseInt(hex.slice(5, 7), 16)
      return [r, g, b]
    }

    const fill = (hex: string) => doc.fillColor(hexToRgb(hex))
    const stroke = (hex: string) => doc.strokeColor(hexToRgb(hex))

    // ── Helper: Page Footer ──────────────────────────────────────────────────
    const drawFooter = (pageLabel?: string) => {
      doc.rect(0, H - 28, W, 28).fill(hexToRgb(NAVY_DARK))
      fill(GOLD).fontSize(6).font('Helvetica')
        .text('INDOCHINA TRAVEL PRO  ·  AI ITINERARY PROPOSAL', MARGIN, H - 17, { characterSpacing: 2, width: CONTENT_W / 2 })
      if (pageLabel) {
        fill(GOLD).fontSize(6).font('Helvetica')
          .text(pageLabel, W - MARGIN - 100, H - 17, { width: 100, align: 'right' })
      }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // ── COVER PAGE ──────────────────────────────────────────────────────────
    // ══════════════════════════════════════════════════════════════════════════
    doc.rect(0, 0, W, H).fill(hexToRgb(NAVY_DARK))

    // Top accent line
    doc.rect(MARGIN, 40, 3, 130).fill(hexToRgb(GOLD))

    // Brand logo
    fill(CREAM).fontSize(20).font('Helvetica-Bold').text('INDOCHINA TRAVEL', MARGIN + 16, 50)
    fill(GOLD).fontSize(8).font('Helvetica').text('P R O  ·  L U X U R Y  J O U R N E Y S', MARGIN + 16, 76, { characterSpacing: 2 })

    // Decorative line
    stroke(GOLD).opacity(0.2).lineWidth(0.5)
      .moveTo(MARGIN, 160).lineTo(W - MARGIN, 160).stroke()
    doc.opacity(1)

    // Main title
    fill(CREAM).fontSize(44).font('Helvetica-Bold')
      .text(itinerary.title, MARGIN, 190, { width: CONTENT_W, lineGap: 4 })

    // Subtitle
    const titleH = doc.heightOfString(itinerary.title, { width: CONTENT_W })
    fill(GOLD).fontSize(20).font('Helvetica-Oblique')
      .text(itinerary.subtitle, MARGIN, 210 + titleH, { width: CONTENT_W })

    // Decorative diamond
    const diamondY = 350 + titleH
    fill(GOLD).fontSize(10).text('◆', W / 2 - 5, diamondY)
    stroke(GOLD).opacity(0.15).lineWidth(0.5)
      .moveTo(MARGIN, diamondY + 5).lineTo(W / 2 - 15, diamondY + 5).stroke()
    stroke(GOLD)
      .moveTo(W / 2 + 15, diamondY + 5).lineTo(W - MARGIN, diamondY + 5).stroke()
    doc.opacity(1)

    // Bottom meta band
    doc.rect(0, H - 100, W, 100).fill(hexToRgb(NAVY_MED))

    const coverMetas = [
      { label: 'DURATION', value: `${itinerary.request.duration} Days` },
      { label: 'DEPARTING FROM', value: itinerary.request.startPoint },
      { label: 'DESTINATIONS', value: itinerary.request.destinations.slice(0, 3).join(' · ') },
      { label: 'CREATED', value: new Date(itinerary.generatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) },
    ]
    const metaW = CONTENT_W / 4
    coverMetas.forEach((m, i) => {
      const mx = MARGIN + i * metaW
      fill(GOLD).fontSize(6).font('Helvetica').text(m.label, mx, H - 82, { characterSpacing: 2 })
      fill(CREAM).fontSize(10).font('Helvetica-Bold').text(m.value, mx, H - 66, { width: metaW - 10 })
    })

    // ══════════════════════════════════════════════════════════════════════════
    // ── SUMMARY PAGE ────────────────────────────────────────────────────────
    // ══════════════════════════════════════════════════════════════════════════
    doc.addPage()
    doc.rect(0, 0, W, H).fill(hexToRgb(CREAM))

    // Section header
    fill(NAVY_DARK).fontSize(28).font('Helvetica-Bold').text('Journey Overview', MARGIN, MARGIN + 5)
    stroke(GOLD).lineWidth(2).moveTo(MARGIN, MARGIN + 42).lineTo(MARGIN + 150, MARGIN + 42).stroke()

    // Meta info boxes
    const summaryBoxes = [
      { label: 'DURATION', value: `${itinerary.request.duration} Days` },
      { label: 'DEPARTURE', value: itinerary.request.startPoint },
      { label: 'TRAVELERS', value: String(itinerary.request.groupSize || 'N/A') },
      { label: 'STYLE', value: itinerary.request.travelStyle || 'Standard' },
    ]
    const boxW = (CONTENT_W - 15) / 4
    summaryBoxes.forEach((b, i) => {
      const bx = MARGIN + i * (boxW + 5)
      doc.rect(bx, MARGIN + 54, boxW, 50).fill(hexToRgb(NAVY_DARK))
      fill(GOLD).fontSize(6).font('Helvetica').text(b.label, bx + 10, MARGIN + 66, { characterSpacing: 2 })
      fill(CREAM).fontSize(11).font('Helvetica-Bold').text(b.value, bx + 10, MARGIN + 80)
    })

    // Overview text
    let curY = MARGIN + 120
    fill(NAVY_DARK).fontSize(10).font('Helvetica')
      .text(itinerary.overview || '', MARGIN, curY, { width: CONTENT_W, lineGap: 5 })
    curY += doc.heightOfString(itinerary.overview || '', { width: CONTENT_W }) + 16

    // Journey Highlights
    if (itinerary.highlights.length > 0) {
      fill(GOLD).fontSize(7).font('Helvetica').text('JOURNEY HIGHLIGHTS', MARGIN, curY, { characterSpacing: 2 })
      curY += 16
      itinerary.highlights.forEach(h => {
        fill(GOLD).fontSize(8).text('◆', MARGIN, curY)
        fill(NAVY_DARK).fontSize(10).font('Helvetica').text(h, MARGIN + 14, curY, { width: CONTENT_W - 14 })
        curY += doc.heightOfString(h, { width: CONTENT_W - 14 }) + 6
      })
      curY += 8
    }

    // Interest tags
    if (itinerary.request.interests.length > 0) {
      fill(GOLD).fontSize(7).font('Helvetica').text('TRAVEL INTERESTS', MARGIN, curY, { characterSpacing: 2 })
      curY += 16
      let tx = MARGIN
      itinerary.request.interests.forEach(interest => {
        const tw = doc.widthOfString(interest) + 18
        if (tx + tw > W - MARGIN) { tx = MARGIN; curY += 24 }
        stroke(NAVY_MED).lineWidth(0.8).rect(tx, curY, tw, 18).stroke()
        fill(NAVY_DARK).fontSize(8).font('Helvetica').text(interest, tx + 9, curY + 4)
        tx += tw + 6
      })
      curY += 32
    }

    // Route Map
    if (mapBuffer) {
      fill(GOLD).fontSize(7).font('Helvetica').text('DYNAMIC ROUTE MAP', MARGIN, curY, { characterSpacing: 2 })
      curY += 12
      try {
        const mapH = Math.min(190, H - curY - 50)
        doc.image(mapBuffer, MARGIN, curY, { width: CONTENT_W, height: mapH })
        stroke(NAVY_MED).lineWidth(0.5).rect(MARGIN, curY, CONTENT_W, mapH).stroke()
        curY += mapH + 8
        // Map legend
        const allPts = [itinerary.request.startPoint, ...itinerary.request.destinations]
        fill(GRAY).fontSize(7).font('Helvetica')
          .text(allPts.map((p, i) => `${i === 0 ? 'S' : i}: ${p}`).join('  ·  '), MARGIN, curY, { width: CONTENT_W })
      } catch { /* skip */ }
    }

    drawFooter()

    // ══════════════════════════════════════════════════════════════════════════
    // ── DAY PAGES — Professional Grid Layout ────────────────────────────────
    // ══════════════════════════════════════════════════════════════════════════
    itinerary.days.forEach((day: DayData) => {
      doc.addPage()
      doc.rect(0, 0, W, H).fill(hexToRgb(CREAM_ALT))

      // ── Day Header Band ──
      doc.rect(0, 0, W, 82).fill(hexToRgb(NAVY_DARK))

      // Day number box
      stroke(GOLD).lineWidth(1.5).rect(MARGIN, 12, 50, 56).stroke()
      fill(GOLD).fontSize(6).font('Helvetica').text('D A Y', MARGIN + 12, 18, { characterSpacing: 2 })
      fill(CREAM).fontSize(28).font('Helvetica-Bold').text(String(day.dayNumber), MARGIN + 12, 30)

      // Highlights — BOLD, prominent gold text
      fill(GOLD).fontSize(14).font('Helvetica-Bold')
        .text(day.highlights, MARGIN + 62, 12, { width: CONTENT_W - 62, lineGap: 2 })

      // Quick route summary
      fill(CREAM).fillOpacity(0.5).fontSize(8).font('Helvetica')
        .text(`${day.pickupPlace} → ${day.dropoffPlace}  ·  ${day.pickupTime} – ${day.dropoffTime}`, MARGIN + 62, 58, { width: CONTENT_W - 62 })
      doc.fillOpacity(1)

      let bodyY = 90

      // ── Image + Experience Side-by-Side ──
      const imgBuffer = dayImageBuffers.get(day.dayNumber)
      const hasImage = !!imgBuffer

      if (day.experience) {
        const boxPad = 10

        if (hasImage) {
          // Two-column layout: Image left, Experience right
          const imgW = 180
          const expW = CONTENT_W - imgW - 8

          // Image column
          try {
            doc.image(imgBuffer!, MARGIN, bodyY, { width: imgW, height: 130, cover: [imgW, 130] as any })
            stroke(GOLD).lineWidth(0.5).rect(MARGIN, bodyY, imgW, 130).stroke()
          } catch { }

          // Experience column
          const expX = MARGIN + imgW + 8
          doc.rect(expX, bodyY, expW, 130).fill(hexToRgb(WHITE))
          stroke(GOLD).lineWidth(2).moveTo(expX, bodyY).lineTo(expX, bodyY + 130).stroke()

          fill(GOLD).fontSize(6).font('Helvetica').text('THE EXPERIENCE', expX + boxPad, bodyY + 8, { characterSpacing: 2 })
          fill(NAVY_DARK).fontSize(8).font('Helvetica-Oblique')
            .text(day.experience, expX + boxPad, bodyY + 22, { width: expW - boxPad * 2, height: 100, ellipsis: true })

          bodyY += 138
        } else {
          // Full-width experience
          const expH = Math.min(110, doc.heightOfString(day.experience, { width: CONTENT_W - boxPad * 2 }) + boxPad * 2 + 14)
          doc.rect(MARGIN, bodyY, CONTENT_W, expH).fill(hexToRgb(WHITE))
          stroke(GOLD).lineWidth(2).moveTo(MARGIN, bodyY).lineTo(MARGIN, bodyY + expH).stroke()

          fill(GOLD).fontSize(6).font('Helvetica').text('THE EXPERIENCE', MARGIN + boxPad, bodyY + 8, { characterSpacing: 2 })
          fill(NAVY_DARK).fontSize(8.5).font('Helvetica-Oblique')
            .text(day.experience, MARGIN + boxPad, bodyY + 22, { width: CONTENT_W - boxPad * 2, height: expH - 28, ellipsis: true })

          bodyY += expH + 6
        }
      } else if (hasImage) {
        // Image only
        try {
          doc.image(imgBuffer!, MARGIN, bodyY, { width: CONTENT_W, height: 100, cover: [CONTENT_W, 100] as any })
          doc.rect(MARGIN, bodyY, CONTENT_W, 100).fillOpacity(0.15).fill(hexToRgb(NAVY_DARK))
          doc.fillOpacity(1)
        } catch { }
        bodyY += 108
      }

      // ── Professional Info Grid ────────────────────────────────────────────
      bodyY += 4
      const colW = (CONTENT_W - 6) / 2
      const col1X = MARGIN
      const col2X = MARGIN + colW + 6

      // ── Section Label Helper ──
      const sectionLabel = (x: number, y: number, label: string) => {
        fill(GOLD).fontSize(6).font('Helvetica').text(label, x, y, { characterSpacing: 2 })
        return y + 14
      }

      // ── Card Helper ──
      const drawCard = (x: number, y: number, label: string, value: string, w: number, isHighlight = false): number => {
        const valueH = doc.heightOfString(value || 'N/A', { width: w - 16 })
        const cardH = isHighlight ? 42 : Math.max(38, valueH + 22)
        doc.rect(x, y, w, cardH).fill(hexToRgb(NAVY_DARK))
        fill(GOLD).fontSize(5.5).font('Helvetica').text(label, x + 8, y + 6, { characterSpacing: 1.5 })
        if (isHighlight) {
          fill(GOLD_LIGHT).fontSize(16).font('Helvetica-Bold').text(value || 'N/A', x + 8, y + 18)
        } else {
          fill(CREAM).fontSize(8).font('Helvetica').text(value || 'N/A', x + 8, y + 18, { width: w - 16 })
        }
        return y + cardH + 3
      }

      // ── COLUMN 1: Logistics ──
      let y1 = sectionLabel(col1X, bodyY, 'LOGISTICS')

      y1 = drawCard(col1X, y1, 'PICKUP', day.pickupPlace, colW)
      y1 = drawCard(col1X, y1, 'PICKUP TIME', day.pickupTime, colW, true)
      y1 = drawCard(col1X, y1, 'DROP-OFF', day.dropoffPlace, colW)
      y1 = drawCard(col1X, y1, 'DROP-OFF TIME', day.dropoffTime, colW, true)

      // Hotel
      const hotelName = day.hotel || day.accommodation || ''
      if (hotelName) {
        doc.rect(col1X, y1, colW, 2).fill(hexToRgb(GOLD))
        y1 += 5
        y1 = drawCard(col1X, y1, '🏨 ACCOMMODATION', hotelName, colW)
      }

      // ── COLUMN 2: Meals + Transport ──
      let y2 = sectionLabel(col2X, bodyY, 'MEALS')

      // Meals row
      const mealColW = (colW - 6) / 3
      const mealRows = [
        { label: 'BREAKFAST', value: String(day.meals.breakfast) },
        { label: 'LUNCH', value: String(day.meals.lunch) },
        { label: 'DINNER', value: String(day.meals.dinner) },
      ]
      const mealH = Math.max(48, ...mealRows.map(m =>
        doc.heightOfString(m.value, { width: mealColW - 12 }) + 22
      ))

      mealRows.forEach((meal, i) => {
        const mx = col2X + i * (mealColW + 3)
        doc.rect(mx, y2, mealColW, mealH).fill(hexToRgb(NAVY_DARK))
        fill(GOLD).fontSize(5).font('Helvetica').text(meal.label, mx + 6, y2 + 6, { characterSpacing: 1 })
        fill(CREAM).fontSize(7).font('Helvetica').text(meal.value, mx + 6, y2 + 18, { width: mealColW - 12 })
      })
      y2 += mealH + 6

      // Transport section
      if (day.transportation && day.transportation.length > 0) {
        y2 = sectionLabel(col2X, y2, 'TRANSPORT')

        day.transportation.forEach(t => {
          const cardH = 56
          doc.rect(col2X, y2, colW, cardH).fill(hexToRgb(NAVY_DARK))
          doc.rect(col2X, y2, 3, cardH).fill(hexToRgb(GOLD))

          // Transport type + class
          fill(GOLD).fontSize(7).font('Helvetica-Bold')
            .text(`${t.type}${t.flightNumber ? ' · ' + t.flightNumber : ''}`, col2X + 10, y2 + 6)
          fill(CREAM).fontSize(6).font('Helvetica').text(t.class, col2X + colW - 50, y2 + 7)

          // ETD → ETA
          fill(GOLD_LIGHT).fontSize(12).font('Helvetica-Bold').text(t.etd, col2X + 10, y2 + 18)
          fill(CREAM).fontSize(6).font('Helvetica').text(t.departure, col2X + 10, y2 + 33, { width: colW / 2 - 15 })

          fill(CREAM).fontSize(10).text('→', col2X + colW / 2 - 5, y2 + 20)

          fill(GOLD_LIGHT).fontSize(12).font('Helvetica-Bold').text(t.eta, col2X + colW - 50, y2 + 18)
          fill(CREAM).fontSize(6).font('Helvetica').text(t.arrival, col2X + colW - 50, y2 + 33, { width: 45 })

          if (t.operator) {
            fill(CREAM).fillOpacity(0.5).fontSize(6).font('Helvetica')
              .text(t.operator, col2X + 10, y2 + 44, { width: colW - 18 })
            doc.fillOpacity(1)
          }
          y2 += cardH + 3
        })
      }

      // ── Page Footer ──
      drawFooter(`Day ${day.dayNumber} of ${itinerary.request.duration}`)
    })

    doc.end()
  })
}
