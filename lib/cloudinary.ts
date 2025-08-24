import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export default cloudinary

export async function uploadThumbnail(dataUrl: string, canvasId: string) {
  try {
    const result = await cloudinary.uploader.upload(dataUrl, {
      folder: 'intelligent-canvas/thumbnails',
      public_id: canvasId,  // Keep same ID - overwrites previous
      resource_type: 'image',
      format: 'jpg',
      overwrite: true,  // Replace existing file
      invalidate: true,  // Invalidate CDN cache
      transformation: [
        { width: 400, height: 225, crop: 'fill' },
        { quality: 'auto:low' },
      ],
    })
    
    // Add timestamp to URL only (not to filename)
    const timestamp = Date.now()
    return `${result.secure_url}?v=${timestamp}`
  } catch (error) {
    console.error('Cloudinary upload error:', error)
    throw new Error('Failed to upload thumbnail')
  }
}

export async function deleteThumbnail(canvasId: string) {
  try {
    await cloudinary.uploader.destroy(`intelligent-canvas/thumbnails/${canvasId}`)
  } catch (error) {
    console.error('Cloudinary delete error:', error)
  }
}