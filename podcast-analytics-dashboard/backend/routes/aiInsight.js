const express = require('express');
const {
  generateInsights,
  getInsights,
  updateInsight,
  deleteInsight
} = require('../controllers/aiInsights');

const router = express.Router();

const { protect } = require('../middleware/auth');

// Generate new AI insights
router.post('/generate', protect, generateInsights);

// Get all insights for a podcast
router.get('/:podcastId', protect, getInsights);

// Update an insight
router.put('/:podcastId/:insightId', protect, updateInsight);

// Delete an insight
router.delete('/:podcastId/:insightId', protect, deleteInsight);

module.exports = router;
