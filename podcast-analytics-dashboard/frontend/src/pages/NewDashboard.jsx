// NewDashboard.jsx
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { podcastAPI } from '../utils/api';
import { generateSummary, getRelatedVideos } from '../utils/gemini';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { FiEye, FiThumbsUp, FiMessageSquare, FiTrendingUp, FiSmartphone, FiMonitor, FiTablet, FiGlobe, FiLayers, FiBarChart2, FiUsers, FiFileText, FiLoader } from 'react-icons/fi'; // Added icons for stat cards and audience sections

// Tab component with modern design
const Tab = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50 ${
      active
        ? 'bg-gray-800/80 text-white shadow-md border-2 border-gray-600 transform -translate-y-0.5'
        : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
    }`}
  >
    <div className="flex items-center gap-2">
      {children}
    </div>
  </button>
);

// Custom tooltip for charts
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-800/90 p-3 border border-gray-700/50 rounded shadow-lg text-gray-200">
        <p className="font-semibold text-white mb-1">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color }}>
            <span className="font-medium">{entry.name}:</span> <span className="font-bold">{entry.value}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Color palette for charts (monochromatic silver/gray tones)
const COLORS = ['#A8A8A8', '#808080', '#606060', '#404040', '#C0C0C0', '#999999', '#707070', '#505050', '#B0B0B0', '#D0D0D0'];

// Format numbers for display
const formatNumber = (num) => {
  const number = typeof num === 'string' ? parseInt(num, 10) : num;
  if (isNaN(number)) return '0';

  if (number >= 1000000) {
    return (number / 1000000).toFixed(1) + 'M';
  }
  if (number >= 1000) {
    return (number / 1000).toFixed(1) + 'K';
  }
  return number.toString();
};

// Format YouTube duration (ISO 8601 format)
const formatDuration = (duration) => {
  if (!duration) return 'N/A';

  const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  if (!match) return duration;

  const hours = parseInt(match[1]) || 0;
  const minutes = parseInt(match[2]) || 0;
  const seconds = parseInt(match[3]) || 0;

  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 || hours > 0) parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);

  return parts.join(' ');
};

const Dashboard = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('overview');
  const [podcastId, setPodcastId] = useState(searchParams.get('podcastId') || '');
  const [podcastData, setPodcastData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState('');
  const [relatedVideos, setRelatedVideos] = useState([]);
  const [generatingSummary, setGeneratingSummary] = useState(false);

  // Tab configuration
  const tabs = [
    { id: 'overview', label: 'Overview', icon: <FiEye /> },
    { id: 'analytics', label: 'Analytics', icon: <FiBarChart2 /> },
    { id: 'engagement', label: 'Engagement', icon: <FiTrendingUp /> },
    { id: 'audience', label: 'Audience', icon: <FiUsers /> },
    { id: 'summary', label: 'Summary', icon: <FiFileText /> }
  ];

  // Prepare analytics data from podcast statistics
  const prepareAnalyticsData = () => {
    if (!podcastData?.statistics) return null;

    const { viewCount, likeCount, commentCount, favoriteCount } = podcastData.statistics;
    const views = parseInt(viewCount) || 0;
    const likes = parseInt(likeCount) || 0;
    const comments = parseInt(commentCount) || 0;
    const favorites = parseInt(favoriteCount) || 0;

    // Calculate engagement rate (likes + comments / views)
    const engagementRate = views > 0
      ? ((likes + comments) / views * 100).toFixed(2)
      : 0;

    // Generate time series data (last 7 days)
    const timeSeriesData = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
      // Simulate daily views based on total views (for demo)
      const dailyViews = Math.round(views / 7 * (0.8 + Math.random() * 0.4));

      return {
        date: dayName,
        views: dailyViews,
        likes: Math.round(likes / 7 * (0.7 + Math.random() * 0.6)),
        comments: Math.round(comments / 7 * (0.5 + Math.random()))
      };
    });

    return {
      timeSeriesData,
      engagementData: [
        { name: 'Likes', value: likes },
        { name: 'Comments', value: comments },
        { name: 'Favorites', value: favorites }
      ],
      engagementRate,
      totalViews: views,
      totalLikes: likes,
      totalComments: comments
    };
  };

  const analyticsData = prepareAnalyticsData();
  const chartData = analyticsData || {
    timeSeriesData: [],
    engagementData: [],
    engagementRate: 0,
    totalViews: 0,
    totalLikes: 0,
    totalComments: 0
  };

  // Device distribution (estimated based on view count)
  const deviceData = [
    { name: 'Mobile', value: Math.round((podcastData?.statistics?.viewCount || 0) * 0.6) },
    { name: 'Desktop', value: Math.round((podcastData?.statistics?.viewCount || 0) * 0.3) },
    { name: 'Tablet', value: Math.round((podcastData?.statistics?.viewCount || 0) * 0.1) },
  ];

  // Platform distribution (estimated)
  const platformData = [
    { name: 'iOS', value: Math.round((podcastData?.statistics?.viewCount || 0) * 0.4) },
    { name: 'Android', value: Math.round((podcastData?.statistics?.viewCount || 0) * 0.35) },
    { name: 'Web', value: Math.round((podcastData?.statistics?.viewCount || 0) * 0.2) },
    { name: 'Other', value: Math.round((podcastData?.statistics?.viewCount || 0) * 0.05) },
  ];

  // Fetch podcast data by ID
  const fetchPodcastData = async (id) => {
    if (!id) return;

    try {
      setLoading(true);
      setError('');
      const response = await podcastAPI.getPodcastDetails(id);

      if (response.data) {
        setPodcastData(response.data);
        setPodcastId(id); // Update the local state with the ID
        // Update the URL without causing a navigation
        const newSearchParams = new URLSearchParams(searchParams);
        newSearchParams.set('podcastId', id);
        setSearchParams(newSearchParams, { replace: true });
        toast.success('Podcast data loaded successfully!');
      } else {
        throw new Error('No data returned from the server');
      }
    } catch (error) {
      console.error('Error fetching podcast data:', error);
      setError(error.response?.data?.message || 'Failed to fetch podcast data');
      toast.error('Failed to load podcast data');
    } finally {
      setLoading(false);
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!podcastId) return;
    
    // Extract just the ID if a full URL was pasted
    const extractedId = extractPodcastId(podcastId);
    if (!extractedId) {
      setError('Invalid podcast ID or URL');
      return;
    }
    
    await fetchPodcastData(extractedId);
  };
  
  // Extract podcast ID from URL or return the ID directly
  const extractPodcastId = (input) => {
    // If it's just an ID (alphanumeric with possible dashes/underscores)
    if (/^[\w-]{11,}$/.test(input)) {
      return input;
    }
    
    // Try to extract from YouTube URL
    const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([\w-]{11})/i;
    const match = input.match(youtubeRegex);
    return match ? match[1] : null;
  };
  
  // Load podcast data when component mounts or podcastId in URL changes
  useEffect(() => {
    const idFromUrl = searchParams.get('podcastId');
    if (idFromUrl && idFromUrl !== podcastId) {
      fetchPodcastData(idFromUrl);
    }
  }, [searchParams]);

  // Handle summary generation
  const handleGenerateSummary = async () => {
    if (!podcastData) return;

    try {
      setGeneratingSummary(true);
      const generatedSummary = await generateSummary(
        podcastData.snippet?.title || 'This content',
        podcastData.snippet?.description || '',
        ''
      );
      setSummary(generatedSummary);
    } catch (error) {
      console.error('Error generating summary:', error);
      toast.error('Failed to generate summary. Please try again.');
    } finally {
      setGeneratingSummary(false);
    }
  };

  // Load related videos when podcast data changes
  useEffect(() => {
    const loadRelatedVideos = async () => {
      if (!podcastData) return;

      try {
        const videos = await getRelatedVideos(
          podcastData.snippet?.title || '',
          podcastData.snippet?.channelTitle || '',
          podcastData.snippet?.description || ''
        );
        setRelatedVideos(Array.isArray(videos) ? videos : []);
      } catch (error) {
        console.error('Error getting related videos:', error);
        setRelatedVideos([]);
      }
    };

    loadRelatedVideos();
  }, [podcastData]);

  // Enhanced StatCard component with modern design
  const StatCard = ({ title, value, icon, trend, trendValue, className = '' }) => (
    <div className={`relative overflow-hidden group bg-gray-900/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-700/50 hover:shadow-2xl transition-all duration-300 ${className}`}>
      {/* Subtle gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-700/5 to-gray-800/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"></div>

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-sm font-medium text-white/70">{title}</p>
            <p className="text-3xl font-bold bg-gradient-to-r from-gray-300 to-gray-500 bg-clip-text text-transparent">
              {formatNumber(value)}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-gray-800/70 backdrop-blur-sm border border-gray-700/50 shadow-inner text-gray-400">
            {icon}
          </div>
        </div>
        {trend && (
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
            trend === 'up'
              ? 'bg-green-900/30 text-green-400'
              : 'bg-red-900/30 text-red-400'
          }`}>
            {trend === 'up' ? (
              <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            )}
            {trendValue}
          </div>
        )}
      </div>
    </div>
  );

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Render tab content with enhanced UI
  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-8">
            {/* Podcast Details Card */}
            {podcastData ? (
              <div className="bg-gray-900/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-gray-700/50">
                <div className="flex flex-col md:flex-row gap-8 items-start">
                  {/* Thumbnail */}
                  <div className="flex-shrink-0 w-full md:w-1/3 lg:w-1/4">
                    <img
                      src={podcastData.snippet?.thumbnails?.high?.url || 'https://via.placeholder.com/300x200?text=No+Thumbnail'}
                      alt={podcastData.snippet?.title || 'Podcast Thumbnail'}
                      className="w-full h-auto rounded-xl shadow-lg border border-gray-700/50"
                    />
                  </div>

                  {/* Podcast Info */}
                  <div className="flex-1">
                    <h2 className="text-3xl font-bold text-white mb-3 leading-tight">
                      {podcastData.snippet?.title || 'Untitled Podcast'}
                    </h2>

                    <p className="text-gray-300 text-base mb-5 line-clamp-4">
                      {podcastData.snippet?.description || 'No description available for this podcast.'}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm mb-6">
                      <div>
                        <p className="font-medium text-gray-400">Channel</p>
                        <p className="text-white font-semibold">
                          {podcastData.snippet?.channelTitle || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="font-medium text-gray-400">Published Date</p>
                        <p className="text-white font-semibold">
                          {formatDate(podcastData.snippet?.publishedAt)}
                        </p>
                      </div>
                      {podcastData.contentDetails?.duration && (
                        <div>
                          <p className="font-medium text-gray-400">Duration</p>
                          <p className="text-white font-semibold">
                            {formatDuration(podcastData.contentDetails.duration)}
                          </p>
                        </div>
                      )}
                      {podcastData.snippet?.tags?.length > 0 && (
                        <div className="col-span-full">
                          <p className="font-medium text-gray-400 mb-2">Tags</p>
                          <div className="flex flex-wrap gap-2">
                            {podcastData.snippet.tags.slice(0, 5).map((tag, index) => (
                              <span
                                key={index}
                                className="px-3 py-1 rounded-full text-xs font-medium bg-gray-700 text-gray-300 border border-gray-600"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gray-900/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-gray-700/50 text-center text-gray-400">
                <p className="text-lg">Enter a YouTube Podcast ID or URL to see details and analytics.</p>
                <p className="mt-2 text-sm">Example: <code className="bg-gray-800 px-2 py-1 rounded">dQw4w9WgXcQ</code> or <code className="bg-gray-800 px-2 py-1 rounded">https://www.youtube.com/watch?v=dQw4w9WgXcQ</code></p>
              </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title="Total Views"
                value={podcastData?.statistics?.viewCount || '0'}
                icon={<FiEye size={24} />}
                trend="up"
                trendValue="12.5%"
              />
              <StatCard
                title="Total Likes"
                value={podcastData?.statistics?.likeCount || '0'}
                icon={<FiThumbsUp size={24} />}
                trend="down"
                trendValue="5.2%"
              />
              <StatCard
                title="Total Comments"
                value={podcastData?.statistics?.commentCount || '0'}
                icon={<FiMessageSquare size={24} />}
                trend="up"
                trendValue="8.1%"
              />
              <StatCard
                title="Engagement Rate"
                value={`${analyticsData?.engagementRate || '0'}%`}
                icon={<FiTrendingUp size={24} />}
                trend="down"
                trendValue="2.5%"
              />
            </div>
          </div>
        );
      case 'analytics':
        return (
          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title="Total Views"
                value={podcastData?.statistics?.viewCount || '0'}
                icon={<FiEye size={24} />}
              />
              <StatCard
                title="Total Likes"
                value={podcastData?.statistics?.likeCount || '0'}
                icon={<FiThumbsUp size={24} />}
              />
              <StatCard
                title="Total Comments"
                value={podcastData?.statistics?.commentCount || '0'}
                icon={<FiMessageSquare size={24} />}
              />
              <StatCard
                title="Engagement Rate"
                value={`${analyticsData?.engagementRate || '0'}%`}
                icon={<FiTrendingUp size={24} />}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-gray-900/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-700/50">
                <h3 className="text-xl font-semibold text-white mb-4">Views Over Time</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData.timeSeriesData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#4a4a4a" />
                    <XAxis dataKey="date" stroke="#9a9a9a" tickLine={false} />
                    <YAxis stroke="#9a9a9a" tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ paddingTop: '10px', color: '#ccc' }} />
                    <Line type="monotone" dataKey="views" stroke="#A8A8A8" strokeWidth={2} dot={{ r: 4, fill: '#A8A8A8' }} activeDot={{ r: 6, fill: '#E0E0E0', stroke: '#A8A8A8', strokeWidth: 2 }} name="Views" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-gray-900/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-700/50">
                <h3 className="text-xl font-semibold text-white mb-4">Engagement Metrics</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData.engagementData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#4a4a4a" />
                    <XAxis dataKey="name" stroke="#9a9a9a" tickLine={false} />
                    <YAxis stroke="#9a9a9a" tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ paddingTop: '10px', color: '#ccc' }} />
                    <Bar dataKey="value" name="Count">
                      {chartData.engagementData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        );
      case 'engagement':
        return (
          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="bg-gray-900/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-700/50 flex flex-col items-center justify-center">
                <h3 className="text-xl font-semibold text-white mb-4">Audience Engagement Distribution</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={chartData.engagementData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {chartData.engagementData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ paddingTop: '10px', color: '#ccc' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-gray-900/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-700/50">
                <h3 className="text-xl font-semibold text-white mb-4">Top Comments/Feedback (Mock Data)</h3>
                <ul className="space-y-3 text-gray-300">
                  <li className="p-3 bg-gray-800 rounded-lg border border-gray-700 hover:bg-gray-700/50 transition-colors">"Loved the insights on audience growth!" <span className="text-gray-500 text-sm font-light">- User123</span></li>
                  <li className="p-3 bg-gray-800 rounded-lg border border-gray-700 hover:bg-gray-700/50 transition-colors">"The analytics breakdown is super helpful." <span className="text-gray-500 text-sm font-light">- PodFanatic</span></li>
                  <li className="p-3 bg-gray-800 rounded-lg border border-gray-700 hover:bg-gray-700/50 transition-colors">"Great points on content strategy." <span className="text-gray-500 text-sm font-light">- CreatorX</span></li>
                  <li className="p-3 bg-gray-800 rounded-lg border border-gray-700 hover:bg-gray-700/50 transition-colors">"Looking forward to more deep dives like this one." <span className="text-gray-500 text-sm font-light">- ListenerPro</span></li>
                </ul>
              </div>
            </div>
          </div>
        );
      case 'audience':
        return (
          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="bg-gray-900/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-700/50 flex flex-col items-center justify-center">
                <h3 className="text-xl font-semibold text-white mb-4">Device Distribution</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={deviceData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {deviceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ paddingTop: '10px', color: '#ccc' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-gray-900/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-700/50 flex flex-col items-center justify-center">
                <h3 className="text-xl font-semibold text-white mb-4">Platform Distribution</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={platformData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {platformData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ paddingTop: '10px', color: '#ccc' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="bg-gray-900/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-700/50">
              <h3 className="text-xl font-semibold text-white mb-4">Geographic Distribution (Mock Data)</h3>
              <ul className="space-y-3 text-gray-300">
                <li className="p-3 bg-gray-800 rounded-lg border border-gray-700 flex items-center justify-between hover:bg-gray-700/50 transition-colors">
                  <span><FiGlobe className="inline-block mr-2 text-gray-500" />United States</span>
                  <span className="font-semibold text-white">45%</span>
                </li>
                <li className="p-3 bg-gray-800 rounded-lg border border-gray-700 flex items-center justify-between hover:bg-gray-700/50 transition-colors">
                  <span><FiGlobe className="inline-block mr-2 text-gray-500" />Canada</span>
                  <span className="font-semibold text-white">15%</span>
                </li>
                <li className="p-3 bg-gray-800 rounded-lg border border-gray-700 flex items-center justify-between hover:bg-gray-700/50 transition-colors">
                  <span><FiGlobe className="inline-block mr-2 text-gray-500" />United Kingdom</span>
                  <span className="font-semibold text-white">10%</span>
                </li>
                <li className="p-3 bg-gray-800 rounded-lg border border-gray-700 flex items-center justify-between hover:bg-gray-700/50 transition-colors">
                  <span><FiGlobe className="inline-block mr-2 text-gray-500" />Australia</span>
                  <span className="font-semibold text-white">8%</span>
                </li>
              </ul>
            </div>
          </div>
        );
      case 'summary':
        return (
          <div className="space-y-8">
            <div className="bg-gray-900/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-700/50">
              <h3 className="text-xl font-semibold text-white mb-4">AI-Generated Summary</h3>
              {podcastData ? (
                <>
                  <p className="text-gray-300 mb-6 leading-relaxed">
                    Get a concise summary of your podcast content using advanced AI. This can help you quickly grasp the main topics and extract key takeaways for reporting or sharing.
                  </p>
                  <button
                    onClick={handleGenerateSummary}
                    disabled={generatingSummary}
                    className={`inline-flex items-center justify-center px-6 py-3 rounded-xl bg-gradient-to-r from-gray-600 to-gray-700 text-white font-medium hover:from-gray-700 hover:to-gray-800 transition-all transform hover:-translate-y-0.5 shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 ${
                      generatingSummary ? 'opacity-70 cursor-not-allowed' : ''
                    }`}
                  >
                    {generatingSummary ? (
                      <>
                        <FiLoader className="animate-spin mr-2" /> Generating...
                      </>
                    ) : (
                      'Generate Summary'
                    )}
                  </button>
                  {summary && (
                    <div className="mt-8 p-5 bg-gray-800 rounded-lg border border-gray-700 text-gray-200 whitespace-pre-wrap leading-relaxed shadow-inner">
                      {summary}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-gray-400 text-lg">Please fetch podcast data first to enable summary generation.</p>
              )}
            </div>

            {relatedVideos.length > 0 && (
              <div className="bg-gray-900/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-700/50">
                <h3 className="text-xl font-semibold text-white mb-4">Related Videos (Powered by Gemini)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {relatedVideos.map((video, index) => {
                    // Safely get video ID from different possible locations
                    const videoId = video?.id?.videoId || 
                                  video?.id || 
                                  video?.snippet?.resourceId?.videoId || 
                                  `video-${index}`;
                    
                    // Safely get thumbnail URL with fallback
                    const thumbnailUrl = video?.snippet?.thumbnails?.high?.url || 
                                      video?.snippet?.thumbnails?.medium?.url || 
                                      video?.snippet?.thumbnails?.default?.url ||
                                      'https://via.placeholder.com/480x360?text=No+Thumbnail';
                    
                    // Safely get title and channel
                    const title = video?.snippet?.title || 'Untitled Video';
                    const channelTitle = video?.snippet?.channelTitle || 'Unknown Channel';
                    
                    return (
                      <a
                        key={videoId}
                        href={`https://www.youtube.com/watch?v=${videoId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block bg-gray-800 rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 border border-gray-700 hover:-translate-y-1 group"
                      >
                        <div className="relative overflow-hidden w-full aspect-video">
                          <img
                            src={thumbnailUrl}
                            alt={title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = 'https://via.placeholder.com/480x360?text=No+Thumbnail';
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                        </div>
                        <div className="p-4">
                          <h4 className="text-white font-semibold text-lg mb-1 line-clamp-2 leading-snug">{title}</h4>
                          <p className="text-gray-400 text-sm line-clamp-1">{channelTitle}</p>
                        </div>
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      default:
        return <div className="text-white text-lg">Select a tab to view content.</div>;
    }
  };

  return (
    <div className="min-h-screen bg-transparent text-white">
      <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-extrabold text-white mb-8">Podcast Dashboard</h1>

        <div className="bg-transparent backdrop-blur-sm rounded-2xl shadow-xl p-6 mb-8 border border-gray-700/50">
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-center gap-4">
            <input
              type="text"
              placeholder="Enter YouTube Podcast ID or URL (e.g., dQw4w9WgXcQ)"
              value={podcastId}
              onChange={(e) => setPodcastId(e.target.value)}
              className="flex-1 px-5 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent transition-all duration-200 text-base"
            />
            <button
              type="submit"
              disabled={loading}
              className={`px-6 py-2.5 rounded-xl bg-gradient-to-r from-gray-600 to-gray-700 text-white font-medium hover:from-gray-700 hover:to-gray-800 transition-all transform hover:-translate-y-0.5 shadow-lg hover:shadow-xl flex items-center justify-center text-base ${
                loading ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {loading ? (
                <FiLoader className="animate-spin mr-2" />
              ) : (
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              )}
              Fetch Data
            </button>
          </form>
          {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
        </div>

        <div className="bg-transparent backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden border border-gray-700/50">
          <div className="px-6 pt-10 bg-transparent border-b border-gray-700/50">
            <nav className="flex space-x-3 pb-4">
              {tabs.map((tab) => (
                <Tab
                  key={tab.id}
                  active={activeTab === tab.id}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.icon}
                  {tab.label}
                </Tab>
              ))}
            </nav>
          </div>
          <div className="p-6 bg-transparent rounded-b-xl rounded-tr-xl shadow-inner border-t border-gray-800">
            <div className="bg-transparent p-6 rounded-xl min-h-[500px] border border-gray-800/50">
              {renderTabContent()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;