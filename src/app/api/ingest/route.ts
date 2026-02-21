import { NextRequest } from 'next/server'
import mammoth from 'mammoth'
import JSZip from 'jszip'
import { ingestDocuments } from '@/lib/rag-engine'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder()

  const stream = new TransformStream()
  const writer = stream.writable.getWriter()

  const send = (data: object) => {
    writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
  }

  // Process in background
  ;(async () => {
    try {
      const formData = await req.formData()
      const file = formData.get('file') as File

      if (!file) {
        send({ phase: 'error', message: 'Không tìm thấy file' })
        writer.close()
        return
      }

      // Phase 1: Upload received
      send({ phase: 'uploading', message: 'Đã nhận file ZIP...' })

      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      // Phase 2: Unzip
      send({ phase: 'extracting', message: 'Đang giải nén...' })
      const zip = await JSZip.loadAsync(buffer)
      
      const docxFiles = Object.keys(zip.files).filter(
        name => name.toLowerCase().endsWith('.docx') && !zip.files[name].dir
      )

      send({
        phase: 'reading',
        totalFiles: docxFiles.length,
        processedFiles: 0,
        message: `Tìm thấy ${docxFiles.length} file. Đang đọc...`,
      })

      // Phase 3: Extract text from each docx
      const extracted: Array<{ name: string; content: string }> = []

      for (let i = 0; i < docxFiles.length; i++) {
        const fileName = docxFiles[i]
        const fileData = await zip.files[fileName].async('nodebuffer')

        try {
          const result = await mammoth.extractRawText({ buffer: fileData })
          extracted.push({
            name: fileName.split('/').pop() || fileName,
            content: result.value,
          })
        } catch (err) {
          console.error(`Error reading ${fileName}:`, err)
        }

        if (i % 50 === 0 || i === docxFiles.length - 1) {
          send({
            phase: 'reading',
            processedFiles: i + 1,
            totalFiles: docxFiles.length,
            currentFile: fileName.split('/').pop(),
            message: `Đang đọc file ${i + 1}/${docxFiles.length}...`,
          })
        }
      }

      // Phase 4: Vectorize
      send({
        phase: 'vectorizing',
        message: `Đang vector hóa ${extracted.length} tài liệu...`,
        processedFiles: 0,
        totalFiles: extracted.length,
        vectorsCreated: 0,
      })

      const result = await ingestDocuments(
        extracted,
        (current, total, file, vectors) => {
          send({
            phase: 'vectorizing',
            processedFiles: current,
            totalFiles: total,
            currentFile: file,
            vectorsCreated: vectors,
            message: `Vector hóa ${current}/${total} — ${file}`,
          })
        }
      )

      // Done
      send({
        phase: 'done',
        vectorsCreated: result.vectorsCreated,
        filesProcessed: result.filesProcessed,
        message: `Hoàn thành! Đã tạo ${result.vectorsCreated} vectors từ ${result.filesProcessed} file.`,
      })
    } catch (err: any) {
      send({
        phase: 'error',
        message: err.message || 'Lỗi không xác định',
      })
    } finally {
      writer.close()
    }
  })()

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
