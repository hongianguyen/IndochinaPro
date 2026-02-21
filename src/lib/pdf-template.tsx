/**
 * PDF Proposal Template
 * Luxury travel proposal using @react-pdf/renderer
 */

import {
  Document, Page, Text, View, StyleSheet, Image,
  Font, pdf
} from '@react-pdf/renderer'
import type { Itinerary, DayData } from '@/types'

// Register fonts (using Google Fonts CDN via @react-pdf/renderer)
Font.register({
  family: 'Cormorant',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/cormorantgaramond/v16/co3WmX5slCNuHLi8bLeY9MK7whWMhyjornFLsS6V7w.woff2', fontWeight: 300 },
    { src: 'https://fonts.gstatic.com/s/cormorantgaramond/v16/co3YmX5slCNuHLi8bLeY9MK7whWMhyjYrEPjuw-NMg.woff2', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/cormorantgaramond/v16/co3bmX5slCNuHLi8bLeY9MK7whWMhyjYrEPjuw-N.woff2', fontWeight: 400, fontStyle: 'italic' },
  ],
})

Font.register({
  family: 'Jost',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/jost/v14/92zPtBhPNqw79Ij1E865zBUv7myjJAVGPokMmuTl.woff2', fontWeight: 300 },
    { src: 'https://fonts.gstatic.com/s/jost/v14/92zPtBhPNqw79Ij1E865zBUv7myjJAVGPokMmuTl.woff2', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/jost/v14/92zPtBhPNqw79Ij1E865zBUv7myjJAVGPokMmuTl.woff2', fontWeight: 600 },
  ],
})

// ─── Colors ────────────────────────────────────────────────────────────────────
const NAVY = '#0d1f3d'
const NAVY_DARK = '#08152a'
const NAVY_MED = '#1a3a6b'
const GOLD = '#d4a017'
const CREAM = '#f9f2e3'
const LIGHT_GRAY = '#e8e0d0'

