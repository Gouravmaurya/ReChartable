const mongoose = require('mongoose');

const PodcastSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: [true, 'Please add a podcast title'],
    trim: true,
    maxlength: [100, 'Title cannot be more than 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Please add a description']
  },
  rssFeed: {
    type: String,
    required: function() { return this.source === 'rss'; },
    validate: {
      validator: function(v) {
        // Only validate URL format if rssFeed is provided
        if (!v) return true;
        return /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/.test(v);
      },
      message: props => `${props.value} is not a valid URL!`
    }
  },
  source: {
    type: String,
    required: true,
    enum: ['rss', 'youtube', 'spotify'],
    default: 'rss'
  },
  website: {
    type: String,
    match: [
      /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/,
      'Please use a valid URL with HTTP or HTTPS'
    ]
  },
  coverImage: {
    type: String,
    default: 'no-photo.jpg'
  },
  category: {
    type: String,
    required: [true, 'Please add a category'],
    enum: [
      'Arts', 'Business', 'Comedy', 'Education', 'Fiction', 'Government', 'History', 'Health & Fitness', 
      'Kids & Family', 'Leisure', 'Music', 'News', 'Religion & Spirituality', 'Science', 'Society & Culture',
      'Sports', 'Technology', 'True Crime', 'TV & Film', 'Other'
    ]
  },
  explicit: {
    type: Boolean,
    default: false
  },
  // Analytics data
  totalDownloads: {
    type: Number,
    default: 0
  },
  platformStats: {
    spotify: {
      downloads: { type: Number, default: 0 },
      subscribers: { type: Number, default: 0 },
      rating: { type: Number, default: 0 },
      reviews: { type: Number, default: 0 }
    },
    apple: {
      downloads: { type: Number, default: 0 },
      subscribers: { type: Number, default: 0 },
      rating: { type: Number, default: 0 },
      reviews: { type: Number, default: 0 }
    },
    google: {
      downloads: { type: Number, default: 0 },
      subscribers: { type: Number, default: 0 },
      rating: { type: Number, default: 0 },
      reviews: { type: Number, default: 0 }
    }
  },
  // Episode analytics
  episodes: [{
    title: String,
    publishDate: Date,
    duration: Number, // in seconds
    downloads: {
      total: { type: Number, default: 0 },
      byPlatform: {
        spotify: { type: Number, default: 0 },
        apple: { type: Number, default: 0 },
        google: { type: Number, default: 0 },
        other: { type: Number, default: 0 }
      },
      daily: [{
        date: Date,
        count: { type: Number, default: 0 }
      }]
    },
    engagement: {
      completionRate: Number, // percentage
      averageListenDuration: Number, // in seconds
      dropOffPoints: [{
        timestamp: Number, // in seconds
        percentage: Number // percentage of listeners who dropped off
      }]
    }
  }],
  // Audience demographics
  audience: {
    gender: {
      male: { type: Number, default: 0 },
      female: { type: Number, default: 0 },
      other: { type: Number, default: 0 }
    },
    ageRanges: {
      '13-17': { type: Number, default: 0 },
      '18-24': { type: Number, default: 0 },
      '25-34': { type: Number, default: 0 },
      '35-44': { type: Number, default: 0 },
      '45-54': { type: Number, default: 0 },
      '55-64': { type: Number, default: 0 },
      '65+': { type: Number, default: 0 }
    },
    countries: [{
      country: String,
      percentage: Number,
      listeners: Number
    }],
    devices: {
      mobile: { type: Number, default: 0 },
      desktop: { type: Number, default: 0 },
      tablet: { type: Number, default: 0 },
      other: { type: Number, default: 0 }
    }
  },
  // Chart rankings
  chartRankings: [{
    chart: String, // e.g., "Spotify Top Podcasts", "Apple Podcasts Top Shows"
    category: String,
    country: String,
    rank: Number,
    date: Date,
    peakRank: Number,
    weeksOnChart: Number
  }],
  // Engagement metrics
  engagementMetrics: {
    averageListenDuration: Number, // in seconds
    completionRate: Number, // percentage
    subscribers: {
      total: { type: Number, default: 0 },
      weeklyChange: { type: Number, default: 0 },
      monthlyChange: { type: Number, default: 0 }
    },
    socialMedia: {
      followers: {
        twitter: { type: Number, default: 0 },
        instagram: { type: Number, default: 0 },
        facebook: { type: Number, default: 0 },
        youtube: { type: Number, default: 0 }
      },
      engagement: {
        likes: { type: Number, default: 0 },
        comments: { type: Number, default: 0 },
        shares: { type: Number, default: 0 },
        saves: { type: Number, default: 0 }
      }
    },
    reviews: [{
      platform: String,
      rating: Number,
      review: String,
      date: Date,
      author: String
    }]
  },
  // Monetization data
  monetization: {
    monthlyRevenue: {
      amount: { type: Number, default: 0 },
      currency: { type: String, default: 'USD' },
      change: { type: Number, default: 0 } // percentage change from previous period
    },
    revenueSources: {
      ads: { type: Number, default: 0 },
      subscriptions: { type: Number, default: 0 },
      donations: { type: Number, default: 0 },
      sponsorships: { type: Number, default: 0 },
      merchandise: { type: Number, default: 0 },
      other: { type: Number, default: 0 }
    },
    cpm: { // Cost Per Mille (revenue per 1000 downloads)
      rate: { type: Number, default: 0 },
      currency: { type: String, default: 'USD' }
    },
    sponsors: [{
      name: String,
      startDate: Date,
      endDate: Date,
      amount: Number,
      currency: { type: String, default: 'USD' },
      status: { type: String, enum: ['active', 'pending', 'completed', 'cancelled'], default: 'active' }
    }]
  },
  // AI-generated insights
  aiInsights: [{
    type: {
      type: String,
      enum: ['growth', 'content', 'audience', 'monetization', 'general'],
      required: true
    },
    title: String,
    content: String,
    date: {
      type: Date,
      default: Date.now
    },
    metrics: [{
      name: String,
      value: mongoose.Schema.Types.Mixed,
      change: Number,
      unit: String
    }],
    recommendations: [String],
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    },
    isActioned: {
      type: Boolean,
      default: false
    },
    actionItems: [{
      description: String,
      isCompleted: Boolean,
      dueDate: Date
    }]
  }],
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

// Update lastUpdated timestamp before saving
PodcastSchema.pre('save', function(next) {
  this.lastUpdated = Date.now();
  next();
});

// Create a compound index for faster querying
PodcastSchema.index({ user: 1, title: 1 });

// Static method to get total downloads
PodcastSchema.statics.getTotalDownloads = async function(userId) {
  const obj = await this.aggregate([
    {
      $match: { user: userId }
    },
    {
      $group: {
        _id: '$user',
        totalDownloads: { $sum: '$totalDownloads' }
      }
    }
  ]);

  try {
    await this.model('User').findByIdAndUpdate(userId, {
      totalDownloads: obj[0] ? obj[0].totalDownloads : 0
    });
  } catch (err) {
    console.error(err);
  }
};

// Call getTotalDownloads after save
PodcastSchema.post('save', function() {
  this.constructor.getTotalDownloads(this.user);
});

// Call getTotalDownloads after remove
PodcastSchema.post('remove', function() {
  this.constructor.getTotalDownloads(this.user);
});

module.exports = mongoose.model('Podcast', PodcastSchema);
