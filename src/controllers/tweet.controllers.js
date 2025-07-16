import mongoose, { isValidObjectId } from "mongoose"
import { Tweet } from "../models/tweet.models.js"
import { User } from "../models/user.models.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
    //TODO: create tweet
    const { content } = req.body
    const userId = req.user?._id

    if(!content || content.trim() === ""){
        throw new ApiError(400, "Content is required")
    }

    if(!userId || !isValidObjectId(userId)){
        throw new ApiError(400, "Invalid user ID")
    }

    const tweet = await Tweet.create({
        content,
        owner: userId
    })

    if(!tweet){
        throw new ApiError(500, "Failed to create tweet")
    }

    return res
        .status(201)
        .json(new ApiResponse(201, "Tweet created successfully", tweet))
})

const getUserTweets = asyncHandler(async (req, res) => {
    // TODO: get user tweets
    const userId = req.params?.userId
    if (!userId || !isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid user ID")
    }

    const tweet = await Tweet.aggregate([
      {
        $match: { owner: new mongoose.Types.ObjectId(userId) }
      },
      {
        $lookup: {
          from: "users",
          localField: "owner",
          foreignField: "_id",
          as: "ownerDetails"
        }
      },
      {
        $unwind: "$ownerDetails"
      },
      {
        $project: {
          ownerDetails: "$ownerDetails.username", 
          content: 1,
          createdAt: 1,
          updatedAt: 1
        }
      }
    ])

    if(!tweet || tweet.length === 0) {
        throw new ApiError(404, "No tweets found for this user")
    }

    return res
        .status(200)
        .json(new ApiResponse(200, "User tweets retrieved successfully", tweet))
        
})

const updateTweet = asyncHandler(async (req, res) => {
    //TODO: update tweet
    const { tweetId } = req.params
    const { content } = req.body

    if(!tweetId || !isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet ID")
    }

    if(!content || content.trim() === "") {
        throw new ApiError(400, "Content is required")
    }

    const newTweet = await Tweet.findByIdAndUpdate(
      tweetId,
      {
        content,
      },
      { new: true }
    )

    if(!newTweet) {
        throw new ApiError(404, "Tweet not found")
    }

    return res
        .status(200)
        .json(new ApiResponse(200, "Tweet updated successfully", newTweet))
})

const deleteTweet = asyncHandler(async (req, res) => {
    //TODO: delete tweet
    const { tweetId } = req.params
    const userId = req.user?._id
    if(!tweetId || !isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet ID")
    }
    if(!userId || !isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid user ID")
    }

    const currentTweet = await Tweet.findById(tweetId)

    if(!currentTweet) {
      throw new ApiError(404, "Tweet not found")
    }

    if(currentTweet.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to delete this tweet")
    }
      
    const deletedTweet = await Tweet.findByIdAndDelete(tweetId)

    if(!deletedTweet) {
        throw new ApiError(404, "Tweet not found")
    }

    return res
        .status(200)
        .json(new ApiResponse(200, "Tweet deleted successfully", {}))
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}