/**
 * RAG Engine — Indochina Travel Pro
 * Handles: ingestion, vectorization, retrieval for itinerary generation
 */

import path from 'path'
import fs from 'fs/promises'

const VECTOR_STORE_PATH = process.env.VECTOR_DB_PATH || './data/vector-store'

// ─── Dynamic imports to avoid SSR issues ──────────────────────────────────────
async function getLangChain() {
  const { RecursiveCharacterTextSplitter } = await import('langchain/text_splitter')
  const { OpenAIEmbeddings } = await import('@langchain/openai')
  const { FaissStore } = await import('@langchain/community/vectorstores/faiss')
  const { Document } = await import('langchain/document')
  return { RecursiveCharacterTextSplitter, OpenAIEmbeddings, FaissStore, Document }
}

// ─── Ingest Pipeline ───────────────────────────────────────────────────────────
export async function ingestDocuments(
  files: Array<{ name: string; content: string }>,
  onProgress: (current: number, total: number, file: string, vectors: number) => void
) {
  const { RecursiveCharacterTextSplitter, OpenAIEmbeddings, FaissStore, Document } =
    await getLangChain()

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1500,
    chunkOverlap: 200,
  })

  const embeddings = new OpenAIEmbeddings({
    openAIApiKey: process.env.OPENAI_API_KEY,
    modelName: 'text-embedding-3-small',
  })

  // Sort: PRIORITY_ files first
  const sorted = [...files].sort((a, b) => {
    const aPriority = a.name.startsWith('PRIORITY_') ? 0 : 1
    const bPriority = b.name.startsWith('PRIORITY_') ? 0 : 1
    return aPriority - bPriority
  })

  const allDocs: any[] = []
  let vectorCount = 0

  for (let i = 0; i < sorted.length; i++) {
    const file = sorted[i]
    onProgress(i + 1, sorted.length, file.name, vectorCount)

    if (!file.content || file.content.trim().length < 50) continue

    try {
      const chunks = await splitter.createDocuments(
        [file.content],
        [{ source: file.name, isPriority: file.name.startsWith('PRIORITY_') }]
      )
      allDocs.push(...chunks)
      vectorCount += chunks.length
    } catch (err) {
      console.error(`Error processing ${file.name}:`, err)
    }

    // Batch vectorize every 200 docs
    if (allDocs.length > 0 && (i % 50 === 0 || i === sorted.length - 1)) {
      try {
        await fs.mkdir(VECTOR_STORE_PATH, { recursive: true })
        
        // Check if store exists to merge
        let store: any
        try {
          store = await FaissStore.load(VECTOR_STORE_PATH, embeddings)
          await store.addDocuments(allDocs.splice(0))
        } catch {
          store = await FaissStore.fromDocuments(allDocs.splice(0), embeddings)
        }
        
        await store.save(VECTOR_STORE_PATH)
        console.log(`Saved checkpoint at file ${i + 1}/${sorted.length}`)
      } catch (err) {
        console.error('Vector store save error:', err)
      }
    }
  }

  // Save metadata
  await fs.writeFile(
    path.join(VECTOR_STORE_PATH, 'metadata.json'),
    JSON.stringify({
      documentCount: vectorCount,
      fileCount: sorted.length,
      lastIngested: new Date().toISOString(),
    })
  )

  return { vectorsCreated: vectorCount, filesProcessed: sorted.length }
}

// ─── Retrieval ─────────────────────────────────────────────────────────────────
export async function retrieveRelevantTours(query: string, k = 8): Promise<string[]> {
  const { OpenAIEmbeddings, FaissStore } = await getLangChain()

  try {
    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: 'text-embedding-3-small',
    })

    const store = await FaissStore.load(VECTOR_STORE_PATH, embeddings)
    const docs = await store.similaritySearch(query, k)

    return docs.map((d: any) => d.pageContent)
  } catch (err) {
    console.error('Retrieval error:', err)
    return []
  }
}

// ─── Status Check ──────────────────────────────────────────────────────────────
export async function getVectorStoreStatus() {
  try {
    const metaPath = path.join(VECTOR_STORE_PATH, 'metadata.json')
    const meta = JSON.parse(await fs.readFile(metaPath, 'utf-8'))
    return { vectorStoreReady: true, ...meta }
  } catch {
    return { vectorStoreReady: false, documentCount: 0 }
  }
}
