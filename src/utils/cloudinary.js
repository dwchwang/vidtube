import { v2 as cloudinary } from 'cloudinary'
import fs from 'fs'
import dotenv from 'dotenv'

dotenv.config()

// Configure Cloudinary
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME , 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null
    const response = await cloudinary.uploader.upload(
      localFilePath,{
        resource_type: 'auto'
      }
    )
    console.log('File uploaded to Cloudinary. File src: ' + response.url)
    //once the file is uploaded, delete it from the our server
    fs.unlinkSync(localFilePath)
    return response
  } catch (error) {
    console.error('Error uploading file to Cloudinary:', error)
    fs.unlinkSync(localFilePath)
    return null
  }
}

const deleteFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId)
    console.log("🚀 ~ deleteFromCloudinary. PublicId", publicId)
    
  } catch (error) {
    console.log('Error deleting file from Cloudinary:', error)
    return null
  }
}

export { uploadOnCloudinary, deleteFromCloudinary }