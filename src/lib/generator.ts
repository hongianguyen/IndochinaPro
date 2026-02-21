import 'server-only'

/**
 * Itinerary Generator — GPT-4o + RAG
 * Generates structured 7-field day-by-day itineraries
 */

import OpenAI from 'openai'
import { retrieveRelevantTours } from './rag-engine'
import type { Itinerary, ItineraryRequest, DayData } from '@/types'
import { randomUUID } from 'crypto'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const SYSTEM_PROMPT = `Bạn là chuyên gia lập kế hoạch tour du lịch Đông Dương với 20 năm kinh nghiệm.
Bạn tạo lịch trình CHI TIẾT và THỰC TẾ dựa trên kinh nghiệm thực tế từ 2000 chương trình tour.

QUY TẮC BẮT BUỘC:
- Mỗi ngày PHẢI có đầy đủ 7 trường: highlights, pickupPlace, pickupTime, dropoffPlace, dropoffTime, meals (sáng/trưa/tối), transportation
- Thông tin phải CỤ THỂ: địa điểm thực tế, giờ giấc hợp lý, phương tiện phù hợp
- Bữa ăn: ghi rõ "Nhà hàng X" hoặc "Tự túc" hoặc "Bao gồm"
- Transportation: ghi loại xe/tàu/máy bay, thời gian di chuyển, hạng dịch vụ
- Phong cách: sang trọng, tinh tế, phù hợp với từng sở thích

QUAN TRỌNG: Trả về JSON thuần túy, không có markdown code blocks.`

function buildUserPrompt(request: ItineraryRequest, ragContext: string[]): string {
  const contextSection = ragContext.length
    ? `\n\nDỮ LIỆU THAM KHẢO TỪ 2000 TOUR:\n${ragContext.slice(0, 5).join('\n---\n')}`
    : ''

  return `Tạo lịch trình ${request.duration} ngày cho:
- Điểm khởi hành: ${request.startPoint}
- Điểm đến: ${request.destinations.join(', ')}
- Sở thích: ${request.interests.join(', ')}
- Nhóm: ${request.groupSize || 'Không xác định'} người
- Phong cách: ${request.travelStyle || 'Standard'}
- Yêu cầu đặc biệt: ${request.specialRequirements || 'Không có'}
${contextSection}

Trả về JSON với cấu trúc:
{
  "title": "Tên hành trình",
  "subtitle": "Tagline ngắn gọn",
  "overview": "Tóm tắt tổng quan 2-3 câu",
  "highlights": ["highlight 1", "highlight 2", "highlight 3"],
  "days": [
    {
      "dayNumber": 1,
      "highlights": "Điểm nhấn chính của ngày, mô tả hấp dẫn",
      "pickupPlace": "Tên khách sạn / địa điểm cụ thể",
      "pickupTime": "07:30",
      "dropoffPlace": "Tên khách sạn / địa điểm kết thúc",
      "dropoffTime": "20:00",
      "meals": {
        "breakfast": "Buffet sáng tại khách sạn / Phở Hà Nội truyền thống",
        "lunch": "Nhà hàng X - Đặc sản địa phương",
        "dinner": "Bao gồm - Nhà hàng Y bên bờ sông"
      },
      "transportation": [
        {
          "type": "Car",
          "operator": "Xe riêng 7 chỗ có điều hòa",
          "departure": "Hà Nội",
          "arrival": "Ninh Bình",
          "etd": "08:00",
          "eta": "10:30",
          "class": "Standard",
          "notes": "Xe mới, tài xế nói tiếng Anh"
        }
      ],
      "activities": ["Tham quan Tràng An", "Chèo thuyền hang động"],
      "accommodation": "Tên khách sạn tại điểm đến tối",
      "imageQuery": "Ninh Binh Vietnam landscape"
    }
  ]
}`
}

export async function generateItinerary(
  request: ItineraryRequest
): Promise<Itinerary> {
  // Build RAG query
  const ragQuery = `${request.destinations.join(' ')} ${request.interests.join(' ')} ${request.duration} ngày tour`
  const ragContext = await retrieveRelevantTours(ragQuery, 8)

  const userPrompt = buildUserPrompt(request, ragContext)

  let rawResponse = ''

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 16384,
      response_format: { type: 'json_object' },
    })

    rawResponse = completion.choices[0].message.content || '{}'
  } catch (err: any) {
    // Fallback to GPT-4-turbo if quota exceeded
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 16384,
      response_format: { type: 'json_object' },
    })
    rawResponse = completion.choices[0].message.content || '{}'
  }

  const parsed = JSON.parse(rawResponse)

  // Validate and ensure all 7 fields per day
  const days: DayData[] = (parsed.days || []).map((day: any, i: number) => ({
    dayNumber: day.dayNumber || i + 1,
    highlights: day.highlights || `Ngày ${i + 1} hành trình`,
    pickupPlace: day.pickupPlace || 'Khách sạn',
    pickupTime: day.pickupTime || '08:00',
    dropoffPlace: day.dropoffPlace || 'Khách sạn',
    dropoffTime: day.dropoffTime || '21:00',
    meals: {
      breakfast: day.meals?.breakfast || 'Tự túc',
      lunch: day.meals?.lunch || 'Tự túc',
      dinner: day.meals?.dinner || 'Tự túc',
    },
    transportation: day.transportation || [],
    activities: day.activities || [],
    accommodation: day.accommodation,
    notes: day.notes,
    imageQuery: day.imageQuery || request.destinations[0],
  }))

  return {
    id: randomUUID(),
    title: parsed.title || `Hành Trình ${request.destinations.join(' — ')}`,
    subtitle: parsed.subtitle || `${request.duration} ngày khám phá Đông Dương`,
    request,
    days,
    overview: parsed.overview || '',
    highlights: parsed.highlights || [],
    generatedAt: new Date().toISOString(),
    ragSources: ragContext.length ? [`${ragContext.length} đoạn từ database`] : [],
  }
}

// Streaming version for real-time UI
export async function* generateItineraryStream(request: ItineraryRequest) {
  const ragQuery = `${request.destinations.join(' ')} ${request.interests.join(' ')} ${request.duration} ngày`
  
  yield { type: 'status', message: 'Đang tìm kiếm dữ liệu tour phù hợp...' }
  
  const ragContext = await retrieveRelevantTours(ragQuery, 8)
  
  yield { 
    type: 'status', 
    message: `Tìm thấy ${ragContext.length} chương trình tham khảo. Đang tạo lịch trình...` 
  }

  const userPrompt = buildUserPrompt(request, ragContext)

  const stream = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.7,
    max_tokens: 16384,
    stream: true,
    response_format: { type: 'json_object' },
  })

  let buffer = ''
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content || ''
    buffer += delta
    yield { type: 'chunk', content: delta }
  }

  yield { type: 'done', buffer }
}
