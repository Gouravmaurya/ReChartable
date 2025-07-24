const axios = require('axios');
const asyncHandler = require('../middleware/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const { google } = require('googleapis');
const SpotifyWebApi = require('spotify-web-api-node');
const Podcast = require('../models/Podcast');

// --- Helper Functions --- //

const getUrlType = (url) => {
  if (url.includes('spotify.com')) return 'spotify';
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  return 'rss';
};

const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
});

let spotifyTokenExpirationTime = 0;

async function getSpotifyToken() {
  if (Date.now() > spotifyTokenExpirationTime) {
    try {
        const data = await spotifyApi.clientCredentialsGrant();
        spotifyApi.setAccessToken(data.body['access_token']);
        spotifyTokenExpirationTime = Date.now() + data.body['expires_in'] * 1000 - 60000; // Refresh 1 minute before expiry
    } catch (error) {
        console.error('Error getting Spotify token:', error.body || error.message);
        throw new ErrorResponse('Could not authorize with Spotify. Please check server credentials.', 500);
    }
  }
}

// --- API Handlers --- //

const handleRssUrl = async (podcastUrl) => {
  // Implementation for RSS feeds, if needed
  throw new ErrorResponse('RSS feeds are not yet supported.', 501);
};

const handleSpotifyUrl = async (podcastUrl) => {
  if (!process.env.SPOTIFY_CLIENT_ID || process.env.SPOTIFY_CLIENT_ID === 'your_spotify_client_id') {
    throw new ErrorResponse('Spotify API credentials are not configured on the server.', 500);
  }

  try {
    await getSpotifyToken();
    
    const match = podcastUrl.match(/spotify\.com\/(show|episode|track)\/([a-zA-Z0-9]+)/);
    if (!match) {
        throw new ErrorResponse('Invalid Spotify URL. Could not extract ID.', 400);
    }

    const type = match[1];
    const id = match[2];

    let data;
    if (type === 'show') {
        const showResponse = await spotifyApi.getShow(id);
        const episodesResponse = await spotifyApi.getShowEpisodes(id, { limit: 10 });
        data = {
            type: 'show',
            ...showResponse.body,
            episodes: episodesResponse.body.items
        };
    } else if (type === 'episode') {
        const episodeResponse = await spotifyApi.getEpisode(id);
        data = { type: 'episode', ...episodeResponse.body };
    } else if (type === 'track') {
        const trackResponse = await spotifyApi.getTrack(id);
        data = { type: 'track', ...trackResponse.body };
    }

    return data;

  } catch (error) {
    console.error('Spotify API Error:', error.body || error.message);
    throw new ErrorResponse('Failed to fetch data from Spotify. Check the URL and API credentials.', 500);
  }
};

