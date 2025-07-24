const faker = require('faker');
const Podcast = require('../models/Podcast');
const User = require('../models/User');

// Generate a random number within a range
const getRandomInt = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// Generate a random date within the last year
const getRandomDate = () => {
  const now = new Date();
  const pastDate = new Date(now);
  pastDate.setFullYear(pastDate.getFullYear() - 1);
  
  return new Date(
    pastDate.getTime() + Math.random() * (now.getTime() - pastDate.getTime())
  );
};

// Generate mock episodes
const generateEpisodes = (count = 10) => {
  const episodes = [];
  
  for (let i = 0; i < count; i++) {
    const downloads = getRandomInt(100, 10000);
    const completionRate = Math.random() * 0.5 + 0.3; // Between 0.3 and 0.8
    
    episodes.push({
      title: faker.lorem.words(getRandomInt(3, 7)),
      publishDate: getRandomDate(),
      duration: getRandomInt(15 * 60, 90 * 60), // 15-90 minutes in seconds
      downloads: {
        total: downloads,
        byPlatform: {
          spotify: Math.floor(downloads * 0.4),
          apple: Math.floor(downloads * 0.35),
          google: Math.floor(downloads * 0.15),
          other: downloads - Math.floor(downloads * 0.4) - Math.floor(downloads * 0.35) - Math.floor(downloads * 0.15)
        },
        daily: Array.from({ length: 30 }, (_, i) => ({
          date: new Date(Date.now() - (i * 24 * 60 * 60 * 1000)),
          count: getRandomInt(10, 500)
        }))
      },
      engagement: {
        completionRate: completionRate,
        averageListenDuration: Math.floor(completionRate * getRandomInt(15 * 60, 90 * 60)),
        dropOffPoints: [
          { timestamp: 60, percentage: 0.95 },
          { timestamp: 300, percentage: 0.8 },
          { timestamp: 600, percentage: 0.65 },
          { timestamp: 900, percentage: 0.5 },
          { timestamp: 1800, percentage: 0.3 }
        ]
      }
    });
  }
  
  return episodes;
};

// Generate mock chart rankings
const generateChartRankings = () => {
  const charts = [
    { name: 'Spotify Top Podcasts', category: 'All' },
    { name: 'Apple Podcasts Top Shows', category: 'All' },
    { name: 'Google Podcasts Top Shows', category: 'All' },
    { name: 'Spotify Top Technology', category: 'Technology' },
    { name: 'Apple Technology', category: 'Technology' }
  ];
  
  const countries = ['United States', 'United Kingdom', 'Canada', 'Australia', 'Germany'];
  const rankings = [];
  
  charts.forEach(chart => {
    countries.forEach(country => {
      const peakRank = getRandomInt(1, 50);
      const weeksOnChart = getRandomInt(1, 52);
      
      rankings.push({
        chart: chart.name,
        category: chart.category,
        country: country,
        rank: getRandomInt(peakRank, 100),
        date: getRandomDate(),
        peakRank: peakRank,
        weeksOnChart: weeksOnChart
      });
    });
  });
  
  return rankings;
};

