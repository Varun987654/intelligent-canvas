import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  
  try {
    const canvas = await prisma.canvas.findUnique({
      where: { id },
      select: { data: true }
    })

    if (!canvas) {
      return NextResponse.json({ data: { lines: [], shapes: [], texts: [] } })
    }

    return NextResponse.json({ data: canvas.data })
  } catch (error) {
    console.error('Error fetching canvas data:', error)
    return NextResponse.json({ data: { lines: [], shapes: [], texts: [] } })
  }
}