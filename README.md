# 🧭 Indochina Travel Pro — AI Itinerary Builder

> Hệ thống tạo lịch trình du lịch Đông Dương thông minh, powered by GPT-4o + RAG từ 2,000 chương trình tour thực tế.

---

## 🎨 Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Styling | Tailwind CSS (Navy & Gold theme) |
| Animation | Framer Motion |
| AI | LangChain + OpenAI GPT-4o |
| Vector DB | FAISS (local) |
| PDF | @react-pdf/renderer |
| State | Zustand |
| Images | Unsplash API |

---

## 🚀 Quick Start

### 1. Clone & Install

```bash
cd indochina-travel-pro
npm install
```

### 2. Configure API Keys

```bash
cp .env.example .env.local
# Edit .env.local và điền API keys:
# OPENAI_API_KEY=sk-...
# UNSPLASH_ACCESS_KEY=...
```

### 3. Nạp dữ liệu (2 cách)

**Option A — Qua giao diện web:**
```bash
npm run dev
# → Mở http://localhost:3000/ingest
# → Upload file ZIP
```

**Option B — Command line (nhanh hơn cho file lớn):**
```bash
node scripts/ingest.mjs /path/to/tours.zip
```

### 4. Chạy app

```bash
npm run dev
# → http://localhost:3000
```

---

## 📁 Cấu Trúc Dự Án

```
src/
├── app/
│   ├── page.tsx              # Homepage (Hero)
│   ├── ingest/page.tsx       # Data Ingestion Dashboard
│   ├── wizard/page.tsx       # 5-step Wizard UI
│   ├── itinerary/page.tsx    # Kết quả lịch trình
│   └── api/
│       ├── status/           # Vector store status
│       ├── ingest/           # File upload + vectorize (SSE)
│       ├── generate/         # AI generation endpoint
│       └── pdf/              # PDF export endpoint
├── components/
│   └── DayCard.tsx           # Hiển thị 7 trường / ngày
├── lib/
│   ├── rag-engine.ts         # FAISS ingestion & retrieval
│   ├── generator.ts          # GPT-4o itinerary generation
│   ├── pdf-template.tsx      # @react-pdf/renderer template
│   └── unsplash.ts           # Image fetcher
├── store/                    # Zustand state management
└── types/                    # TypeScript definitions
```

---

## 📋 Cấu Trúc Dữ Liệu — 7 Trường Bắt Buộc / Ngày

Mỗi ngày trong hành trình AI generate đều có đầy đủ:

| # | Field | Mô tả |
|---|-------|--------|
| 1 | **Highlights** | Điểm nhấn chính của ngày |
| 2 | **Pickup Place** | Địa điểm đón khách |
| 3 | **Pickup Time** | Giờ đón khách |
| 4 | **Drop-off Place** | Địa điểm kết thúc chặng |
| 5 | **Drop-off Time** | Giờ kết thúc chặng |
| 6 | **Meals** | Sáng / Trưa / Tối (chi tiết nhà hàng) |
| 7 | **Transportation** | Loại xe/tàu/bay, số hiệu, ETD, ETA, Class |

---

## 🧙 Wizard UI — 5 Bước

1. **Duration** — Chọn số ngày (3, 5, 7, 10, 14, 21...)
2. **Start Point** — Điểm khởi hành
3. **Destinations** — Các điểm đến (multi-select)
4. **Interests** — Sở thích & chủ đề (Culture, Food, Family, Adventure...)
5. **Special Requirements** — Số người, phong cách, yêu cầu đặc biệt

---

## 📄 PDF Export

PDF Proposal bao gồm:
- **Trang bìa** — Logo, tiêu đề, metadata
- **Trang tóm tắt** — Overview, highlights, interests
- **Chi tiết từng ngày** — 7 trường + ảnh Unsplash

---

## 🔧 Environment Variables

```env
OPENAI_API_KEY=          # Required: GPT-4o + embeddings
UNSPLASH_ACCESS_KEY=     # Optional: ảnh cho PDF
VECTOR_DB_PATH=          # Default: ./data/vector-store
NEXT_PUBLIC_APP_URL=     # Default: http://localhost:3000
```

---

## 📦 Định dạng File Ưu Tiên

Các file bắt đầu bằng `PRIORITY_` sẽ được vector hóa trước:
```
PRIORITY_Vietnam-7D-Luxury.docx  ← Ưu tiên cao
PRIORITY_Indochina-14D.docx      ← Ưu tiên cao
Vietnam-3D-Budget.docx           ← Bình thường
```

---

*Indochina Travel Pro © 2025 — AI Itinerary System*
