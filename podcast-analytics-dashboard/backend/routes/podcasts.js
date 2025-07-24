const express = require('express');
const {
  getPodcasts,
  getPodcast,
  createPodcast,
  updatePodcast,
  deletePodcast,
  getPodcastAnalytics,
  getPodcastRankings,
  getTestPodcastHistory,
  deletePodcastFromHistory
} = require('../controllers/podcasts');

const router = express.Router();

const { protect, authorize } = require('../middleware/auth');

// Re-route into other resource routers
// Example: router.use('/:podcastId/episodes', episodeRouter);

router
  .route('/')
  .get(protect, getPodcasts)
  .post(protect, authorize('user', 'admin'), createPodcast);

router
  .route('/:id')
  .get(protect, getPodcast)
  .put(protect, authorize('user', 'admin'), updatePodcast)
  .delete(protect, authorize('user', 'admin'), deletePodcast);

// Analytics routes
router
  .route('/:id/analytics')
  .get(protect, getPodcastAnalytics);

// Rankings routes
router
  .route('/:id/rankings')
  .get(protect, getPodcastRankings);

// Test podcast history routes
router
  .route('/test/history')
  .get(protect, getTestPodcastHistory);

router
  .route('/test/history/:id')
  .delete(protect, deletePodcastFromHistory);

module.exports = router;
