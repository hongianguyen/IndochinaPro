import 'server-only'
import path from 'path'
import fs from 'fs/promises'
import OpenAI from 'openai'

const USE_SUPABASE = !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY)

// Top-level client — avoids dynamic import mangling in production builds
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// ─── Supabase Search ────────────────────────────────────────────────────────
async function supabaseSearch(query: string, k: number): Promise<string[]> {
  const { createClient } = await import('@supabase/supabase-js')

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )

  const embResponse = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: query,
  })
  const embedding = embResponse.data[0].embedding

  const { data, error } = await supabase.rpc('match_documents', {
    query_embedding: embedding,
    match_threshold: 0.5,
    match_count: k,
  })

  if (error) throw new Error(error.message)
  return (data || []).map((d: any) => d.content)
}

// ─── Public API ─────────────────────────────────────────────────────────────
export async function retrieveRelevantTours(query: string, k = 8): Promise<string[]> {
  try {
    if (USE_SUPABASE) {
      return await supabaseSearch(query, k)
    }
    return [] // No vector store — AI generates without RAG context
  } catch (err) {
    console.error('RAG error:', err)
    return []
  }
}

export async function ingestDocuments(
  files: Array<{ name: string; content: string }>,
  onProgress: (current: number, total: number, file: string, vectors: number) => void
) {
  throw new Error('Use ingest-supabase.mjs script to ingest documents')
}

export async function getVectorStoreStatus() {
  try {
    if (USE_SUPABASE) {
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_KEY!
      )
      const { count } = await supabase
        .from('documents')
        .select('*', { count: 'exact', head: true })
      return { vectorStoreReady: (count || 0) > 0, documentCount: count || 0, mode: 'supabase' }
    }
    // Try local metadata
    const meta = JSON.parse(await fs.readFile('./data/metadata.json', 'utf-8'))
    return { vectorStoreReady: true, ...meta }
  } catch {
    return { vectorStoreReady: false, documentCount: 0 }
  }
}
