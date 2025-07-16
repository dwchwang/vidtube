import mongoose, {isValidObjectId} from "mongoose"
import { Comment } from "../models/comment.models.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const {videoId} = req.params
    const {page = 1, limit = 10} = req.query

    const pipeline = []
    if(!videoId || !isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID")
    }
    pipeline.push({
        $match: {
            video: new mongoose.Types.ObjectId(videoId)
        }
    })

    pipeline.push(
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner"
            }
        },
        { $unwind: "$owner" },
        {
            $project: {
                content: 1,
                createdAt: 1,
                owner: {
                    _id: 1,
                    fullname: 1,
                    username: 1
                }
            }
        },
        { $sort: { createdAt: -1 } }
    )

    const fetchedComments = await Comment.aggregatePaginate(Comment.aggregate(pipeline), {
        page: parseInt(page),
        limit: parseInt(limit)
    })

    return res
        .status(200)
        .json(new ApiResponse(200, fetchedComments, "Comments fetched successfully"))
})

const addComment = asyncHandler(async (req, res) => {
    // TODO: add a comment to a video
    const { videoId } = req.params
    const { content } = req.body
    const userId = req.user._id
    if(!videoId || !isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID")
    }
    if(!content || content.trim() === "") {
        throw new ApiError(400, "Content cannot be empty")
    }

    const comment = await Comment.create({
      content,
      owner: userId,
      video: videoId
    })

    if(!comment) {
        throw new ApiError(500, "Failed to add comment")
    }

    return res
      .status(201)
      .json( new ApiResponse(201, "Comment added successfully", comment))
})

const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment
    const { commentId } = req.params
    const { content } = req.body
    const userId = req.user?._id

    if(!commentId || !isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment ID")
    }

    if(!content || content.trim() === "") {
        throw new ApiError(400, "Content cannot be empty")
    }
    const currentComment = await Comment.findById(commentId)

    if(!currentComment) {
        throw new ApiError(404, "Comment not found")
    }

    if(currentComment.owner.toString() !== userId.toString()) {
        throw new ApiError(403, "You are not authorized to update this comment")
    }

    const newComment = await Comment.findByIdAndUpdate(
        commentId,
        { content },
        { new: true }
    )

    if(!newComment) {
        throw new ApiError(500, "Failed to update comment")
    }

    return res
        .status(200)
        .json(new ApiResponse(200, "Comment updated successfully", newComment))
})

const deleteComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params
    const userId = req.user?._id

    if(!commentId || !isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment ID")
    }

    const currentComment = await Comment.findById(commentId)

    if(!currentComment) {
        throw new ApiError(404, "Comment not found")
    }
    if(currentComment.owner.toString() !== userId.toString()) {
        throw new ApiError(403, "You are not authorized to delete this comment")
    }

    const deletedComment = await Comment.findByIdAndDelete(commentId)
    if(!deletedComment) {
        throw new ApiError(500, "Failed to delete comment")
    }
    
    return res
        .status(200)
        .json(new ApiResponse(200, "Comment deleted successfully", {}))
})

export {
    getVideoComments, 
    addComment, 
    updateComment,
    deleteComment
    }