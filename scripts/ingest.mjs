#!/usr/bin/env node
/**
 * Standalone ingestion script
 * Usage: node scripts/ingest.mjs ./path/to/tours.zip
 */

import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const zipPath = process.argv[2]

if (!zipPath) {
  console.error('Usage: node scripts/ingest.mjs <path-to-zip>')
  process.exit(1)
}

console.log('📦 Indochina Travel Pro — Data Ingestion Script')
console.log('================================================')
console.log(`📂 Input: ${zipPath}`)
console.log('')

// Dynamic imports
const { default: JSZip } = await import('jszip')
const { default: mammoth } = await import('mammoth')

// Load .env.local
try {
  const { config } = await import('dotenv')
  config({ path: path.join(__dirname, '../.env.local') })
} catch {}

const OPENAI_KEY = process.env.OPENAI_API_KEY
if (!OPENAI_KEY) {
  console.error('❌ Missing OPENAI_API_KEY in .env.local')
  process.exit(1)
}

console.log('✅ OpenAI API key found')

// Read zip
console.log('📤 Reading ZIP file...')
const zipBuffer = await fs.readFile(zipPath)
const zip = await JSZip.loadAsync(zipBuffer)

const docxFiles = Object.keys(zip.files).filter(
  name => name.toLowerCase().endsWith('.docx') && !zip.files[name].dir
)

console.log(`📄 Found ${docxFiles.length} .docx files`)

// Sort PRIORITY_ first
const sorted = docxFiles.sort((a, b) => {
  const aP = path.basename(a).startsWith('PRIORITY_') ? 0 : 1
  const bP = path.basename(b).startsWith('PRIORITY_') ? 0 : 1
  return aP - bP
})

// Extract text
console.log('\n📖 Extracting text from documents...')
const extracted = []
let errors = 0

for (let i = 0; i < sorted.length; i++) {
  const fileName = sorted[i]
  const fileData = await zip.files[fileName].async('nodebuffer')

  try {
    const result = await mammoth.extractRawText({ buffer: fileData })
    if (result.value.trim().length > 50) {
      extracted.push({
        name: path.basename(fileName),
        content: result.value,
      })
    }
  } catch (err) {
    errors++
  }

  if (i % 100 === 0) {
    process.stdout.write(`\r  Progress: ${i + 1}/${sorted.length} (${Math.round((i+1)/sorted.length*100)}%)`)
  }
}

console.log(`\n✅ Extracted ${extracted.length} documents (${errors} errors)`)

// Vectorize
console.log('\n🧠 Vectorizing with OpenAI embeddings...')

const { RecursiveCharacterTextSplitter } = await import('langchain/text_splitter')
const { OpenAIEmbeddings } = await import('@langchain/openai')
const { FaissStore } = await import('@langchain/community/vectorstores/faiss')

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1500,
  chunkOverlap: 200,
})

const embeddings = new OpenAIEmbeddings({
  openAIApiKey: OPENAI_KEY,
  modelName: 'text-embedding-3-small',
})

const VECTOR_PATH = path.join(__dirname, '../data/vector-store')
await fs.mkdir(VECTOR_PATH, { recursive: true })

let totalVectors = 0
const BATCH_SIZE = 50

for (let i = 0; i < extracted.length; i += BATCH_SIZE) {
  const batch = extracted.slice(i, i + BATCH_SIZE)
  const docs = []

  for (const file of batch) {
    const chunks = await splitter.createDocuments(
      [file.content],
      [{ source: file.name, isPriority: file.name.startsWith('PRIORITY_') }]
    )
    docs.push(...chunks)
  }

  let store
  try {
    store = await FaissStore.load(VECTOR_PATH, embeddings)
    await store.addDocuments(docs)
  } catch {
    store = await FaissStore.fromDocuments(docs, embeddings)
  }

  await store.save(VECTOR_PATH)
  totalVectors += docs.length

  process.stdout.write(
    `\r  Vectorized: ${Math.min(i + BATCH_SIZE, extracted.length)}/${extracted.length} files · ${totalVectors} vectors`
  )
}

// Save metadata
await fs.writeFile(
  path.join(VECTOR_PATH, 'metadata.json'),
  JSON.stringify({
    documentCount: totalVectors,
    fileCount: extracted.length,
    lastIngested: new Date().toISOString(),
  })
)

console.log(`\n\n✅ COMPLETE!`)
console.log(`   📊 ${totalVectors} vectors created`)
console.log(`   📁 ${extracted.length} documents processed`)
console.log(`   💾 Saved to: ${VECTOR_PATH}`)
console.log('\n🚀 You can now start the app: npm run dev')
