const express = require('express');
const { getPodcastDetails } = require('../controllers/podcastDetails');
const { protect } = require('../middleware/auth');

const router = express.Router();

// This route will now handle spotify, youtube, and rss urls
router.route('/').post(protect, getPodcastDetails);

module.exports = router;
