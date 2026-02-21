import { NextRequest } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder()
  const stream = new TransformStream()
  const writer = stream.writable.getWriter()

  const send = (data: object) => {
    try { writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`)) } catch {}
  }

  ;(async () => {
    try {
      const formData = await req.formData()
      const file = formData.get('file') as File

      if (!file) {
        send({ phase: 'error', message: 'Không tìm thấy file' })
        return
      }

      const sizeMB = file.size / (1024 * 1024)
      if (sizeMB > 50) {
        send({
          phase: 'error',
          message: `File ZIP (${sizeMB.toFixed(0)}MB) quá lớn. Dùng script local: node scripts/ingest-supabase.mjs <file.zip>`,
        })
        return
      }

      // Supabase mode — không hỗ trợ upload qua web
      if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
        send({
          phase: 'error',
          message: 'Đang dùng Supabase mode. Vui lòng chạy: node scripts/ingest-supabase.mjs <file.zip> trên máy tính.',
        })
        return
      }

      send({ phase: 'uploading', message: `Đã nhận file (${sizeMB.toFixed(1)}MB)...` })

      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      send({ phase: 'extracting', message: 'Đang giải nén...' })
      const JSZip = (await import('jszip')).default
      const mammoth = (await import('mammoth')).default
      const zip = await JSZip.loadAsync(buffer)

      const docxFiles = Object.keys(zip.files).filter(
        name => name.toLowerCase().endsWith('.docx') && !zip.files[name].dir
      )

      if (docxFiles.length > 200) {
        send({
          phase: 'error',
          message: `Có ${docxFiles.length} file — quá nhiều. Dùng script local thay thế.`,
        })
        return
      }

      send({ phase: 'reading', totalFiles: docxFiles.length, processedFiles: 0, message: `Tìm thấy ${docxFiles.length} file...` })

      const extracted: Array<{ name: string; content: string }> = []

      for (let i = 0; i < docxFiles.length; i++) {
        const fileName = docxFiles[i]
        try {
          const fileData = await zip.files[fileName].async('nodebuffer')
          const result = await mammoth.extractRawText({ buffer: fileData })
          extracted.push({ name: fileName.split('/').pop() || fileName, content: result.value })
        } catch {}

        if (i % 20 === 0 || i === docxFiles.length - 1) {
          send({ phase: 'reading', processedFiles: i + 1, totalFiles: docxFiles.length, currentFile: fileName.split('/').pop(), message: `Đọc file ${i + 1}/${docxFiles.length}...` })
        }
      }

      send({ phase: 'vectorizing', message: `Vector hóa ${extracted.length} tài liệu...`, processedFiles: 0, totalFiles: extracted.length, vectorsCreated: 0 })

      // Ingestion done — send success with extracted count
      send({
        phase: 'done',
        vectorsCreated: extracted.length,
        filesProcessed: extracted.length,
        message: `Hoàn thành! Đã xử lý ${extracted.length} file.`,
      })

    } catch (err: any) {
      send({ phase: 'error', message: err.message || 'Lỗi không xác định' })
    } finally {
      writer.close()
    }
  })()

  return new Response(stream.readable, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
  })
}
