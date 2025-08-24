import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { uploadThumbnail, deleteThumbnail } from '@/lib/cloudinary'

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
    const { name, data, thumbnailDataUrl } = body

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

    // Check if we need to process thumbnail
    const shouldProcessThumbnail = thumbnailDataUrl && thumbnailDataUrl !== 'skip'
    
    let thumbnailUrl: string | undefined = undefined

    // SYNCHRONOUS thumbnail upload
    if (shouldProcessThumbnail) {
      try {
        console.log('Uploading thumbnail for canvas:', id)
        thumbnailUrl = await uploadThumbnail(thumbnailDataUrl, id)
        console.log('Thumbnail uploaded:', thumbnailUrl)
      } catch (error) {
        console.error('Thumbnail upload failed:', error)
        // Continue without thumbnail - don't fail the whole save
      }
    }

    // Update canvas with all data
    const canvas = await prisma.canvas.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(data && { data }),
        ...(thumbnailUrl && { 
          thumbnail: thumbnailUrl,
          thumbnailStatus: 'READY'
        }),
      }
    })

    // Invalidate dashboard cache
    revalidatePath('/dashboard')

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

    // Get canvas to check if it has a thumbnail
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

    // Delete thumbnail from Cloudinary if it exists
    if (existingCanvas.thumbnail) {
      deleteThumbnail(id).catch(console.error)
    }

    // Delete from database
    await prisma.canvas.delete({
      where: {
        id: id,
      }
    })
    
    // Invalidate dashboard cache
    revalidatePath('/dashboard')

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting canvas:', error)
    return NextResponse.json(
      { error: 'Failed to delete canvas' },
      { status: 500 }
    )
  }
}