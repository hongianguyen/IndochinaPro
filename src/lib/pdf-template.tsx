import 'server-only'
import type { Itinerary, DayData } from '@/types'

// Colors
const NAVY_DARK = '#08152a'
const NAVY_MED  = '#1a3a6b'
const GOLD      = '#d4a017'
const CREAM     = '#f9f2e3'
const WHITE     = '#ffffff'

export async function generatePDF(itinerary: Itinerary): Promise<Buffer> {
  const PDFDocument = (await import('pdfkit')).default

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

    // ── COVER PAGE ──────────────────────────────────────────────────────────
    // Background
    doc.rect(0, 0, W, H).fill(hexToRgb(NAVY_DARK))

    // Gold accent line left
    doc.rect(50, 60, 3, 120).fill(hexToRgb(GOLD))

    // Logo
    fill(CREAM).fontSize(18).font('Helvetica-Bold')
      .text('Indochina Travel', 65, 70)
    fill(GOLD).fontSize(8).font('Helvetica')
      .text('P R O  ·  A I  I T I N E R A R Y', 65, 94, { characterSpacing: 3 })

    // Main title
    fill(CREAM).fontSize(48).font('Helvetica-Bold')
      .text(itinerary.title, 50, 180, { width: W - 100, lineGap: 4 })

    // Subtitle
    const titleHeight = doc.heightOfString(itinerary.title, { width: W - 100 })
    fill(GOLD).fontSize(22).font('Helvetica-Oblique')
      .text(itinerary.subtitle, 50, 200 + titleHeight, { width: W - 100 })

    // Gold divider
    const divY = H - 120
    stroke(GOLD).opacity(0.3).lineWidth(1)
      .moveTo(50, divY).lineTo(W - 50, divY).stroke()
    doc.opacity(1)

    // Bottom meta bar
    doc.rect(0, H - 100, W, 100).fill(hexToRgb(NAVY_MED))

    const metas = [
      { label: 'THỜI GIAN', value: `${itinerary.request.duration} Ngày` },
      { label: 'KHỞI HÀNH', value: itinerary.request.startPoint },
      { label: 'ĐIỂM ĐẾN', value: itinerary.request.destinations.slice(0, 2).join(' · ') },
      { label: 'NGÀY TẠO', value: new Date(itinerary.generatedAt).toLocaleDateString('vi-VN') },
    ]

    metas.forEach((m, i) => {
      const x = 50 + i * (W - 100) / 4
      fill(GOLD).fontSize(7).font('Helvetica').text(m.label, x, H - 85, { characterSpacing: 2 })
      fill(CREAM).fontSize(11).font('Helvetica').text(m.value, x, H - 70)
    })

    // ── SUMMARY PAGE ────────────────────────────────────────────────────────
    doc.addPage()
    doc.rect(0, 0, W, H).fill(hexToRgb(CREAM))

    fill(NAVY_DARK).fontSize(32).font('Helvetica-Bold')
      .text('Tổng Quan Hành Trình', 50, 50)
    stroke(GOLD).lineWidth(2).moveTo(50, 92).lineTo(W - 50, 92).stroke()

    // Meta boxes
    const boxes = [
      { label: 'THỜI GIAN', value: `${itinerary.request.duration} Ngày` },
      { label: 'KHỞI HÀNH', value: itinerary.request.startPoint },
      { label: 'SỐ NGƯỜI', value: String(itinerary.request.groupSize || 'N/A') },
      { label: 'PHONG CÁCH', value: itinerary.request.travelStyle || 'Standard' },
    ]
    const bw = (W - 100 - 30) / 4
    boxes.forEach((b, i) => {
      const bx = 50 + i * (bw + 10)
      doc.rect(bx, 106, bw, 56).fill(hexToRgb(NAVY_DARK))
      fill(GOLD).fontSize(7).font('Helvetica').text(b.label, bx + 10, 116, { characterSpacing: 2 })
      fill(CREAM).fontSize(12).font('Helvetica-Bold').text(b.value, bx + 10, 132)
    })

    // Overview
    fill(NAVY_DARK).fontSize(11).font('Helvetica')
      .text(itinerary.overview || '', 50, 180, { width: W - 100, lineGap: 4 })

    // Highlights
    let hy = 280
    fill(GOLD).fontSize(8).font('Helvetica').text('ĐIỂM NỔI BẬT', 50, hy, { characterSpacing: 2 })
    hy += 20
    itinerary.highlights.forEach(h => {
      fill(GOLD).fontSize(8).text('◆', 50, hy)
      fill(NAVY_DARK).fontSize(10).font('Helvetica').text(h, 66, hy, { width: W - 120 })
      hy += doc.heightOfString(h, { width: W - 120 }) + 8
    })

    // Interests tags
    if (itinerary.request.interests.length > 0) {
      hy += 10
      fill(GOLD).fontSize(8).font('Helvetica').text('SỞ THÍCH', 50, hy, { characterSpacing: 2 })
      hy += 18
      let tx = 50
      itinerary.request.interests.forEach(interest => {
        const tw = doc.widthOfString(interest) + 20
        if (tx + tw > W - 50) { tx = 50; hy += 26 }
        stroke(NAVY_MED).lineWidth(1).rect(tx, hy, tw, 20).stroke()
        fill(NAVY_DARK).fontSize(9).font('Helvetica').text(interest, tx + 10, hy + 5)
        tx += tw + 8
      })
    }

    // ── DAY PAGES ───────────────────────────────────────────────────────────
    itinerary.days.forEach((day: DayData) => {
      doc.addPage()
      doc.rect(0, 0, W, H).fill(hexToRgb('#f5ede0'))

      // Day header
      doc.rect(0, 0, W, 80).fill(hexToRgb(NAVY_DARK))

      // Day number box
      stroke(GOLD).lineWidth(1).rect(50, 14, 52, 52).stroke()
      fill(GOLD).fontSize(7).font('Helvetica').text('NGÀY', 60, 22, { characterSpacing: 2 })
      fill(CREAM).fontSize(28).font('Helvetica-Bold').text(String(day.dayNumber), 60, 32)

      // Day highlights text
      fill(CREAM).fontSize(16).font('Helvetica')
        .text(day.highlights, 116, 20, { width: W - 170, lineGap: 3 })

      let bodyY = 90

      // Day image
      if (day.imageUrl) {
        try {
          doc.image(day.imageUrl, 0, bodyY, { width: W, height: 120, cover: [W, 120] })
          bodyY += 128
        } catch {}
      }

      // Two column layout
      const colW = (W - 120) / 2
      const col1X = 50
      const col2X = 50 + colW + 20
      let y1 = bodyY + 10
      let y2 = bodyY + 10

      const drawField = (x: number, y: number, label: string, value: string, w: number, large = false): number => {
        const bh = large ? 50 : Math.max(44, doc.heightOfString(value, { width: w - 20 }) + 24)
        doc.rect(x, y, w, bh).fill(hexToRgb(NAVY_DARK))
        fill(GOLD).fontSize(6).font('Helvetica').text(label, x + 10, y + 8, { characterSpacing: 2 })
        if (large) {
          fill(GOLD).fontSize(16).font('Helvetica-Bold').text(value, x + 10, y + 20)
        } else {
          fill(CREAM).fontSize(9).font('Helvetica').text(value, x + 10, y + 22, { width: w - 20 })
        }
        return y + bh + 6
      }

      // Column 1: Pickup / Drop-off
      y1 = drawField(col1X, y1, 'PICKUP PLACE', day.pickupPlace, colW)
      y1 = drawField(col1X, y1, 'PICKUP TIME', day.pickupTime, colW, true)
      y1 = drawField(col1X, y1, 'DROP-OFF PLACE', day.dropoffPlace, colW)
      y1 = drawField(col1X, y1, 'DROP-OFF TIME', day.dropoffTime, colW, true)
      if (day.accommodation) {
        doc.rect(col1X, y1, colW, 2).fill(hexToRgb(GOLD))
        y1 += 2
        y1 = drawField(col1X, y1, 'LƯU TRÚ', day.accommodation, colW)
      }

      // Column 2: Meals
      fill(GOLD).fontSize(6).font('Helvetica').text('BỮA ĂN', col2X, y2 + 4, { characterSpacing: 2 })
      y2 += 18
      const mw = (colW - 10) / 3
      ;[
        { label: 'SÁNG', value: day.meals.breakfast },
        { label: 'TRƯA', value: day.meals.lunch },
        { label: 'TỐI', value: day.meals.dinner },
      ].forEach((meal, i) => {
        const mx = col2X + i * (mw + 5)
        const mh = Math.max(52, doc.heightOfString(String(meal.value), { width: mw - 14 }) + 28)
        doc.rect(mx, y2, mw, mh).fill(hexToRgb(NAVY_DARK))
        fill(GOLD).fontSize(6).font('Helvetica').text(meal.label, mx + 7, y2 + 7, { characterSpacing: 1 })
        fill(CREAM).fontSize(8).font('Helvetica').text(String(meal.value), mx + 7, y2 + 20, { width: mw - 14 })
      })
      y2 += 70

      // Column 2: Transportation
      if (day.transportation && day.transportation.length > 0) {
        fill(GOLD).fontSize(6).font('Helvetica').text('PHƯƠNG TIỆN', col2X, y2 + 4, { characterSpacing: 2 })
        y2 += 18
        day.transportation.forEach(t => {
          doc.rect(col2X, y2, colW, 58).fill(hexToRgb(NAVY_DARK))
          doc.rect(col2X, y2, 3, 58).fill(hexToRgb(GOLD))
          fill(GOLD).fontSize(7).font('Helvetica')
            .text(`${t.type}${t.flightNumber ? ' · ' + t.flightNumber : ''}`, col2X + 10, y2 + 8)
          fill(CREAM).fontSize(7).font('Helvetica').text(t.class, col2X + colW - 60, y2 + 8)
          fill(GOLD).fontSize(14).font('Helvetica-Bold').text(t.etd, col2X + 10, y2 + 22)
          fill(CREAM).fontSize(8).font('Helvetica').text(t.departure, col2X + 10, y2 + 38)
          fill(CREAM).fontSize(12).text('→', col2X + colW / 2 - 8, y2 + 24)
          fill(GOLD).fontSize(14).font('Helvetica-Bold').text(t.eta, col2X + colW - 60, y2 + 22)
          fill(CREAM).fontSize(8).font('Helvetica').text(t.arrival, col2X + colW - 60, y2 + 38)
          y2 += 64
        })
      }

      // Footer
      doc.rect(0, H - 30, W, 30).fill(hexToRgb(NAVY_DARK))
      fill(GOLD).fontSize(7).font('Helvetica')
        .text('Indochina Travel Pro', 50, H - 18, { characterSpacing: 2 })
      fill(GOLD).fontSize(7).font('Helvetica')
        .text(`Ngày ${day.dayNumber} / ${itinerary.request.duration}`, W - 150, H - 18)
    })

    doc.end()
  })
}
