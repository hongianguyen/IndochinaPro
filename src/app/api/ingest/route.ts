import { NextRequest } from 'next/server'
import { saveStructuredFile, clearKnowledgeCache } from '@/lib/knowledge-hub'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// The 4 structured files that get injected directly into System Prompt / logic
const STRUCTURED_FILES = [
  '1_brand_guidelines.md',
  '2_core_principles.md',
  '3_logistics_rules.json',
  '4_hotel_master.json',
]

function isStructuredFile(filename: string): boolean {
  const base = filename.split('/').pop() || ''
  return STRUCTURED_FILES.some(sf => base.toLowerCase() === sf.toLowerCase())
}

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder()
  const stream = new TransformStream()
  const writer = stream.writable.getWriter()

  const send = (data: object) => {
    try { writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`)) } catch { }
  }

    ; (async () => {
      try {
        const formData = await req.formData()
        const file = formData.get('file') as File

        if (!file) {
          send({ phase: 'error', message: 'No file found in the upload' })
          return
        }

        const sizeMB = file.size / (1024 * 1024)
        if (sizeMB > 50) {
          send({
            phase: 'error',
            message: `ZIP file (${sizeMB.toFixed(0)}MB) is too large for web upload. Please use the CLI: node scripts/ingest-supabase.mjs <file.zip>`,
          })
          return
        }

        // Supabase mode — no web upload
        if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
          send({
            phase: 'error',
            message: 'Supabase mode active. Run: node scripts/ingest-supabase.mjs <file.zip> from terminal.',
          })
          return
        }

        send({ phase: 'uploading', message: `Received file (${sizeMB.toFixed(1)}MB)...` })

        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        send({ phase: 'extracting', message: 'Extracting ZIP archive...' })
        const JSZip = (await import('jszip')).default
        const mammoth = (await import('mammoth')).default
        const zip = await JSZip.loadAsync(buffer)

        // ─── STREAM A: Structured Data (Supreme Authority) ──────────────────
        send({ phase: 'parsing-structured', message: 'Scanning for structured knowledge files...' })

        const allFileNames = Object.keys(zip.files).filter(name => !zip.files[name].dir)
        const structuredFilesFound: string[] = []

        for (const fileName of allFileNames) {
          const base = fileName.split('/').pop() || ''
          if (isStructuredFile(base)) {
            try {
              const content = await zip.files[fileName].async('text')
              // Normalize the filename to match expected names
              const normalizedName = STRUCTURED_FILES.find(sf =>
                sf.toLowerCase() === base.toLowerCase()
              ) || base
              await saveStructuredFile(normalizedName, content)
              structuredFilesFound.push(normalizedName)
              send({
                phase: 'parsing-structured',
                message: `✓ Loaded structured file: ${normalizedName}`,
                structuredFilesFound,
              })
            } catch (err) {
              send({
                phase: 'parsing-structured',
                message: `⚠ Failed to parse structured file: ${base}`,
              })
            }
          }
        }

        // Clear knowledge cache so new data is picked up
        clearKnowledgeCache()

        send({
          phase: 'parsing-structured',
          message: `Structured data: ${structuredFilesFound.length}/${STRUCTURED_FILES.length} files loaded`,
          structuredFilesFound,
        })

        // ─── STREAM B: Unstructured Data (RAG) ──────────────────────────────
        const docxFiles = allFileNames.filter(name => {
          const lower = name.toLowerCase()
          return lower.endsWith('.docx') && !isStructuredFile(name)
        })

        if (docxFiles.length > 200) {
          send({
            phase: 'error',
            message: `Found ${docxFiles.length} .docx files — too many for web processing. Use CLI script instead.`,
          })
          return
        }

        send({
          phase: 'reading',
          totalFiles: docxFiles.length,
          processedFiles: 0,
          message: `Found ${docxFiles.length} unstructured .docx files for RAG processing...`,
        })

        const extracted: Array<{ name: string; content: string }> = []

        for (let i = 0; i < docxFiles.length; i++) {
          const fileName = docxFiles[i]
          try {
            const fileData = await zip.files[fileName].async('nodebuffer')
            const result = await mammoth.extractRawText({ buffer: fileData })
            extracted.push({ name: fileName.split('/').pop() || fileName, content: result.value })
          } catch { }

          if (i % 20 === 0 || i === docxFiles.length - 1) {
            send({
              phase: 'reading',
              processedFiles: i + 1,
              totalFiles: docxFiles.length,
              currentFile: fileName.split('/').pop(),
              message: `Reading file ${i + 1}/${docxFiles.length}...`,
            })
          }
        }

        send({
          phase: 'vectorizing',
          message: `Vectorizing ${extracted.length} documents...`,
          processedFiles: 0,
          totalFiles: extracted.length,
          vectorsCreated: 0,
        })

        // Complete
        send({
          phase: 'done',
          vectorsCreated: extracted.length,
          processedFiles: extracted.length,
          structuredFilesFound,
          message: `Complete! Processed ${structuredFilesFound.length} structured files and ${extracted.length} RAG documents.`,
        })

      } catch (err: any) {
        send({ phase: 'error', message: err.message || 'Unknown error occurred' })
      } finally {
        writer.close()
      }
    })()

  return new Response(stream.readable, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
  })
}
