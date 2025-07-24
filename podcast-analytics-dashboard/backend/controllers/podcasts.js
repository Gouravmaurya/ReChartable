const mongoose = require('mongoose');
const Podcast = require('../models/Podcast');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/asyncHandler');

// @desc    Get all podcasts
// @route   GET /api/v1/podcasts
// @access  Private
exports.getPodcasts = asyncHandler(async (req, res, next) => {
  res.status(200).json(res.advancedResults);
});

// @desc    Get single podcast
// @route   GET /api/v1/podcasts/:id
// @access  Private
exports.getPodcast = asyncHandler(async (req, res, next) => {
  const podcast = await Podcast.findById(req.params.id);

  if (!podcast) {
    return next(
      new ErrorResponse(`Podcast not found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure user is podcast owner or admin
  if (podcast.user.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to access this podcast`,
        401
      )
    );
  }

  res.status(200).json({
    success: true,
    data: podcast
  });
});

// @desc    Create new podcast
// @route   POST /api/v1/podcasts
// @access  Private
exports.createPodcast = asyncHandler(async (req, res, next) => {
  // Add user to req.body
  req.body.user = req.user.id;

  // Check if podcast with same source and sourceId already exists for this user
  if (req.body.source && req.body.sourceId) {
    const existingPodcast = await Podcast.findOne({
      user: req.user.id,
      source: req.body.source,
      sourceId: req.body.sourceId
    });

    if (existingPodcast) {
      return res.status(200).json({
        success: true,
        data: existingPodcast,
        message: 'Podcast already exists in your library'
      });
    }
  }

  // Map the incoming data to match our Podcast model
  const podcastData = {
    user: req.user.id,
    title: req.body.title || 'Untitled Podcast',
    description: req.body.description || 'No description provided',
    source: req.body.source || 'youtube',
    sourceId: req.body.sourceId || '',
    coverImage: req.body.thumbnail || 'no-photo.jpg',
    category: req.body.category || 'Other',
    explicit: req.body.explicit || false,
    // Analytics data
    totalDownloads: req.body.statistics?.viewCount ? parseInt(req.body.statistics.viewCount) : 0,
    platformStats: {
      [req.body.source || 'youtube']: {
        downloads: req.body.statistics?.viewCount ? parseInt(req.body.statistics.viewCount) : 0,
        subscribers: req.body.statistics?.subscriberCount ? parseInt(req.body.statistics.subscriberCount) : 0,
        rating: 0,
        reviews: req.body.statistics?.commentCount ? parseInt(req.body.statistics.commentCount) : 0
      }
    },
    // Add the raw statistics
    statistics: req.body.statistics || {},
    // Additional metadata
    publishedAt: req.body.publishedAt || new Date(),
    duration: req.body.duration || '00:00:00'
  };

  const podcast = await Podcast.create(podcastData);

  res.status(201).json({
    success: true,
    data: podcast
  });
});

// @desc    Update podcast
// @route   PUT /api/v1/podcasts/:id
// @access  Private
exports.updatePodcast = asyncHandler(async (req, res, next) => {
  let podcast = await Podcast.findById(req.params.id);

  if (!podcast) {
    return next(
      new ErrorResponse(`Podcast not found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure user is podcast owner or admin
  if (podcast.user.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to update this podcast`,
        401
      )
    );
  }

  podcast = await Podcast.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    data: podcast
  });
});