// Generate a mock podcast
const generateMockPodcast = (userId) => {
  const totalDownloads = getRandomInt(1000, 1000000);
  const spotifyDownloads = Math.floor(totalDownloads * 0.4);
  const appleDownloads = Math.floor(totalDownloads * 0.35);
  const googleDownloads = Math.floor(totalDownloads * 0.15);
  const otherDownloads = totalDownloads - spotifyDownloads - appleDownloads - googleDownloads;
  
  return {
    user: userId,
    title: faker.lorem.words(getRandomInt(2, 5)),
    description: faker.lorem.paragraphs(getRandomInt(2, 5)),
    rssFeed: `https://example.com/feed/${faker.random.uuid()}`,
    website: `https://${faker.internet.domainName()}`,
    coverImage: `https://picsum.photos/800/800?random=${getRandomInt(1, 1000)}`,
    category: faker.random.arrayElement([
      'Technology', 'Business', 'Education', 'Health & Fitness', 'News', 'Entertainment'
    ]),
    explicit: faker.random.boolean(),
    totalDownloads: totalDownloads,
    platformStats: {
      spotify: {
        downloads: spotifyDownloads,
        subscribers: getRandomInt(100, 10000),
        rating: (Math.random() * 2 + 3).toFixed(1), // 3.0 - 5.0
        reviews: getRandomInt(5, 500)
      },
      apple: {
        downloads: appleDownloads,
        subscribers: getRandomInt(100, 10000),
        rating: (Math.random() * 2 + 3).toFixed(1), // 3.0 - 5.0
        reviews: getRandomInt(5, 500)
      },
      google: {
        downloads: googleDownloads,
        subscribers: getRandomInt(100, 10000),
        rating: (Math.random() * 2 + 3).toFixed(1), // 3.0 - 5.0
        reviews: getRandomInt(5, 500)
      }
    },
    episodes: generateEpisodes(getRandomInt(5, 50)),
    audience: {
      gender: {
        male: getRandomInt(40, 70),
        female: getRandomInt(25, 55),
        other: getRandomInt(1, 5)
      },
      ageRanges: {
        '13-17': getRandomInt(1, 10),
        '18-24': getRandomInt(15, 30),
        '25-34': getRandomInt(25, 50),
        '35-44': getRandomInt(15, 35),
        '45-54': getRandomInt(5, 20),
        '55-64': getRandomInt(1, 10),
        '65+': getRandomInt(0, 5)
      },
      countries: [
        { country: 'United States', percentage: 45, listeners: Math.floor(totalDownloads * 0.45) },
        { country: 'United Kingdom', percentage: 15, listeners: Math.floor(totalDownloads * 0.15) },
        { country: 'Canada', percentage: 10, listeners: Math.floor(totalDownloads * 0.1) },
        { country: 'Australia', percentage: 8, listeners: Math.floor(totalDownloads * 0.08) },
        { country: 'Germany', percentage: 7, listeners: Math.floor(totalDownloads * 0.07) },
        { country: 'Other', percentage: 15, listeners: Math.floor(totalDownloads * 0.15) }
      ],
      devices: {
        mobile: getRandomInt(50, 80),
        desktop: getRandomInt(15, 40),
        tablet: getRandomInt(5, 20),
        other: getRandomInt(0, 5)
      }
    },
    chartRankings: generateChartRankings(),
    engagementMetrics: {
      averageListenDuration: getRandomInt(10 * 60, 45 * 60), // 10-45 minutes in seconds
      completionRate: Math.random() * 0.5 + 0.3, // 0.3 - 0.8
      subscribers: {
        total: getRandomInt(100, 50000),
        weeklyChange: getRandomInt(-100, 500),
        monthlyChange: getRandomInt(-500, 2000)
      },
      socialMedia: {
        followers: {
          twitter: getRandomInt(100, 10000),
          instagram: getRandomInt(100, 10000),
          facebook: getRandomInt(100, 10000),
          youtube: getRandomInt(100, 10000)
        },
        engagement: {
          likes: getRandomInt(100, 10000),
          comments: getRandomInt(10, 1000),
          shares: getRandomInt(10, 5000),
          saves: getRandomInt(10, 2000)
        }
      },
      reviews: Array.from({ length: getRandomInt(5, 20) }, () => ({
        platform: faker.random.arrayElement(['Spotify', 'Apple Podcasts', 'Google Podcasts']),
        rating: getRandomInt(3, 5),
        review: faker.lorem.sentences(getRandomInt(1, 3)),
        date: getRandomDate(),
        author: faker.name.findName()
      }))
    },
    monetization: {
      monthlyRevenue: {
        amount: getRandomInt(100, 50000),
        currency: 'USD',
        change: (Math.random() * 0.5 - 0.25).toFixed(2) // -0.25 to 0.25
      },
      revenueSources: {
        ads: getRandomInt(0, 70),
        subscriptions: getRandomInt(0, 100),
        donations: getRandomInt(0, 30),
        sponsorships: getRandomInt(0, 80),
        merchandise: getRandomInt(0, 40),
        other: getRandomInt(0, 20)
      },
      cpm: {
        rate: getRandomInt(10, 50),
        currency: 'USD'
      },
      sponsors: Array.from({ length: getRandomInt(1, 5) }, () => ({
        name: faker.company.companyName(),
        startDate: getRandomDate(),
        endDate: new Date(new Date().getTime() + getRandomInt(30, 365) * 24 * 60 * 60 * 1000),
        amount: getRandomInt(500, 10000),
        currency: 'USD',
        status: faker.random.arrayElement(['active', 'pending', 'completed', 'cancelled'])
      }))
    },
    aiInsights: []
  };
};

// Generate mock data and save to database
const seedDatabase = async (userId, podcastCount = 3) => {
  try {
    // Generate podcasts
    const podcasts = [];
    for (let i = 0; i < podcastCount; i++) {
      podcasts.push(generateMockPodcast(userId));
    }
    
    // Save to database
    const createdPodcasts = await Podcast.insertMany(podcasts);
    console.log(`Successfully created ${createdPodcasts.length} mock podcasts`);
    
    return createdPodcasts;
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  }
};

module.exports = {
  generateMockPodcast,
  seedDatabase
};
