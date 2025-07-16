import mongoose, { isValidObjectId } from "mongoose"
import { Playlist } from "../models/playlist.models.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"


const createPlaylist = asyncHandler(async (req, res) => {
  const { name, description } = req.body
  //TODO: create playlist
  if(!name.trim() || !description.trim()) {
    throw new ApiError(400, "Name and description are required")
  }

  const playlist = await Playlist.create({
    name,
    description,
    owner: req.user?._id
  })

  if(!playlist) {
    throw new ApiError(500, "Failed to create playlist")
  }

  return res
    .status(201)
    .json(new ApiResponse(201, playlist,"Playlist created successfully"))

})

const getUserPlaylists = asyncHandler(async (req, res) => {
  const { userId } = req.params
  //TODO: get user playlists
  if(!userId || !isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid user ID")
  }

  const playlists = await Playlist.find({ owner: userId })
    .populate("videos", "title thumbnail")
    .populate("owner", "name email");

  if(!playlists || playlists.length === 0) {
    throw new ApiError(404, "No playlists found for this user")
  }

  return res
    .status(200)
    .json(new ApiResponse(200, playlists, "Playlists fetched successfully"))
})

const getPlaylistById = asyncHandler(async (req, res) => {
  const { playlistId } = req.params
  //TODO: get playlist by id
  if(!playlistId || !isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid playlist ID")
  }

  const playlist = await Playlist.findById(playlistId)
    .populate("videos", "title thumbnail")
    .populate("owner", "username email")

  if(!playlist) {
    throw new ApiError(404, "Playlist not found")
  }

  return res
    .status(200)
    .json(new ApiResponse(200, playlist, "Playlist fetched successfully"))
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params

  if(!playlistId || !isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid playlist ID")
  }

  if(!videoId || !isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID")
  }

  const playlist = await Playlist.findById(playlistId)
  if(!playlist) {
    throw new ApiError(404, "Playlist not found")
  }

  if(playlist.videos.includes(videoId)) {
    throw new ApiError(400, "Video already exists in the playlist")
  }

  playlist.videos.push(videoId)

  await playlist.save()

  if(!playlist) {
    throw new ApiError(500, "Failed to add video to playlist")
  }

  return res
    .status(200)
    .json(new ApiResponse(200, playlist, "Video added to playlist successfully"))

})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  const {playlistId, videoId} = req.params
  // TODO: remove video from playlist
  if(!playlistId || !isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid playlist ID")
  }

  if(!videoId || !isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID")
  }

  const currentPlaylist = await Playlist.findById(playlistId)

  if(!currentPlaylist) {
    throw new ApiError(404, "Playlist not found")
  }

  if(currentPlaylist.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to remove videos from this playlist")
  }

  const videoIndex = currentPlaylist.videos.indexOf(videoId)

  if(videoIndex === -1) {
    throw new ApiError(404, "Video not found in the playlist")
  }

  currentPlaylist.videos.splice(videoIndex, 1)

  await currentPlaylist.save()

  return res
    .status(200)
    .json(new ApiResponse(200, currentPlaylist, "Video removed from playlist successfully"))
})

const deletePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params
  // TODO: delete playlist
  if(!playlistId || !isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid playlist ID")
  }

  const currentPlaylist = await Playlist.findById(playlistId)

  if(!currentPlaylist) {
    throw new ApiError(404, "Playlist not found")
  }

  if(currentPlaylist.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to delete this playlist")
  }

  const deletedPlaylist = await Playlist.findByIdAndDelete(playlistId)

  if(!deletedPlaylist) {
    throw new ApiError(500, "Failed to delete playlist")
  }

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Playlist deleted successfully"))
})

const updatePlaylist = asyncHandler(async (req, res) => {
  const {playlistId} = req.params
  const {name, description} = req.body
  //TODO: update playlist
  if(!playlistId || !isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid playlist ID")
  }

  if(!name.trim() || !description.trim()) {
    throw new ApiError(400, "Name and description are required")
  }

  const currentPlaylist = await Playlist.findById(playlistId)

  if(!currentPlaylist) {
    throw new ApiError(404, "Playlist not found")
  }

  if(currentPlaylist.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to update this playlist")
  }

  const updatedPlaylist = await Playlist.findByIdAndUpdate(
    playlistId,
    { name, description },
    { new: true }
  )

  if(!updatedPlaylist) {
    throw new ApiError(500, "Failed to update playlist")
  }

  return res
    .status(200)
    .json(new ApiResponse(200, updatedPlaylist, "Playlist updated successfully"))
})

export {
  createPlaylist,
  getUserPlaylists,
  getPlaylistById,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  deletePlaylist,
  updatePlaylist
}