// @desc    Delete podcast
// @route   DELETE /api/v1/podcasts/:id
// @access  Private
exports.deletePodcast = asyncHandler(async (req, res, next) => {
  const podcast = await Podcast.findById(req.params.id);

  if (!podcast) {
    return next(
      new ErrorResponse(`Podcast not found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure user is podcast owner or admin
  if (podcast.user.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to delete this podcast`,
        401
      )
    );
  }

  await podcast.remove();

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Get podcast analytics
// @route   GET /api/v1/podcasts/:id/analytics
// @access  Private
exports.getPodcastAnalytics = asyncHandler(async (req, res, next) => {
  const podcast = await Podcast.findById(req.params.id);

  if (!podcast) {
    return next(
      new ErrorResponse(`Podcast not found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure user is podcast owner or admin
  if (podcast.user.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to access this podcast's analytics`,
        401
      )
    );
  }

  // In a real app, you would fetch and aggregate analytics data here
  // For now, we'll return a simplified analytics object
  const analytics = {
    totalDownloads: podcast.totalDownloads,
    platformStats: podcast.platformStats,
    audience: podcast.audience,
    engagement: {
      averageListenDuration: podcast.engagementMetrics.averageListenDuration,
      completionRate: podcast.engagementMetrics.completionRate,
      subscribers: podcast.engagementMetrics.subscribers
    },
    recentEpisodes: podcast.episodes
      .sort((a, b) => b.publishDate - a.publishDate)
      .slice(0, 5)
      .map(episode => ({
        title: episode.title,
        publishDate: episode.publishDate,
        downloads: episode.downloads.total,
        completionRate: episode.engagement?.completionRate || 0
      }))
  };

  res.status(200).json({
    success: true,
    data: analytics
  });
});

// @desc    Get podcast rankings
// @route   GET /api/v1/podcasts/:id/rankings
// @access  Private
exports.getPodcastRankings = asyncHandler(async (req, res, next) => {
  const podcast = await Podcast.findById(req.params.id);

  if (!podcast) {
    return next(
      new ErrorResponse(`Podcast not found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure user is podcast owner or admin
  if (podcast.user.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to access this podcast's rankings`,
        401
      )
    );
  }

  // In a real app, you would fetch ranking data from the appropriate API
  // For now, we'll return the stored chart rankings
  res.status(200).json({
    success: true,
    data: podcast.chartRankings
  });
});

// @desc    Delete podcast from test history
// @route   DELETE /api/v1/podcasts/test/history/:id
// @access  Private
exports.deletePodcastFromHistory = asyncHandler(async (req, res, next) => {
  try {
    // Check if ID is provided and valid
    if (!req.params.id || req.params.id === 'undefined') {
      return next(
        new ErrorResponse('Podcast ID is required', 400)
      );
    }

    // Check if ID is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return next(
        new ErrorResponse(`Invalid podcast ID format: ${req.params.id}`, 400)
      );
    }

    const podcast = await Podcast.findById(req.params.id);

    if (!podcast) {
      return next(
        new ErrorResponse(`Podcast not found with id of ${req.params.id}`, 404)
      );
    }

    // Make sure user is podcast owner or admin
    if (podcast.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(
        new ErrorResponse(
          `User ${req.user.id} is not authorized to delete this podcast`,
          401
        )
      );
    }

    // Use deleteOne() method to delete the document
    await Podcast.deleteOne({ _id: req.params.id });

    res.status(200).json({
      success: true,
      data: {},
      message: 'Podcast removed from history successfully'
    });
  } catch (error) {
    console.error('Error deleting podcast from history:', error);
    return next(new ErrorResponse('Failed to delete podcast from history', 500));
  }
});

// @desc    Get test podcast history data
// @route   GET /api/v1/podcasts/test/history
// @access  Private
exports.getTestPodcastHistory = asyncHandler(async (req, res, next) => {
  try {
    // For test data, we'll return a subset of the user's podcasts
    // with some additional test data for the history view
    const podcasts = await Podcast.find({ user: req.user.id })
      .sort({ createdAt: -1 }) // Most recent first
      .limit(10) // Limit to 10 most recent
      .lean(); // Convert to plain JavaScript object

    // Add some test data if the user doesn't have any podcasts yet
    if (podcasts.length === 0) {
      const testPodcasts = [
        {
          _id: 'test1',
          title: 'Test Podcast 1',
          description: 'This is a test podcast',
          source: 'youtube',
          thumbnail: 'https://via.placeholder.com/150',
          createdAt: new Date(),
          updatedAt: new Date(),
          totalPlays: Math.floor(Math.random() * 1000) + 100,
          duration: '1:23:45',
        },
        {
          _id: 'test2',
          title: 'Test Podcast 2',
          description: 'Another test podcast',
          source: 'spotify',
          thumbnail: 'https://via.placeholder.com/150',
          createdAt: new Date(Date.now() - 86400000), // Yesterday
          updatedAt: new Date(),
          totalPlays: Math.floor(Math.random() * 1000) + 100,
          duration: '45:30',
        },
      ];
      return res.status(200).json({
        success: true,
        data: testPodcasts,
        message: 'Using test data - no podcasts found for this user',
      });
    }

    // Format the podcast data for the history view
    const formattedPodcasts = podcasts.map(podcast => ({
      _id: podcast._id,
      title: podcast.title,
      description: podcast.description,
      source: podcast.source,
      thumbnail: podcast.coverImage || 'https://via.placeholder.com/150',
      createdAt: podcast.createdAt,
      updatedAt: podcast.updatedAt,
      totalPlays: podcast.totalDownloads || 0,
      duration: podcast.duration || '1:00:00',
    }));

    res.status(200).json({
      success: true,
      data: formattedPodcasts,
    });
  } catch (error) {
    console.error('Error fetching test podcast history:', error);
    return next(new ErrorResponse('Failed to fetch podcast history', 500));
  }
});