const styles = StyleSheet.create({
  // Cover
  coverPage: {
    backgroundColor: NAVY_DARK,
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: 0,
  },
  coverTop: {
    padding: '60px 60px 0',
  },
  coverLogo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 80,
  },
  coverLogoBox: {
    width: 36,
    height: 36,
    borderWidth: 1,
    borderColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    transform: 'rotate(45deg)',
  },
  coverLogoText: {
    color: CREAM,
    fontFamily: 'Cormorant',
    fontSize: 22,
    fontWeight: 400,
  },
  coverLogoSub: {
    color: GOLD,
    fontFamily: 'Jost',
    fontSize: 8,
    letterSpacing: 4,
    textTransform: 'uppercase',
  },
  coverTitle: {
    color: CREAM,
    fontFamily: 'Cormorant',
    fontSize: 72,
    fontWeight: 300,
    lineHeight: 1.05,
    marginBottom: 8,
  },
  coverSubtitle: {
    color: GOLD,
    fontFamily: 'Cormorant',
    fontSize: 30,
    fontStyle: 'italic',
    fontWeight: 400,
  },
  coverDivider: {
    height: 1,
    backgroundColor: GOLD,
    opacity: 0.3,
    marginVertical: 30,
    marginHorizontal: 60,
  },
  coverBottom: {
    backgroundColor: NAVY_MED,
    padding: '20px 60px',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  coverMeta: {
    color: CREAM,
    fontFamily: 'Jost',
    fontSize: 10,
    letterSpacing: 1,
  },
  coverMetaLabel: {
    color: GOLD,
    fontFamily: 'Jost',
    fontSize: 7,
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: 3,
  },

  // Summary page
  summaryPage: {
    backgroundColor: CREAM,
    padding: '50px 60px',
  },
  summaryTitle: {
    color: NAVY_DARK,
    fontFamily: 'Cormorant',
    fontSize: 36,
    fontWeight: 300,
    marginBottom: 6,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: GOLD,
    marginBottom: 30,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 30,
  },
  summaryBox: {
    backgroundColor: NAVY_DARK,
    padding: '14px 18px',
    minWidth: '28%',
    flex: 1,
  },
  summaryBoxLabel: {
    color: GOLD,
    fontFamily: 'Jost',
    fontSize: 7,
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  summaryBoxValue: {
    color: CREAM,
    fontFamily: 'Jost',
    fontSize: 13,
    fontWeight: 400,
  },
  overviewText: {
    color: NAVY,
    fontFamily: 'Jost',
    fontSize: 11,
    lineHeight: 1.7,
    fontWeight: 300,
    marginBottom: 24,
  },
  interestTag: {
    borderWidth: 1,
    borderColor: NAVY_MED,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 6,
    marginBottom: 6,
  },
  interestText: {
    color: NAVY,
    fontFamily: 'Jost',
    fontSize: 8,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },

  // Day page
  dayPage: {
    backgroundColor: '#f5ede0',
    padding: 0,
    flexDirection: 'column',
  },
  dayHeader: {
    backgroundColor: NAVY_DARK,
    padding: '28px 50px',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  dayNumber: {
    width: 56,
    height: 56,
    borderWidth: 1,
    borderColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  dayNumberText: {
    color: CREAM,
    fontFamily: 'Cormorant',
    fontSize: 28,
    fontWeight: 300,
  },
  dayNumberLabel: {
    color: GOLD,
    fontFamily: 'Jost',
    fontSize: 6,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  dayHighlights: {
    flex: 1,
  },
  dayHighlightsText: {
    color: CREAM,
    fontFamily: 'Cormorant',
    fontSize: 20,
    fontWeight: 300,
    lineHeight: 1.3,
  },
  dayImage: {
    height: 140,
    objectFit: 'cover',
    width: '100%',
  },
  dayBody: {
    padding: '20px 50px 30px',
    flexDirection: 'row',
    gap: 20,
    flex: 1,
  },
  dayCol: {
    flex: 1,
    gap: 12,
  },
  fieldBox: {
    backgroundColor: NAVY_DARK,
    padding: '10px 14px',
  },
  fieldLabel: {
    color: GOLD,
    fontFamily: 'Jost',
    fontSize: 6,
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: 5,
  },
  fieldValue: {
    color: CREAM,
    fontFamily: 'Jost',
    fontSize: 10,
    lineHeight: 1.4,
  },
  fieldValueMono: {
    color: GOLD,
    fontFamily: 'Jost',
    fontSize: 14,
    fontWeight: 400,
  },
  mealRow: {
    flexDirection: 'row',
    gap: 6,
  },
  mealBox: {
    flex: 1,
    backgroundColor: NAVY_DARK,
    padding: '8px 10px',
  },
  mealLabel: {
    color: GOLD,
    fontFamily: 'Jost',
    fontSize: 6,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  mealValue: {
    color: CREAM,
    fontFamily: 'Jost',
    fontSize: 8,
    lineHeight: 1.4,
    fontWeight: 300,
  },
  transportBox: {
    backgroundColor: NAVY,
    padding: '10px 14px',
    borderLeftWidth: 2,
    borderLeftColor: GOLD,
  },
  transportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  transportType: {
    color: GOLD,
    fontFamily: 'Jost',
    fontSize: 8,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  transportClass: {
    color: CREAM,
    fontFamily: 'Jost',
    fontSize: 8,
    opacity: 0.7,
  },
  transportRoute: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transportPoint: {},
  transportTime: {
    color: GOLD,
    fontFamily: 'Jost',
    fontSize: 13,
    fontWeight: 400,
  },
  transportPlace: {
    color: CREAM,
    fontFamily: 'Jost',
    fontSize: 8,
    opacity: 0.8,
  },
  transportArrow: {
    color: CREAM,
    fontFamily: 'Jost',
    fontSize: 14,
    opacity: 0.4,
  },

  // Footer
  pageFooter: {
    backgroundColor: NAVY_DARK,
    padding: '8px 50px',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    color: GOLD,
    fontFamily: 'Jost',
    fontSize: 7,
    letterSpacing: 2,
    textTransform: 'uppercase',
    opacity: 0.6,
  },
})

// ─── Cover Page ────────────────────────────────────────────────────────────────
function CoverPage({ itinerary }: { itinerary: Itinerary }) {
  return (
    <Page size="A4" style={styles.coverPage}>
      <View style={styles.coverTop}>
        {/* Logo */}
        <View style={styles.coverLogo}>
          <View>
            <Text style={styles.coverLogoText}>Indochina Travel</Text>
            <Text style={styles.coverLogoSub}>PRO · AI ITINERARY</Text>
          </View>
        </View>

        {/* Main Title */}
        <Text style={styles.coverTitle}>{itinerary.title}</Text>
        <Text style={styles.coverSubtitle}>{itinerary.subtitle}</Text>
      </View>

      <View style={styles.coverDivider} />

      {/* Bottom metadata bar */}
      <View style={styles.coverBottom}>
        <View>
          <Text style={styles.coverMetaLabel}>Thời gian</Text>
          <Text style={styles.coverMeta}>{itinerary.request.duration} Ngày</Text>
        </View>
        <View>
          <Text style={styles.coverMetaLabel}>Khởi hành</Text>
          <Text style={styles.coverMeta}>{itinerary.request.startPoint}</Text>
        </View>
        <View>
          <Text style={styles.coverMetaLabel}>Điểm đến</Text>
          <Text style={styles.coverMeta}>{itinerary.request.destinations.join(' · ')}</Text>
        </View>
        <View>
          <Text style={styles.coverMetaLabel}>Ngày tạo</Text>
          <Text style={styles.coverMeta}>
            {new Date(itinerary.generatedAt).toLocaleDateString('vi-VN')}
          </Text>
        </View>
      </View>
    </Page>
  )
}

// ─── Summary Page ──────────────────────────────────────────────────────────────
function SummaryPage({ itinerary }: { itinerary: Itinerary }) {
  const { request, overview, highlights } = itinerary
  return (
    <Page size="A4" style={styles.summaryPage}>
      <Text style={styles.summaryTitle}>Tổng Quan Hành Trình</Text>
      <View style={styles.summaryDivider} />

      {/* Meta grid */}
      <View style={styles.summaryGrid}>
        <View style={styles.summaryBox}>
          <Text style={styles.summaryBoxLabel}>Thời gian</Text>
          <Text style={styles.summaryBoxValue}>{request.duration} Ngày</Text>
        </View>
        <View style={styles.summaryBox}>
          <Text style={styles.summaryBoxLabel}>Điểm khởi hành</Text>
          <Text style={styles.summaryBoxValue}>{request.startPoint}</Text>
        </View>
        <View style={styles.summaryBox}>
          <Text style={styles.summaryBoxLabel}>Số người</Text>
          <Text style={styles.summaryBoxValue}>{request.groupSize || 'Chưa xác định'}</Text>
        </View>
        <View style={styles.summaryBox}>
          <Text style={styles.summaryBoxLabel}>Phong cách</Text>
          <Text style={styles.summaryBoxValue}>{request.travelStyle || 'Standard'}</Text>
        </View>
      </View>

      {/* Overview */}
      <Text style={styles.overviewText}>{overview}</Text>

      {/* Highlights */}
      {highlights.length > 0 && (
        <View>
          <Text style={{ ...styles.summaryBoxLabel, color: NAVY, marginBottom: 12 }}>
            Điểm Nhấn Nổi Bật
          </Text>
          {highlights.map((h, i) => (
            <View key={i} style={{ flexDirection: 'row', marginBottom: 8, alignItems: 'flex-start' }}>
              <Text style={{ color: GOLD, marginRight: 8, fontSize: 8 }}>◆</Text>
              <Text style={{ color: NAVY, fontFamily: 'Jost', fontSize: 10, lineHeight: 1.5, flex: 1 }}>
                {h}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Interests */}
      {request.interests.length > 0 && (
        <View style={{ marginTop: 20 }}>
          <Text style={{ ...styles.summaryBoxLabel, color: NAVY, marginBottom: 10 }}>Sở Thích</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {request.interests.map(interest => (
              <View key={interest} style={styles.interestTag}>
                <Text style={styles.interestText}>{interest}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Footer */}
      <View style={{ ...styles.pageFooter, marginTop: 'auto', marginHorizontal: -60 }}>
        <Text style={styles.footerText}>Indochina Travel Pro</Text>
        <Text style={styles.footerText}>AI Itinerary System</Text>
      </View>
    </Page>
  )
}

// ─── Day Page ──────────────────────────────────────────────────────────────────
function DayPage({ day, index }: { day: DayData; index: number }) {
  return (
    <Page size="A4" style={styles.dayPage}>
      {/* Header */}
      <View style={styles.dayHeader}>
        <View style={styles.dayNumber}>
          <Text style={styles.dayNumberLabel}>Ngày</Text>
          <Text style={styles.dayNumberText}>{day.dayNumber}</Text>
        </View>
        <View style={styles.dayHighlights}>
          <Text style={styles.dayHighlightsText}>{day.highlights}</Text>
        </View>
      </View>

      {/* Destination image */}
      {day.imageUrl && (
        <Image src={day.imageUrl} style={styles.dayImage} />
      )}

      {/* Body — 2 columns */}
      <View style={styles.dayBody}>
        {/* Left Column */}
        <View style={styles.dayCol}>
          {/* Pickup */}
          <View style={styles.fieldBox}>
            <Text style={styles.fieldLabel}>📍 Pickup Place</Text>
            <Text style={styles.fieldValue}>{day.pickupPlace}</Text>
          </View>
          <View style={styles.fieldBox}>
            <Text style={styles.fieldLabel}>🕐 Pickup Time</Text>
            <Text style={styles.fieldValueMono}>{day.pickupTime}</Text>
          </View>

          {/* Drop-off */}
          <View style={styles.fieldBox}>
            <Text style={styles.fieldLabel}>🏨 Drop-off Place</Text>
            <Text style={styles.fieldValue}>{day.dropoffPlace}</Text>
          </View>
          <View style={styles.fieldBox}>
            <Text style={styles.fieldLabel}>🕖 Drop-off Time</Text>
            <Text style={styles.fieldValueMono}>{day.dropoffTime}</Text>
          </View>

          {/* Accommodation */}
          {day.accommodation && (
            <View style={{ ...styles.fieldBox, borderLeftWidth: 2, borderLeftColor: GOLD }}>
              <Text style={styles.fieldLabel}>🏨 Lưu trú</Text>
              <Text style={styles.fieldValue}>{day.accommodation}</Text>
            </View>
          )}
        </View>

        {/* Right Column */}
        <View style={styles.dayCol}>
          {/* Meals */}
          <View>
            <Text style={{ ...styles.fieldLabel, marginBottom: 6 }}>🍽️ Bữa Ăn (Meals)</Text>
            <View style={styles.mealRow}>
              <View style={styles.mealBox}>
                <Text style={styles.mealLabel}>Sáng</Text>
                <Text style={styles.mealValue}>{day.meals.breakfast}</Text>
              </View>
              <View style={styles.mealBox}>
                <Text style={styles.mealLabel}>Trưa</Text>
                <Text style={styles.mealValue}>{day.meals.lunch}</Text>
              </View>
              <View style={styles.mealBox}>
                <Text style={styles.mealLabel}>Tối</Text>
                <Text style={styles.mealValue}>{day.meals.dinner}</Text>
              </View>
            </View>
          </View>

          {/* Transportation */}
          {day.transportation && day.transportation.length > 0 && (
            <View>
              <Text style={{ ...styles.fieldLabel, marginBottom: 6 }}>🚗 Phương Tiện</Text>
              {day.transportation.map((t, i) => (
                <View key={i} style={{ ...styles.transportBox, marginBottom: i < day.transportation.length - 1 ? 6 : 0 }}>
                  <View style={styles.transportHeader}>
                    <Text style={styles.transportType}>
                      {t.type}{t.flightNumber ? ` · ${t.flightNumber}` : ''}
                    </Text>
                    <Text style={styles.transportClass}>{t.class}</Text>
                  </View>
                  <View style={styles.transportRoute}>
                    <View style={styles.transportPoint}>
                      <Text style={styles.transportTime}>{t.etd}</Text>
                      <Text style={styles.transportPlace}>{t.departure}</Text>
                    </View>
                    <Text style={styles.transportArrow}>→</Text>
                    <View style={[styles.transportPoint, { alignItems: 'flex-end' }]}>
                      <Text style={styles.transportTime}>{t.eta}</Text>
                      <Text style={styles.transportPlace}>{t.arrival}</Text>
                    </View>
                  </View>
                  {t.operator && (
                    <Text style={{ ...styles.transportPlace, marginTop: 4, opacity: 0.6 }}>
                      {t.operator}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>
      </View>

      {/* Footer */}
      <View style={styles.pageFooter}>
        <Text style={styles.footerText}>Indochina Travel Pro</Text>
        <Text style={styles.footerText}>Ngày {day.dayNumber} / {day.highlights.substring(0, 30)}...</Text>
      </View>
    </Page>
  )
}

// ─── Main PDF Document ─────────────────────────────────────────────────────────
function ItineraryDocument({ itinerary }: { itinerary: Itinerary }) {
  return (
    <Document
      title={itinerary.title}
      author="Indochina Travel Pro"
      subject={`${itinerary.request.duration} ngày - ${itinerary.request.destinations.join(', ')}`}
    >
      <CoverPage itinerary={itinerary} />
      <SummaryPage itinerary={itinerary} />
      {itinerary.days.map((day, i) => (
        <DayPage key={day.dayNumber} day={day} index={i} />
      ))}
    </Document>
  )
}

export async function generatePDF(itinerary: Itinerary): Promise<Buffer> {
  const doc = <ItineraryDocument itinerary={itinerary} />
  const stream = await pdf(doc).toBuffer()

  // toBuffer() may return a ReadableStream — collect chunks into Buffer
  if (Buffer.isBuffer(stream)) {
    return stream
  }

  // Handle ReadableStream
  const reader = (stream as any).getReader()
  const chunks: Uint8Array[] = []
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    if (value) chunks.push(value)
  }
  return Buffer.concat(chunks)
}
