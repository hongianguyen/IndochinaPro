import 'server-only'
import type { Itinerary, DayData } from '@/types'

const NAVY = '#0d1f3d'
const NAVY_DARK = '#08152a'
const NAVY_MED = '#1a3a6b'
const GOLD = '#d4a017'
const CREAM = '#f9f2e3'

export async function generatePDF(itinerary: Itinerary): Promise<Buffer> {
  // Dynamic import to avoid SSR issues
  const {
    Document, Page, Text, View, StyleSheet, Image, Font, pdf
  } = await import('@react-pdf/renderer')

  Font.register({
    family: 'Helvetica',
    fonts: [],
  })

  const styles = StyleSheet.create({
    page: { backgroundColor: NAVY_DARK, padding: 0, fontFamily: 'Helvetica' },
    coverPage: { backgroundColor: NAVY_DARK, flexDirection: 'column', justifyContent: 'space-between' },
    coverBody: { padding: '60px 60px 0' },
    logoText: { color: CREAM, fontSize: 22, marginBottom: 4 },
    logoSub: { color: GOLD, fontSize: 8, letterSpacing: 4 },
    coverTitle: { color: CREAM, fontSize: 60, fontWeight: 'bold', lineHeight: 1.05, marginTop: 60, marginBottom: 8 },
    coverSubtitle: { color: GOLD, fontSize: 26 },
    divider: { height: 1, backgroundColor: GOLD, opacity: 0.3, marginVertical: 30, marginHorizontal: 60 },
    coverBottom: { backgroundColor: NAVY_MED, padding: '20px 60px', flexDirection: 'row', justifyContent: 'space-between' },
    metaLabel: { color: GOLD, fontSize: 7, letterSpacing: 3, marginBottom: 3 },
    metaValue: { color: CREAM, fontSize: 10 },
    // Summary
    summaryPage: { backgroundColor: CREAM, padding: '50px 60px' },
    summaryTitle: { color: NAVY_DARK, fontSize: 36, marginBottom: 6 },
    summaryDivider: { height: 1, backgroundColor: GOLD, marginBottom: 24 },
    overviewText: { color: NAVY, fontSize: 11, lineHeight: 1.7, marginBottom: 20 },
    gridRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
    gridBox: { flex: 1, backgroundColor: NAVY_DARK, padding: '12px 14px' },
    gridLabel: { color: GOLD, fontSize: 7, letterSpacing: 3, marginBottom: 5 },
    gridValue: { color: CREAM, fontSize: 11 },
    hlItem: { flexDirection: 'row', marginBottom: 6, alignItems: 'flex-start' },
    hlBullet: { color: GOLD, marginRight: 8, fontSize: 8 },
    hlText: { color: NAVY, fontSize: 10, lineHeight: 1.5, flex: 1 },
    // Day pages
    dayPage: { backgroundColor: '#f5ede0', flexDirection: 'column' },
    dayHeader: { backgroundColor: NAVY_DARK, padding: '24px 50px', flexDirection: 'row', alignItems: 'center', gap: 16 },
    dayNumBox: { width: 52, height: 52, borderWidth: 1, borderColor: GOLD, alignItems: 'center', justifyContent: 'center' },
    dayNumLabel: { color: GOLD, fontSize: 6, letterSpacing: 2 },
    dayNum: { color: CREAM, fontSize: 26 },
    dayTitle: { color: CREAM, fontSize: 18, flex: 1, lineHeight: 1.3 },
    dayImage: { height: 130, objectFit: 'cover', width: '100%' },
    dayBody: { padding: '18px 50px 24px', flexDirection: 'row', gap: 18, flex: 1 },
    col: { flex: 1, gap: 10 },
    fieldBox: { backgroundColor: NAVY_DARK, padding: '10px 12px' },
    fieldLabel: { color: GOLD, fontSize: 6, letterSpacing: 3, marginBottom: 5 },
    fieldValue: { color: CREAM, fontSize: 10, lineHeight: 1.4 },
    fieldValueLg: { color: GOLD, fontSize: 14 },
    mealRow: { flexDirection: 'row', gap: 5 },
    mealBox: { flex: 1, backgroundColor: NAVY_DARK, padding: '8px 8px' },
    mealLabel: { color: GOLD, fontSize: 6, letterSpacing: 2, marginBottom: 3 },
    mealValue: { color: CREAM, fontSize: 8, lineHeight: 1.4 },
    transportBox: { backgroundColor: NAVY, padding: '10px 12px', borderLeftWidth: 2, borderLeftColor: GOLD, marginBottom: 5 },
    transportHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
    transportType: { color: GOLD, fontSize: 8, letterSpacing: 2 },
    transportClass: { color: CREAM, fontSize: 8, opacity: 0.7 },
    transportRoute: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    transportTime: { color: GOLD, fontSize: 13 },
    transportPlace: { color: CREAM, fontSize: 8, opacity: 0.8 },
    transportArrow: { color: CREAM, fontSize: 14, opacity: 0.4 },
    footer: { backgroundColor: NAVY_DARK, padding: '8px 50px', flexDirection: 'row', justifyContent: 'space-between' },
    footerText: { color: GOLD, fontSize: 7, letterSpacing: 2, opacity: 0.6 },
  })

  const CoverPage = () => (
    <Page size="A4" style={styles.coverPage}>
      <View style={styles.coverBody}>
        <Text style={styles.logoText}>Indochina Travel</Text>
        <Text style={styles.logoSub}>PRO · AI ITINERARY</Text>
        <Text style={styles.coverTitle}>{itinerary.title}</Text>
        <Text style={styles.coverSubtitle}>{itinerary.subtitle}</Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.coverBottom}>
        <View><Text style={styles.metaLabel}>Thời gian</Text><Text style={styles.metaValue}>{itinerary.request.duration} Ngày</Text></View>
        <View><Text style={styles.metaLabel}>Khởi hành</Text><Text style={styles.metaValue}>{itinerary.request.startPoint}</Text></View>
        <View><Text style={styles.metaLabel}>Điểm đến</Text><Text style={styles.metaValue}>{itinerary.request.destinations.join(' · ')}</Text></View>
        <View><Text style={styles.metaLabel}>Ngày tạo</Text><Text style={styles.metaValue}>{new Date(itinerary.generatedAt).toLocaleDateString('vi-VN')}</Text></View>
      </View>
    </Page>
  )

  const SummaryPage = () => (
    <Page size="A4" style={styles.summaryPage}>
      <Text style={styles.summaryTitle}>Tổng Quan Hành Trình</Text>
      <View style={styles.summaryDivider} />
      <View style={styles.gridRow}>
        <View style={styles.gridBox}><Text style={styles.gridLabel}>Thời gian</Text><Text style={styles.gridValue}>{itinerary.request.duration} Ngày</Text></View>
        <View style={styles.gridBox}><Text style={styles.gridLabel}>Khởi hành</Text><Text style={styles.gridValue}>{itinerary.request.startPoint}</Text></View>
        <View style={styles.gridBox}><Text style={styles.gridLabel}>Số người</Text><Text style={styles.gridValue}>{itinerary.request.groupSize || 'N/A'}</Text></View>
        <View style={styles.gridBox}><Text style={styles.gridLabel}>Phong cách</Text><Text style={styles.gridValue}>{itinerary.request.travelStyle || 'Standard'}</Text></View>
      </View>
      <Text style={styles.overviewText}>{itinerary.overview}</Text>
      {itinerary.highlights.map((h, i) => (
        <View key={i} style={styles.hlItem}>
          <Text style={styles.hlBullet}>◆</Text>
          <Text style={styles.hlText}>{h}</Text>
        </View>
      ))}
    </Page>
  )

  const DayPage = ({ day }: { day: DayData }) => (
    <Page size="A4" style={styles.dayPage}>
      <View style={styles.dayHeader}>
        <View style={styles.dayNumBox}>
          <Text style={styles.dayNumLabel}>Ngày</Text>
          <Text style={styles.dayNum}>{day.dayNumber}</Text>
        </View>
        <Text style={styles.dayTitle}>{day.highlights}</Text>
      </View>
      {day.imageUrl && <Image src={day.imageUrl} style={styles.dayImage} />}
      <View style={styles.dayBody}>
        <View style={styles.col}>
          <View style={styles.fieldBox}>
            <Text style={styles.fieldLabel}>PICKUP PLACE</Text>
            <Text style={styles.fieldValue}>{day.pickupPlace}</Text>
          </View>
          <View style={styles.fieldBox}>
            <Text style={styles.fieldLabel}>PICKUP TIME</Text>
            <Text style={styles.fieldValueLg}>{day.pickupTime}</Text>
          </View>
          <View style={styles.fieldBox}>
            <Text style={styles.fieldLabel}>DROP-OFF PLACE</Text>
            <Text style={styles.fieldValue}>{day.dropoffPlace}</Text>
          </View>
          <View style={styles.fieldBox}>
            <Text style={styles.fieldLabel}>DROP-OFF TIME</Text>
            <Text style={styles.fieldValueLg}>{day.dropoffTime}</Text>
          </View>
          {day.accommodation && (
            <View style={{ ...styles.fieldBox, borderLeftWidth: 2, borderLeftColor: GOLD }}>
              <Text style={styles.fieldLabel}>LƯU TRÚ</Text>
              <Text style={styles.fieldValue}>{day.accommodation}</Text>
            </View>
          )}
        </View>
        <View style={styles.col}>
          <Text style={styles.fieldLabel}>BỮA ĂN</Text>
          <View style={styles.mealRow}>
            <View style={styles.mealBox}><Text style={styles.mealLabel}>SÁNG</Text><Text style={styles.mealValue}>{day.meals.breakfast}</Text></View>
            <View style={styles.mealBox}><Text style={styles.mealLabel}>TRƯA</Text><Text style={styles.mealValue}>{day.meals.lunch}</Text></View>
            <View style={styles.mealBox}><Text style={styles.mealLabel}>TỐI</Text><Text style={styles.mealValue}>{day.meals.dinner}</Text></View>
          </View>
          {day.transportation && day.transportation.length > 0 && (
            <View>
              <Text style={{ ...styles.fieldLabel, marginTop: 10, marginBottom: 6 }}>PHƯƠNG TIỆN</Text>
              {day.transportation.map((t, i) => (
                <View key={i} style={styles.transportBox}>
                  <View style={styles.transportHeader}>
                    <Text style={styles.transportType}>{t.type}{t.flightNumber ? ` · ${t.flightNumber}` : ''}</Text>
                    <Text style={styles.transportClass}>{t.class}</Text>
                  </View>
                  <View style={styles.transportRoute}>
                    <View><Text style={styles.transportTime}>{t.etd}</Text><Text style={styles.transportPlace}>{t.departure}</Text></View>
                    <Text style={styles.transportArrow}>→</Text>
                    <View style={{ alignItems: 'flex-end' }}><Text style={styles.transportTime}>{t.eta}</Text><Text style={styles.transportPlace}>{t.arrival}</Text></View>
                  </View>
                  {t.operator && <Text style={{ ...styles.transportPlace, marginTop: 4, opacity: 0.6 }}>{t.operator}</Text>}
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
      <View style={styles.footer}>
        <Text style={styles.footerText}>Indochina Travel Pro</Text>
        <Text style={styles.footerText}>Ngày {day.dayNumber}</Text>
      </View>
    </Page>
  )

  const doc = (
    <Document title={itinerary.title} author="Indochina Travel Pro">
      <CoverPage />
      <SummaryPage />
      {itinerary.days.map((day) => (
        <DayPage key={day.dayNumber} day={day} />
      ))}
    </Document>
  )

  const blob = await pdf(doc).toBlob()
  const arrayBuffer = await blob.arrayBuffer()
  return Buffer.from(arrayBuffer)
}
