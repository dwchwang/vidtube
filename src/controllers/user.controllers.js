import { ApiError } from "../utils/ApiError.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { User } from "../models/user.models.js"
import { uploadOnCloudinary, deleteFromCloudinary  } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"


const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId)
    //small check for user existence
    if(!user){
      throw new ApiError(404, "User not found")
    }
  
    const accessToken = user.generateAccessToken()
    const refreshToken = user.generateRefreshToken()
    user.refreshToken = refreshToken
    await user.save({ validateBeforeSave: false }) 
    return { accessToken, refreshToken }
  } catch (error) {
    throw new ApiError(500, "Some went wrong while generating access and refresh tokens")
  }
}

const registerUser = asyncHandler( async(req, res) => {
  const { fullname, email, username, password } = req.body

  //validation
  if(
    [fullname, email, username, password].some((field) => {
      field?.trim() === ""
    })
  ){
    throw new ApiError(400, "All fields are required")
  }

  const exitedUser = await User.findOne({ 
    $or: [{username}, {email}]
  })

  if(exitedUser){
    throw new ApiError(409, "User with email or username already exists")
  }

  console.warn("req.files", req.files)
  const avatarLocalPath = req.files?.avatar?.[0]?.path
  const coverLocalPath = req.files?.coverImage?.[0]?.path

  if(!avatarLocalPath){
    throw new ApiError(400, "Avatar file is missing")
  }

  // const avatar = await uploadOnCloudinary(avatarLocalPath)
  // let coverImage = ""
  // if(coverLocalPath){
  //   coverImage = await uploadOnCloudinary(coverLocalPath)
  // }

  let avatar
  try {
    avatar = await uploadOnCloudinary(avatarLocalPath)
    console.log("Avatar uploaded successfully:", avatar)
  } catch (error) {
    console.log("Error uploading avatar:", error)
    throw new ApiError(500, "Failed to upload avatar image")
  }
  
  let coverImage 
  try {
    coverImage = await uploadOnCloudinary(coverLocalPath)
    console.log("coverImage uploaded successfully:", coverImage)
  } catch (error) {
    console.log("Error uploading coverImage:", error)
    throw new ApiError(500, "Failed to upload coverImage ")
  }

  try {
    const user = await User.create({
      fullname,
      avatar: avatar.url,
      coverImage: coverImage.url || "",
      email,
      password,
      username: username.toLowerCase()
    })
  
    const createdUser = await User.findById(user._id).select(
      "-password -refreshToken"
    )
  
    if(!createdUser){
      throw new ApiError(500, "Something went wrong while registering a user")
    }
  
    return res
      .status(201)
      .json( new ApiResponse(200, createdUser, "User created successfully") )
  } catch (error) {
    console.log("User creation failed")
    if(avatar){
      await deleteFromCloudinary(avatar.public_id)
    }
    if(coverImage){
      await deleteFromCloudinary(coverImage.public_id)
    }
    throw new ApiError(500, "Something went wrong while registering a user and images were deleted")
  }
  
})

const loginUser = asyncHandler( async(req,res) => {
  // get data from request body
  const { email, username, password} = req.body

  // validation
  if(!email) {
    throw new ApiError(400, "Email is required")
  }

  const user = await User.findOne({ 
    $or: [{username}, {email}]
  })

  if(!user) {
    throw new ApiError(404, "User not found")
  }

  // validate password

  const isPasswordValid = await user.isPasswordcorrect(password)

  if(!isPasswordValid){
    throw new ApiError(401, "Invalid credentials")
  } 

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id)

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  )

  if(!loggedInUser){
    throw new ApiError(500, "Something went wrong while logging in")
  }

  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // set to true in production}
  }

  return res
    .status(200)
    .cookie("refreshToken", refreshToken, options)
    .cookie("accessToken", accessToken, options)
    .json( new ApiResponse(
      200, 
      { user : loggedInUser, accessToken, refreshToken },
      "User logged in successfully"
    ))
})



export {
  registerUser,
  loginUser
}