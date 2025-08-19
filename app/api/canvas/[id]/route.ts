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

    // Determine if we're processing a thumbnail
    const isProcessingThumbnail = thumbnailDataUrl && thumbnailDataUrl !== 'skip'

    // STEP 1: Update canvas data immediately
    const canvas = await prisma.canvas.update({
      where: {
        id: id,
      },
      data: {
        ...(name && { name: name.trim() }),
        ...(data && { data }),
        // Set status to PROCESSING if we have a thumbnail to upload
        ...(isProcessingThumbnail && { thumbnailStatus: 'PROCESSING' }),
      }
    })

    // Invalidate dashboard immediately so it shows processing state
    revalidatePath('/dashboard')

    // STEP 2: Process thumbnail in background (don't await)
    if (isProcessingThumbnail) {
      uploadThumbnail(thumbnailDataUrl, id)
        .then(async (thumbnailUrl) => {
          // Update canvas with thumbnail URL and mark as READY
          await prisma.canvas.update({
            where: { id },
            data: { 
              thumbnail: thumbnailUrl,
              thumbnailStatus: 'READY'
            }
          })
          // Invalidate dashboard again to show the thumbnail
          revalidatePath('/dashboard')
        })
        .catch(async (error) => {
          console.error('Thumbnail upload failed:', error)
          // Mark as FAILED so UI can show error state
          await prisma.canvas.update({
            where: { id },
            data: { 
              thumbnailStatus: 'FAILED'
            }
          })
          revalidatePath('/dashboard')
        })
    }

    // STEP 3: Return immediately (don't wait for thumbnail)
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