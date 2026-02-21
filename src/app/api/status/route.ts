import { NextResponse } from 'next/server'
import { getVectorStoreStatus } from '@/lib/rag-engine'

export async function GET() {
  try {
    const status = await getVectorStoreStatus()
    return NextResponse.json(status)
  } catch (err) {
    return NextResponse.json({ vectorStoreReady: false, documentCount: 0 })
  }
}
