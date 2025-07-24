const express = require('express');
const {
  getAudienceInsights,
  updateAudienceData
} = require('../controllers/audience');

const router = express.Router();

const { protect } = require('../middleware/auth');

// Routes for audience data
router
  .route('/:podcastId')
  .get(protect, getAudienceInsights)
  .put(protect, updateAudienceData);

module.exports = router;
