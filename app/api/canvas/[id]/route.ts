import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// GET - Fetch single canvas
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const canvas = await prisma.canvas.findFirst({
      where: {
        id: id,
        userId: session.user.id,
      }
    })

    if (!canvas) {
      return NextResponse.json(
        { error: 'Canvas not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ canvas })
  } catch (error) {
    console.error('Error fetching canvas:', error)
    return NextResponse.json(
      { error: 'Failed to fetch canvas' },
      { status: 500 }
    )
  }
}

// PUT - Update canvas
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { name, data, thumbnail } = body

    // First verify ownership
    const existingCanvas = await prisma.canvas.findFirst({
      where: {
        id: id,
        userId: session.user.id,
      }
    })

    if (!existingCanvas) {
      return NextResponse.json(
        { error: 'Canvas not found' },
        { status: 404 }
      )
    }

    // Now update using only the unique id
    const canvas = await prisma.canvas.update({
      where: {
        id: id,
      },
      data: {
        ...(name && { name: name.trim() }),
        ...(data && { data }),
        ...(thumbnail && { thumbnail }),
      }
    })

    return NextResponse.json({ canvas })
  } catch (error) {
    console.error('Error updating canvas:', error)
    return NextResponse.json(
      { error: 'Failed to update canvas' },
      { status: 500 }
    )
  }
}

// DELETE - Delete canvas
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const canvas = await prisma.canvas.deleteMany({
      where: {
        id: id,
        userId: session.user.id,
      }
    })

    if (canvas.count === 0) {
      return NextResponse.json(
        { error: 'Canvas not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting canvas:', error)
    return NextResponse.json(
      { error: 'Failed to delete canvas' },
      { status: 500 }
    )
  }
}