const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/asyncHandler');
const Podcast = require('../models/Podcast');

// @desc    Get audience insights for a podcast
// @route   GET /api/v1/audience/:podcastId
// @access  Private
exports.getAudienceInsights = asyncHandler(async (req, res, next) => {
  const podcast = await Podcast.findById(req.params.podcastId);

  if (!podcast) {
    return next(
      new ErrorResponse(`Podcast not found with id of ${req.params.podcastId}`, 404)
    );
  }

  // Make sure user is podcast owner or admin
  if (podcast.user.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to access this podcast's audience data`,
        401
      )
    );
  }

  // In a real app, you would fetch this data from your analytics service
  // For now, we'll return mock data or data from the podcast document
  const audienceData = {
    // Basic metrics
    totalListeners: podcast.audience?.totalListeners || 0,
    totalSubscribers: podcast.engagementMetrics?.subscribers?.total || 0,
    newSubscribers: podcast.engagementMetrics?.subscribers?.weeklyChange || 0,
    
    // Demographics
    gender: podcast.audience?.gender || {
      male: 55,
      female: 42,
      other: 3
    },
    
    ageRanges: podcast.audience?.ageRanges || {
      '13-17': 5,
      '18-24': 22,
      '25-34': 35,
      '35-44': 25,
      '45-54': 10,
      '55-64': 2,
      '65+': 1
    },
    
    // Geographic distribution (top 5 countries)
    topCountries: podcast.audience?.countries || [
      { country: 'United States', percentage: 45, listeners: 4500 },
      { country: 'United Kingdom', percentage: 15, listeners: 1500 },
      { country: 'Canada', percentage: 10, listeners: 1000 },
      { country: 'Australia', percentage: 8, listeners: 800 },
      { country: 'Germany', percentage: 7, listeners: 700 }
    ],
    
    // Device usage
    devices: podcast.audience?.devices || {
      mobile: 65,
      desktop: 25,
      tablet: 8,
      other: 2
    },
    
    // Listening behavior
    listeningBehavior: {
      averageSessionDuration: podcast.engagementMetrics?.averageListenDuration || 1200, // in seconds
      completionRate: podcast.engagementMetrics?.completionRate || 0.65, // 65%
      peakListeningTimes: [
        { hour: 8, percentage: 15 },
        { hour: 12, percentage: 25 },
        { hour: 18, percentage: 35 },
        { hour: 22, percentage: 25 }
      ]
    },
    
    // Episode performance (top 5 episodes)
    topEpisodes: podcast.episodes
      .sort((a, b) => b.downloads.total - a.downloads.total)
      .slice(0, 5)
      .map(episode => ({
        title: episode.title,
        publishDate: episode.publishDate,
        downloads: episode.downloads.total,
        completionRate: episode.engagement?.completionRate || 0,
        averageListenDuration: episode.engagement?.averageListenDuration || 0
      })),
    
    // Platform distribution
    platformDistribution: {
      spotify: podcast.platformStats?.spotify?.downloads || 0,
      apple: podcast.platformStats?.apple?.downloads || 0,
      google: podcast.platformStats?.google?.downloads || 0,
      other: podcast.totalDownloads - 
        (podcast.platformStats?.spotify?.downloads || 0) - 
        (podcast.platformStats?.apple?.downloads || 0) - 
        (podcast.platformStats?.google?.downloads || 0)
    },
    
    // Trends (last 7 days)
    trends: {
      labels: Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }),
      data: Array.from({ length: 7 }, () => Math.floor(Math.random() * 1000) + 500)
    }
  };

  res.status(200).json({
    success: true,
    data: audienceData
  });
});

// @desc    Update audience data (for testing/development)
// @route   PUT /api/v1/audience/:podcastId
// @access  Private
exports.updateAudienceData = asyncHandler(async (req, res, next) => {
  const podcast = await Podcast.findById(req.params.podcastId);

  if (!podcast) {
    return next(
      new ErrorResponse(`Podcast not found with id of ${req.params.podcastId}`, 404)
    );
  }

  // Make sure user is podcast owner or admin
  if (podcast.user.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to update this podcast's audience data`,
        401
      )
    );
  }

  // Update audience data
  podcast.audience = {
    ...podcast.audience,
    ...req.body
  };

  await podcast.save();

  res.status(200).json({
    success: true,
    data: podcast.audience
  });
});
