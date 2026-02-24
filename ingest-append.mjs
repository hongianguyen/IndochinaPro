#!/usr/bin/env node
/**
 * SUPABASE APPEND SCRIPT — Fixed duplicate check
 * Usage:
 *   node ingest-append.mjs file.zip
 *   node ingest-append.mjs file.docx
 *   node ingest-append.mjs folder/
 */

import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = __dirname
const inputPath = process.argv[2]
const mode = process.argv[3] || '' // --overwrite or --skip-duplicates

if (!inputPath) {
  console.log('Usage: node ingest-append.mjs <file.zip|file.docx|folder> [--overwrite|--skip-duplicates]')
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
if (missing.length > 0) { missing.forEach(k => console.error('Thieu: ' + k)); process.exit(1) }

let JSZip, mammoth, OpenAI, createClient
try {
  JSZip = (await import('jszip')).default
  mammoth = (await import('mammoth')).default
  OpenAI = (await import('openai')).default
  createClient = (await import('@supabase/supabase-js')).createClient
} catch (err) {
  console.error('Thieu package: ' + err.message)
  console.error('Chay: npm install jszip mammoth openai @supabase/supabase-js')
  process.exit(1)
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

console.log('\n Indochina Travel Pro — Append to Supabase')
console.log('============================================')

// Current count
const { count: existingCount } = await supabase.from('documents').select('*', { count: 'exact', head: true })
console.log('Hien tai Supabase co: ' + (existingCount || 0) + ' vectors')

// ─── Collect files ────────────────────────────────────────────────────────────
const filesToProcess = []
const stat = await fs.stat(inputPath)

if (inputPath.toLowerCase().endsWith('.zip')) {
  console.log('\nGiai nen ZIP...')
  const zipBuffer = await fs.readFile(inputPath)
  const zip = await JSZip.loadAsync(zipBuffer)
  const docxNames = Object.keys(zip.files).filter(
    n => n.toLowerCase().endsWith('.docx') && !zip.files[n].dir
  )
  for (const name of docxNames) {
    const buffer = await zip.files[name].async('nodebuffer')
    filesToProcess.push({ name: path.basename(name), buffer })
  }
  console.log('Tim thay ' + filesToProcess.length + ' file trong ZIP')

} else if (inputPath.toLowerCase().endsWith('.docx')) {
  const buffer = await fs.readFile(inputPath)
  filesToProcess.push({ name: path.basename(inputPath), buffer })
  console.log('1 file DOCX')

} else if (stat.isDirectory()) {
  const files = await fs.readdir(inputPath)
  for (const name of files.filter(f => f.toLowerCase().endsWith('.docx'))) {
    const buffer = await fs.readFile(path.join(inputPath, name))
    filesToProcess.push({ name, buffer })
  }
  console.log('Tim thay ' + filesToProcess.length + ' file trong thu muc')
} else {
  console.error('Khong ho tro dinh dang nay')
  process.exit(1)
}

if (filesToProcess.length === 0) {
  console.log('Khong co file nao!')
  process.exit(0)
}

// ─── Check duplicates — fetch all existing sources first ──────────────────────
let filesToUpload = filesToProcess

if (mode === '--skip-duplicates' || mode === '--overwrite') {
  console.log('\nKiem tra file trung lap...')

  // Fetch all existing source names from Supabase (paginated)
  const existingSources = new Set()
  let page = 0
  const PAGE_SIZE = 1000
  while (true) {
    const { data } = await supabase
      .from('documents')
      .select('metadata')
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
    if (!data || data.length === 0) break
    data.forEach(d => { if (d.metadata?.source) existingSources.add(d.metadata.source) })
    if (data.length < PAGE_SIZE) break
    page++
  }

  console.log('So nguon da co trong Supabase: ' + existingSources.size)

  const duplicates = filesToProcess.filter(f => existingSources.has(f.name))
  console.log('File trung lap: ' + duplicates.length)

  if (mode === '--skip-duplicates') {
    filesToUpload = filesToProcess.filter(f => !existingSources.has(f.name))
    console.log('Se xu ly: ' + filesToUpload.length + ' file moi')
  } else if (mode === '--overwrite' && duplicates.length > 0) {
    for (const f of duplicates) {
      await supabase.from('documents').delete().filter('metadata->>source', 'eq', f.name)
    }
    console.log('Da xoa ' + duplicates.length + ' file cu, se ghi de')
    filesToUpload = filesToProcess
  }
} else {
  // No duplicate check — just append everything
  console.log('\nKhong kiem tra trung lap — them tat ca ' + filesToProcess.length + ' file')
}

if (filesToUpload.length === 0) {
  console.log('\nKhong co file moi nao can them!')
  process.exit(0)
}

// ─── Extract text ─────────────────────────────────────────────────────────────
console.log('\nDoc noi dung ' + filesToUpload.length + ' file...')
const documents = []

for (let i = 0; i < filesToUpload.length; i++) {
  const file = filesToUpload[i]
  try {
    const result = await mammoth.extractRawText({ buffer: file.buffer })
    const content = result.value.trim()
    if (content.length > 100) {
      for (let start = 0; start < content.length; start += 1300) {
        documents.push({
          content: content.slice(start, start + 1500),
          metadata: { source: file.name, isPriority: file.name.startsWith('PRIORITY_') }
        })
      }
    }
  } catch {}
  process.stdout.write('\r  ' + (i + 1) + '/' + filesToUpload.length + ' -> ' + documents.length + ' chunks')
}
console.log('\n' + documents.length + ' chunks san sang upload\n')

// ─── Embed + Upload ────────────────────────────────────────────────────────────
console.log('Upload len Supabase...')
const BATCH = 50
let uploaded = 0
let errors = 0

for (let i = 0; i < documents.length; i += BATCH) {
  const batch = documents.slice(i, i + BATCH)
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
      if (attempt >= 3) { errors += batch.length; console.error('\n  Loi batch ' + i + ': ' + err.message) }
      else await new Promise(r => setTimeout(r, 2000 * attempt))
    }
  }

  const pct = Math.round(Math.min(i + BATCH, documents.length) / documents.length * 100)
  process.stdout.write('\r  ' + pct + '% — ' + uploaded + ' uploaded, ' + errors + ' loi')
  await new Promise(r => setTimeout(r, 200))
}

const { count: newTotal } = await supabase.from('documents').select('*', { count: 'exact', head: true })

console.log('\n\n=====================================')
console.log('HOAN THANH!')
console.log('  Da them: ' + uploaded + ' vectors moi')
console.log('  Loi: ' + errors)
console.log('  Tong cong Supabase: ' + (newTotal || 0) + ' vectors')
console.log('=====================================\n')
