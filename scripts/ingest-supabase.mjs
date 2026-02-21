#!/usr/bin/env node
/**
 * SUPABASE INGESTION SCRIPT
 * Usage: node scripts/ingest-supabase.mjs iti.zip
 */

import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const zipPath = process.argv[2]

if (!zipPath) {
  console.error('Usage: node scripts/ingest-supabase.mjs <file.zip>')
  process.exit(1)
}

// Load .env.local
try {
  const env = await fs.readFile(path.join(ROOT, '.env.local'), 'utf-8')
  for (const line of env.split('\n')) {
    const eqIdx = line.indexOf('=')
    if (eqIdx > 0) {
      const key = line.slice(0, eqIdx).trim()
      const val = line.slice(eqIdx + 1).trim()
      if (key && !key.startsWith('#')) process.env[key] = val
    }
  }
} catch {
  console.error('Khong tim thay .env.local')
  process.exit(1)
}

const missing = []
if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.includes('your-')) missing.push('OPENAI_API_KEY')
if (!process.env.SUPABASE_URL || process.env.SUPABASE_URL.includes('your-')) missing.push('SUPABASE_URL')
if (!process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_KEY.includes('your-')) missing.push('SUPABASE_SERVICE_KEY')

if (missing.length > 0) {
  console.error('Thieu bien trong .env.local:')
  missing.forEach(k => console.error('  ' + k + '=...'))
  process.exit(1)
}

console.log('\n Indochina Travel Pro - Supabase Ingestion')
console.log('===========================================')
console.log('ZIP: ' + zipPath)
console.log('Supabase: ' + process.env.SUPABASE_URL)
console.log('')

let JSZip, mammoth, OpenAI, createClient

try {
  JSZip = (await import('jszip')).default
  mammoth = (await import('mammoth')).default
  OpenAI = (await import('openai')).default
  createClient = (await import('@supabase/supabase-js')).createClient
  console.log('Packages OK')
} catch (err) {
  console.error('Thieu package: ' + err.message)
  console.error('Chay: npm install jszip mammoth openai @supabase/supabase-js')
  process.exit(1)
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

// Test connection
const { error: connError } = await supabase.from('documents').select('id').limit(1)
if (connError && connError.code !== 'PGRST116') {
  console.error('Khong ket noi duoc Supabase: ' + connError.message)
  process.exit(1)
}
console.log('Ket noi Supabase OK\n')

const startTime = Date.now()

// Step 1: Unzip
console.log('Buoc 1/4: Giai nen ZIP...')
const zipBuffer = await fs.readFile(zipPath)
const zip = await JSZip.loadAsync(zipBuffer)

const docxFiles = Object.keys(zip.files).filter(
  name => name.toLowerCase().endsWith('.docx') && !zip.files[name].dir
)
const sorted = docxFiles.sort((a, b) =>
  (path.basename(a).startsWith('PRIORITY_') ? 0 : 1) -
  (path.basename(b).startsWith('PRIORITY_') ? 0 : 1)
)
console.log('Tim thay ' + sorted.length + ' file .docx\n')

// Step 2: Extract text
console.log('Buoc 2/4: Doc noi dung...')
const documents = []
let readErrors = 0

for (let i = 0; i < sorted.length; i++) {
  const fileName = sorted[i]
  try {
    const data = await zip.files[fileName].async('nodebuffer')
    const result = await mammoth.extractRawText({ buffer: data })
    const content = result.value.trim()
    if (content.length > 100) {
      for (let start = 0; start < content.length; start += 1300) {
        documents.push({
          content: content.slice(start, start + 1500),
          metadata: {
            source: path.basename(fileName),
            isPriority: path.basename(fileName).startsWith('PRIORITY_'),
          }
        })
      }
    }
  } catch { readErrors++ }

  if (i % 100 === 0 || i === sorted.length - 1) {
    const pct = Math.round((i + 1) / sorted.length * 100)
    process.stdout.write('\r  ' + pct + '% (' + (i+1) + '/' + sorted.length + ') -> ' + documents.length + ' chunks')
  }
}
console.log('\nDoc xong ' + documents.length + ' chunks\n')

// Step 3: Embed + Upload
console.log('Buoc 3/4: Vector hoa va upload len Supabase...\n')

const BATCH_SIZE = 50
let uploaded = 0
let embedErrors = 0

for (let i = 0; i < documents.length; i += BATCH_SIZE) {
  const batch = documents.slice(i, i + BATCH_SIZE)

  let attempt = 0
  let success = false
  while (attempt < 3 && !success) {
    try {
      const embResponse = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: batch.map(d => d.content),
      })

      const rows = batch.map((doc, j) => ({
        content: doc.content,
        metadata: doc.metadata,
        embedding: embResponse.data[j].embedding,
      }))

      const { error } = await supabase.from('documents').insert(rows)
      if (error) throw new Error(error.message)

      uploaded += batch.length
      success = true
    } catch (err) {
      attempt++
      if (attempt >= 3) {
        embedErrors += batch.length
      } else {
        await new Promise(r => setTimeout(r, 2000 * attempt))
      }
    }
  }

  const pct = Math.round(Math.min(i + BATCH_SIZE, documents.length) / documents.length * 100)
  process.stdout.write('\r  ' + pct + '% - ' + uploaded + ' uploaded, ' + embedErrors + ' loi')

  await new Promise(r => setTimeout(r, 200))
}

console.log('\n')

// Step 4: Save metadata locally
console.log('Buoc 4/4: Luu metadata...')
await fs.mkdir(path.join(ROOT, 'data'), { recursive: true })
await fs.writeFile(
  path.join(ROOT, 'data', 'metadata.json'),
  JSON.stringify({
    documentCount: uploaded,
    fileCount: sorted.length,
    lastIngested: new Date().toISOString()
  })
)

const elapsed = Math.round((Date.now() - startTime) / 1000)
const mins = Math.floor(elapsed / 60)
const secs = elapsed % 60

console.log('\n======================================')
console.log('HOAN THANH!')
console.log('  ' + uploaded + ' vectors da upload len Supabase')
console.log('  ' + sorted.length + ' files da xu ly')
console.log('  ' + mins + 'm ' + secs + 's')
console.log('======================================')
console.log('\nTHEM VAO VERCEL ENVIRONMENT VARIABLES:')
console.log('  SUPABASE_URL=' + process.env.SUPABASE_URL)
console.log('  SUPABASE_SERVICE_KEY=<service_role_key>')
console.log('\nSau do Redeploy tren Vercel la xong!')
