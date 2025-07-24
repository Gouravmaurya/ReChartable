const { GoogleGenerativeAI } = require('@google/generative-ai');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/asyncHandler');
const Podcast = require('../models/Podcast');

// Initialize Google Generative AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// @desc    Generate AI insights for a podcast
// @route   POST /api/v1/ai-insights/generate
// @access  Private
exports.generateInsights = asyncHandler(async (req, res, next) => {
  const { podcastId, insightType } = req.body;

  // Find the podcast
  const podcast = await Podcast.findById(podcastId);

  if (!podcast) {
    return next(new ErrorResponse(`Podcast not found with id of ${podcastId}`, 404));
  }

  // Check if user is authorized to access this podcast
  if (podcast.user.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to generate insights for this podcast`,
        401
      )
    );
  }

  // Prepare the prompt based on insight type
  let prompt = '';
  const podcastData = JSON.stringify({
    title: podcast.title,
    category: podcast.category,
    totalDownloads: podcast.totalDownloads,
    platformStats: podcast.platformStats,
    audience: podcast.audience,
    engagementMetrics: podcast.engagementMetrics,
    episodesCount: podcast.episodes.length,
    lastUpdated: podcast.lastUpdated
  }, null, 2);

  switch (insightType) {
    case 'growth':
      prompt = `Analyze the following podcast data and provide growth insights and recommendations. Focus on trends, opportunities for audience expansion, and strategies to increase listenership. Be specific and data-driven in your analysis.\n\nPodcast Data: ${podcastData}`;
      break;
    case 'content':
      prompt = `Analyze the following podcast data and provide content insights. Identify which topics or types of episodes perform best, suggest content improvements, and recommend new content ideas based on the audience demographics and engagement metrics.\n\nPodcast Data: ${podcastData}`;
      break;
    case 'audience':
      prompt = `Analyze the following podcast audience data and provide detailed insights. Identify key audience segments, their preferences, and opportunities to better engage with them. Suggest specific strategies to grow and retain the audience.\n\nAudience Data: ${JSON.stringify(podcast.audience, null, 2)}`;
      break;
    case 'monetization':
      prompt = `Analyze the following podcast monetization data and provide insights. Evaluate current revenue streams, suggest additional monetization opportunities, and provide recommendations to increase revenue while maintaining audience satisfaction.\n\nMonetization Data: ${JSON.stringify(podcast.monetization, null, 2)}`;
      break;
    default:
      prompt = `Provide a comprehensive analysis of the following podcast data, including key performance indicators, audience insights, and actionable recommendations for improvement.\n\nPodcast Data: ${podcastData}`;
  }

  try {
    // Get the generative model
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    // Generate content
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Create a new insight object
    const newInsight = {
      type: insightType || 'general',
      title: `${insightType ? insightType.charAt(0).toUpperCase() + insightType.slice(1) : 'General'} Insights - ${new Date().toLocaleDateString()}`,
      content: text,
      date: new Date(),
      priority: 'medium',
      isActioned: false
    };

    // Add the insight to the podcast
    podcast.aiInsights.unshift(newInsight);
    await podcast.save();

    res.status(200).json({
      success: true,
      data: newInsight
    });
  } catch (err) {
    console.error('Error generating AI insights:', err);
    return next(new ErrorResponse('Error generating AI insights', 500));
  }
});

// @desc    Get all AI insights for a podcast
// @route   GET /api/v1/ai-insights/:podcastId
// @access  Private
exports.getInsights = asyncHandler(async (req, res, next) => {
  const podcast = await Podcast.findById(req.params.podcastId);

  if (!podcast) {
    return next(
      new ErrorResponse(`Podcast not found with id of ${req.params.podcastId}`, 404)
    );
  }

  // Check if user is authorized to access this podcast
  if (podcast.user.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to access insights for this podcast`,
        401
      )
    );
  }

  // Sort insights by date (newest first)
  const insights = [...podcast.aiInsights].sort((a, b) => b.date - a.date);

  res.status(200).json({
    success: true,
    count: insights.length,
    data: insights
  });
});

// @desc    Update an AI insight
// @route   PUT /api/v1/ai-insights/:podcastId/:insightId
// @access  Private
exports.updateInsight = asyncHandler(async (req, res, next) => {
  const { podcastId, insightId } = req.params;
  const updates = req.body;

  const podcast = await Podcast.findById(podcastId);

  if (!podcast) {
    return next(new ErrorResponse(`Podcast not found with id of ${podcastId}`, 404));
  }

  // Check if user is authorized to update this podcast
  if (podcast.user.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to update insights for this podcast`,
        401
      )
    );
  }

  // Find the insight index
  const insightIndex = podcast.aiInsights.findIndex(
    insight => insight._id.toString() === insightId
  );

  if (insightIndex === -1) {
    return next(
      new ErrorResponse(`Insight not found with id of ${insightId}`, 404)
    );
  }

  // Update the insight
  podcast.aiInsights[insightIndex] = {
    ...podcast.aiInsights[insightIndex].toObject(),
    ...updates,
    _id: podcast.aiInsights[insightIndex]._id
  };

  await podcast.save();

  res.status(200).json({
    success: true,
    data: podcast.aiInsights[insightIndex]
  });
});

// @desc    Delete an AI insight
// @route   DELETE /api/v1/ai-insights/:podcastId/:insightId
// @access  Private
exports.deleteInsight = asyncHandler(async (req, res, next) => {
  const { podcastId, insightId } = req.params;

  const podcast = await Podcast.findById(podcastId);

  if (!podcast) {
    return next(new ErrorResponse(`Podcast not found with id of ${podcastId}`, 404));
  }

  // Check if user is authorized to update this podcast
  if (podcast.user.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to delete insights for this podcast`,
        401
      )
    );
  }

  // Find the insight index
  const insightIndex = podcast.aiInsights.findIndex(
    insight => insight._id.toString() === insightId
  );

  if (insightIndex === -1) {
    return next(
      new ErrorResponse(`Insight not found with id of ${insightId}`, 404)
    );
  }

  // Remove the insight
  podcast.aiInsights.splice(insightIndex, 1);
  await podcast.save();

  res.status(200).json({
    success: true,
    data: {}
  });
});
