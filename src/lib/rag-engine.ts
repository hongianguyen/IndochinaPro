/**
 * RAG Engine — Indochina Travel Pro
 * SERVER ONLY — do not import from client components
 */
import 'server-only'

import path from 'path'
import fs from 'fs/promises'

const VECTOR_STORE_PATH = process.env.VECTOR_DB_PATH || './data/vector-store'

async function getLangChain() {
  const [
    { RecursiveCharacterTextSplitter },
    { OpenAIEmbeddings },
    { FaissStore },
  ] = await Promise.all([
    import('langchain/text_splitter'),
    import('@langchain/openai'),
    import('@langchain/community/vectorstores/faiss'),
  ])
  return { RecursiveCharacterTextSplitter, OpenAIEmbeddings, FaissStore }
}

export async function ingestDocuments(
  files: Array<{ name: string; content: string }>,
  onProgress: (current: number, total: number, file: string, vectors: number) => void
) {
  const { RecursiveCharacterTextSplitter, OpenAIEmbeddings, FaissStore } = await getLangChain()

  const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 1500, chunkOverlap: 200 })
  const embeddings = new OpenAIEmbeddings({
    openAIApiKey: process.env.OPENAI_API_KEY,
    modelName: 'text-embedding-3-small',
  })

  const sorted = [...files].sort((a, b) => {
    return (a.name.startsWith('PRIORITY_') ? 0 : 1) - (b.name.startsWith('PRIORITY_') ? 0 : 1)
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

    if (allDocs.length > 0 && (i % 50 === 0 || i === sorted.length - 1)) {
      try {
        await fs.mkdir(VECTOR_STORE_PATH, { recursive: true })
        let store: any
        try {
          store = await FaissStore.load(VECTOR_STORE_PATH, embeddings)
          await store.addDocuments(allDocs.splice(0))
        } catch {
          store = await FaissStore.fromDocuments(allDocs.splice(0), embeddings)
        }
        await store.save(VECTOR_STORE_PATH)
      } catch (err) {
        console.error('Vector store save error:', err)
      }
    }
  }

  await fs.writeFile(
    path.join(VECTOR_STORE_PATH, 'metadata.json'),
    JSON.stringify({ documentCount: vectorCount, fileCount: sorted.length, lastIngested: new Date().toISOString() })
  )

  return { vectorsCreated: vectorCount, filesProcessed: sorted.length }
}

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
  } catch {
    return []
  }
}

export async function getVectorStoreStatus() {
  try {
    const meta = JSON.parse(await fs.readFile(path.join(VECTOR_STORE_PATH, 'metadata.json'), 'utf-8'))
    return { vectorStoreReady: true, ...meta }
  } catch {
    return { vectorStoreReady: false, documentCount: 0 }
  }
}
