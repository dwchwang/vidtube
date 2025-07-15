import mongoose, { isValidObjectId } from "mongoose"
import { Subscription } from "../models/subscription.models.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { User } from "../models/user.models.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const { channelId } = req.params
    if(!mongoose.isValidObjectId(channelId)){
      throw new ApiError(400, "Invalid channel ID")
    }

    // check if user is already subscribed to the channel
    const existingSubscription = await Subscription.findOne({
      subscriber: req.user?._id,
      channel: channelId
    })

    if(existingSubscription){
        // user is already subscribed, so unsubscribe
        await Subscription.deleteOne({
          _id: existingSubscription?._id
        })
        return res
            .status(200)
            .json(new ApiResponse(200, null, "Unsubscribed from channel successfully"))
    } 
    // user is not subscribed, so subscribe
    const newSubscription = await Subscription.create({
      subscriber: req.user?._id,
      channel: channelId
    })
    if(!newSubscription){
        throw new ApiError(500, "Failed to subscribe to channel")
    }
    await newSubscription.save({ timestamps: false });
    const channelUser = await User.findById(channelId).select("fullname username");
    const subscriberUser = await User.findById(req.user._id).select("fullname username");
    return res
      .status(201)
      .json(new ApiResponse(
        201,
        // newSubscription,
        {
          subscriber: subscriberUser,
          channel: channelUser
        },
        "Subscribed to channel successfully",
      ))
          
})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const { channelId } = req.params
    if(!mongoose.isValidObjectId(channelId) || !channelId){
        throw new ApiError(400, "Invalid channel ID")
    }
    const subscribers = await Subscription.aggregate([
      {
        $match:{ 
          channel: new mongoose.Types.ObjectId(channelId),
        }
      },
      {
        $count: "subscriberCount"
      }
    ])
    const channelOwner = await User.findById(channelId).select("fullname username");

    const subscriberCount = subscribers[0]?.subscriberCount || 0;

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          channel: channelOwner,
          subscriberCount: subscriberCount
        },
        "Subscriber count fetched successfully"
      )
    )
})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params
    if(!subscriberId || !isValidObjectId(subscriberId)){
        throw new ApiError(400, "Invalid subscriber ID")
    }
    const subscribedChannels = await Subscription.aggregate([
      {
        $match:{
          subscriber: new mongoose.Types.ObjectId(subscriberId)
        }
      },
      {
        $count: "subscribedChannelCount"
      }
    ])

    const user = await User.findById(subscriberId).select("fullname username");

    const subscribedChannelCount = subscribedChannels[0]?.subscribedChannelCount || 0

    return res.
      status(200)
      .json(new ApiResponse(
        200,
        {
          user: user,
          subscribedChannelCount: subscribedChannelCount
        },
        "Subscribed channel count fetched successfully"
      ))
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}