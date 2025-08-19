import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

// GET - Fetch user's canvases
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const canvases = await prisma.canvas.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        name: true,
        thumbnail: true,
        createdAt: true,
        updatedAt: true,
      }
    })

    return NextResponse.json({ canvases })
  } catch (error) {
    console.error('Error fetching canvases:', error)
    return NextResponse.json(
      { error: 'Failed to fetch canvases' },
      { status: 500 }
    )
  }
}

// POST - Create new canvas
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { name, data } = body

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Canvas name is required' },
        { status: 400 }
      )
    }

    const canvas = await prisma.canvas.create({
      data: {
        name: name.trim(),
        data: data || {},
        userId: session.user.id,
        thumbnailStatus: 'READY',
      }
    })

    // CRITICAL FIX: Invalidate dashboard cache after creating canvas
    revalidatePath('/dashboard')

    return NextResponse.json({ canvas })
  } catch (error) {
    console.error('Error creating canvas:', error)
    return NextResponse.json(
      { error: 'Failed to create canvas' },
      { status: 500 }
    )
  }
}