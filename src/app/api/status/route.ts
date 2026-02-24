import { NextResponse } from 'next/server'
import { getVectorStoreStatus } from '@/lib/rag-engine'
import { getStructuredFileStatus } from '@/lib/knowledge-hub'

export async function GET() {
  try {
    const vectorStatus = await getVectorStoreStatus()
    const structuredFiles = await getStructuredFileStatus()

    return NextResponse.json({
      ...vectorStatus,
      structuredDataReady: structuredFiles.length > 0,
      structuredFiles,
    })
  } catch (err) {
    return NextResponse.json({
      vectorStoreReady: false,
      documentCount: 0,
      structuredDataReady: false,
      structuredFiles: [],
    })
  }
}