const handleYouTubeUrl = async (podcastUrl) => {
  if (!process.env.YOUTUBE_API_KEY || process.env.YOUTUBE_API_KEY === 'your_youtube_api_key_here') {
    throw new ErrorResponse('YouTube API key is not configured on the server.', 500);
  }

  try {
    const youtube = google.youtube({ version: 'v3', auth: process.env.YOUTUBE_API_KEY });
    const playlistIdMatch = podcastUrl.match(/list=([a-zA-Z0-9_-]+)/);
    const videoIdMatch = podcastUrl.match(/(?:watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);

    if (playlistIdMatch) {
        const playlistId = playlistIdMatch[1];
        const playlistResponse = await youtube.playlists.list({ part: 'snippet,contentDetails', id: playlistId });
        if (!playlistResponse.data.items || playlistResponse.data.items.length === 0) {
            throw new ErrorResponse('YouTube playlist not found or is private.', 404);
        }
        const playlist = playlistResponse.data.items[0];
        const playlistItemsResponse = await youtube.playlistItems.list({ part: 'snippet', playlistId: playlistId, maxResults: 10 });
        return {
            type: 'playlist',
            ...playlist,
            items: playlistItemsResponse.data.items
        };
    } else if (videoIdMatch) {
        const videoId = videoIdMatch[1];
        const videoResponse = await youtube.videos.list({ part: 'snippet,statistics', id: videoId });
        if (!videoResponse.data.items || videoResponse.data.items.length === 0) {
            throw new ErrorResponse('YouTube video not found or is private.', 404);
        }
        return { type: 'video', ...videoResponse.data.items[0] };
    } else {
        throw new ErrorResponse('Invalid YouTube URL. Please provide a URL for a video or a playlist.', 400);
    }

  } catch (error) {
    console.error('YouTube API Error:', error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
    throw new ErrorResponse('Failed to fetch data from YouTube.', 500);
  }
};

// --- Main Controller --- //

// @desc    Get podcast details from a URL
// @route   POST /api/v1/podcast-details
// @access  Private
exports.getPodcastDetails = asyncHandler(async (req, res, next) => {
  // Get the podcast URL from the request body
  const { podcastUrl } = req.body;

  // Validate that podcastUrl exists and is a string
  if (!podcastUrl) {
    return next(new ErrorResponse('Please provide a podcast URL', 400));
  }

  if (typeof podcastUrl !== 'string') {
    return next(new ErrorResponse('Podcast URL must be a string', 400));
  }

  try {
    // Determine the URL type and process accordingly
    const urlType = getUrlType(podcastUrl);
    let data;

    switch (urlType) {
      case 'spotify':
        data = await handleSpotifyUrl(podcastUrl);
        break;
      case 'youtube':
        data = await handleYouTubeUrl(podcastUrl);
        break;
      case 'rss':
        data = await handleRssUrl(podcastUrl);
        break;
      default:
        return next(new ErrorResponse('Unsupported URL type', 400));
    }

    // Initialize podcast variable
    let podcast = null;
    
    // Try to save the podcast to the database if it doesn't exist
    try {
      // Check if podcast already exists in the database
      podcast = await Podcast.findOne({ url: podcastUrl });
      
      if (!podcast) {
        // Create a new podcast document with required fields
        const podcastData = {
          title: data.snippet?.title || 'Untitled',
          description: data.snippet?.description || 'No description available',
          // For non-RSS sources, we'll leave rssFeed empty
          rssFeed: urlType === 'rss' ? podcastUrl : undefined,
          url: podcastUrl,
          source: urlType,
          // Use the thumbnail as cover image
          coverImage: data.snippet?.thumbnails?.high?.url || '',
          // Default category for YouTube videos
          category: 'Other',
          // Explicit content flag
          explicit: false,
          // Additional metadata
          thumbnail: data.snippet?.thumbnails?.high?.url || '',
          duration: data.contentDetails?.duration || 0,
          publishedAt: data.snippet?.publishedAt || new Date(),
          statistics: data.statistics || {},
          user: req.user.id, // Associate with the current user
          // Add YouTube specific fields
          youTubeData: {
            videoId: data.id,
            channelTitle: data.snippet?.channelTitle,
            channelId: data.snippet?.channelId,
            defaultAudioLanguage: data.snippet?.defaultAudioLanguage,
            defaultLanguage: data.snippet?.defaultLanguage
          }
        };

        try {
          // Save to database
          podcast = await Podcast.create(podcastData);
          console.log('Podcast saved to database:', podcast._id);
        } catch (saveError) {
          console.error('Error saving podcast to database:', saveError);
          // If there's a duplicate key error, try to fetch the existing podcast
          if (saveError.code === 11000) {
            podcast = await Podcast.findOne({ url: podcastUrl });
          } else {
            console.error('Non-duplicate error saving podcast:', saveError);
            // Don't rethrow the error, continue with the existing data
          }
        }
      }
      
      // Add the database ID to the response if we have a podcast
      if (podcast && podcast._id) {
        data._id = podcast._id;
      }
      
    } catch (dbError) {
      console.error('Unexpected error in podcast save flow:', dbError);
      // Don't fail the request if saving to DB fails
      // Just log the error and continue
    }

    // Prepare response message based on whether we have a database ID
    const message = data._id 
      ? 'Podcast details retrieved and saved to your library' 
      : 'Podcast details retrieved (not saved to library)';
      
    res.status(200).json({ 
      success: true, 
      data,
      message
    });

  } catch (error) {
    console.error('API Error:', error);
    if (error instanceof ErrorResponse) {
      return next(error);
    }
    return next(new ErrorResponse('Failed to fetch podcast data', 500));
  }
});
