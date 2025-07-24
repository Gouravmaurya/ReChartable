import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { podcastAPI } from '../utils/api';
import { generateSummary, getRelatedVideos } from '../utils/gemini';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';

// Custom tooltip for charts
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded shadow-lg">
        <p className="font-semibold">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color }}>
            {`${entry.name}: ${entry.value}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Color palette for charts
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

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
  
  const hours = match[1] ? parseInt(match[1]) : 0;
  const minutes = match[2] ? parseInt(match[2]) : 0;
  const seconds = match[3] ? parseInt(match[3]) : 0;
  
  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);
  
  return parts.join(' ');
};

const Dashboard = () => {
  const [sourceType, setSourceType] = useState('youtube'); // 'youtube' or 'youtube-podcast'
  const [podcastUrl, setPodcastUrl] = useState('');
  const [podcastData, setPodcastData] = useState(null);
  const [isFetching, setIsFetching] = useState(false);
  const [relatedVideos, setRelatedVideos] = useState([]);
  const [summary, setSummary] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingRelatedVideos, setIsLoadingRelatedVideos] = useState(false);
  const [relatedVideosError, setRelatedVideosError] = useState('');
  const [activeTab, setActiveTab] = useState('analytics'); // 'analytics' or 'description'
  
  const sourcePlaceholders = {
    youtube: 'Enter YouTube video URL',
    'youtube-podcast': 'Enter YouTube podcast URL'
  };

  // Fetch podcast analytics when podcastData changes
  useEffect(() => {
    const fetchPodcastAnalytics = async (podcastId) => {
      if (!podcastId) return;
      
      const isMongoDBId = /^[0-9a-fA-F]{24}$/.test(podcastId);
      
      if (!isMongoDBId) {
        console.log('Skipping analytics fetch for external content');
        return;
      }
      
      try {
        setIsFetching(true);
        console.log('Fetching analytics for podcast ID:', podcastId);
        await podcastAPI.getPodcastAnalytics(podcastId);
      } catch (error) {
        if (error.response?.status !== 404) {
          console.error('Error fetching podcast analytics:', error);
          toast.error('Failed to fetch podcast analytics');
        } else {
          console.log('Analytics not available for this podcast yet');
        }
      } finally {
        setIsFetching(false);
      }
    };

    if (podcastData?.id) {
      fetchPodcastAnalytics(podcastData.id);
    }
  }, [podcastData]);

  const handleFetchPodcastData = async (e) => {
    e.preventDefault();
    if (!podcastUrl) return;
    
    try {
      setIsFetching(true);
      let requestData = { podcastUrl };
      
      if (sourceType === 'youtube-podcast') {
        requestData.sourceType = 'podcast';
      } else if (sourceType === 'youtube') {
        requestData.sourceType = 'video';
      }
      
      const response = await podcastAPI.getPodcastDetails(podcastUrl, requestData);
      
      if (response.data) {
        const podcastWithId = {
          ...response.data,
          id: response.data._id || response.data.id || null,
          sourceType: sourceType === 'youtube-podcast' ? 'podcast' : (sourceType === 'youtube' ? 'video' : sourceType)
        };
        
        setPodcastData(podcastWithId);
        
        let successMessage = 'YouTube video data fetched successfully!';
        if (sourceType === 'youtube-podcast') {
          successMessage = 'YouTube podcast data fetched successfully!';
        }
        
        toast.success(response.message || successMessage);
      } else {
        toast.error('No data returned from the server');
      }
    } catch (error) {
      console.error('Error fetching content data:', error);
      let errorMessage = error.response?.data?.message || 'Failed to fetch content data';
      
      if (sourceType === 'youtube-podcast') {
        errorMessage = error.response?.data?.message || 'Failed to fetch YouTube podcast data';
      } else if (sourceType === 'youtube') {
        errorMessage = error.response?.data?.message || 'Failed to fetch YouTube video data';
      }
      
      toast.error(errorMessage);
    } finally {
      setIsFetching(false);
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Render statistics in a grid
  const renderStatistics = (stats) => {
    if (!stats) return null;
    
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Object.entries(stats).map(([key, value]) => (
          <div key={key} className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-300 capitalize">
              {key.replace(/([A-Z])/g, ' $1').trim()}
            </div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              {typeof value === 'number' || !isNaN(value) ? formatNumber(value) : value}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Render metadata in a grid
  const renderMetadata = (data) => {
    if (!data) return null;
    
    const skipKeys = ['thumbnails', 'localized', 'tags', 'statistics', 'contentDetails', 'snippet'];
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(data).map(([key, value]) => {
          if (value === null || value === undefined || 
              typeof value === 'object' || 
              skipKeys.includes(key)) {
            return null;
          }
          
          let displayValue = value;
          if (key.toLowerCase().includes('date') || key.toLowerCase().includes('time')) {
            displayValue = formatDate(value);
          } else if (key.toLowerCase().includes('duration')) {
            displayValue = formatDuration(value);
          } else if (typeof value === 'string' && value.length > 100) {
            displayValue = value.substring(0, 100) + '...';
          }
          
          return (
            <div key={key} className="break-words">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-300 capitalize">
                {key.replace(/([A-Z])/g, ' $1').trim()}
              </div>
              <div className="text-gray-900 dark:text-white">
                {String(displayValue) || 'N/A'}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Prepare analytics data for charts
  const prepareChartData = () => {
    const defaultTimeSeriesData = [
      { date: 'Jan', views: 0, likes: 0 },
      { date: 'Feb', views: 0, likes: 0 },
      { date: 'Mar', views: 0, likes: 0 },
    ];

    if (podcastData?.statistics) {
      const { viewCount, likeCount, commentCount } = podcastData.statistics;
      
      const views = parseInt(viewCount) || 0;
      const likes = parseInt(likeCount) || 0;
      const comments = parseInt(commentCount) || 0;
      const engagementRate = views > 0 
        ? ((likes + comments) / views * 100).toFixed(2)
        : 0;

      return {
        timeSeriesData: defaultTimeSeriesData, // Placeholder, as real time-series data isn't available from the API
        pieData: [
          { name: 'Likes', value: likes },
          { name: 'Comments', value: comments },
          { name: 'Views', value: views }
        ],
        engagementRate
      };
    }
    
    return {
      timeSeriesData: [
        { name: 'Jan', listens: 4000, downloads: 2400 },
        { name: 'Feb', listens: 3000, downloads: 1398 },
        { name: 'Mar', listens: 2000, downloads: 9800 },
      ],
      pieData: [
        { name: 'Likes', value: 45 },
        { name: 'Comments', value: 25 },
        { name: 'Shares', value: 15 },
      ],
      engagementRate: 0
    };
  };

  const chartData = prepareChartData();
  
  const deviceData = [
    { name: 'Mobile', value: 60 },
    { name: 'Desktop', value: 30 },
    { name: 'Tablet', value: 10 },
  ];
  
  const platformData = [
    { name: 'iOS', value: 45 },
    { name: 'Android', value: 35 },
    { name: 'Web', value: 15 },
    { name: 'Other', value: 5 },
  ];
  
  const handleGenerateSummary = async () => {
    if (!podcastData) return;
    
    try {
      setIsGenerating(true);
      const generatedSummary = await generateSummary(
        podcastData.snippet?.title || 'This content',
        podcastData.snippet?.description || '',
        podcastData.snippet?.description || ''
      );
      setSummary(generatedSummary);
    } catch (error) {
      console.error('Error generating summary:', error);
      toast.error('Failed to generate summary. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGetRelatedVideos = async () => {
    if (!podcastData) return;
    
    try {
      setIsLoadingRelatedVideos(true);
      setRelatedVideosError('');
      
      const videos = await getRelatedVideos(
        podcastData.snippet?.title || '',
        podcastData.snippet?.channelTitle || '',
        podcastData.snippet?.description || ''
      );
      
      setRelatedVideos(Array.isArray(videos) ? videos : []);
    } catch (error) {
      console.error('Error getting related videos:', error);
      setRelatedVideosError('Failed to load related videos. Please try again.');
      setRelatedVideos([]);
    } finally {
      setIsLoadingRelatedVideos(false);
    }

const deviceData = [
  { name: 'Mobile', value: 60 },
  { name: 'Desktop', value: 30 },
  { name: 'Tablet', value: 10 },
];

const platformData = [
  { name: 'iOS', value: 45 },
  { name: 'Android', value: 35 },
  { name: 'Web', value: 15 },
  { name: 'Other', value: 5 },
];
                sourceType === 'youtube' 
                  ? 'border-blue-600 text-blue-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}>
              YouTube Video
            </button>
            <button
              type="button"
              onClick={() => setSourceType('youtube-podcast')}
              className={`px-4 py-2 font-medium text-sm rounded-t-lg -mb-px border-b-2 ${
                sourceType === 'youtube-podcast' 
                  ? 'border-blue-600 text-blue-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              YouTube Podcast
            </button>
          </nav>

          <form onSubmit={handleFetchPodcastData} className="mt-4 flex flex-col sm:flex-row gap-4">
            <input
              type="url"
              value={podcastUrl}
              onChange={(e) => setPodcastUrl(e.target.value)}
              placeholder={sourcePlaceholders[sourceType]}
              className="flex-grow p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              required
            />
            <button 
              type="submit"
              disabled={isFetching}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {isFetching ? 'Fetching...' : 'Get Analytics'}
            </button>
          </form>
        </div>
      </div>

      {/* Display Data */}
      {podcastData && (
        <div className="space-y-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    {podcastData.snippet?.title || 'No title available'}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {podcastData.snippet?.channelTitle || 'No channel'}
                  </p>
                </div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  {podcastData.kind === 'youtube#video' ? 'Video' : 'Podcast'}
                </span>
              </div>
            </div>
            
            <div className="p-6">
              <div className="flex flex-col lg:flex-row gap-8">
                {/* Left Column: Thumbnail & Quick Stats */}
                <div className="w-full lg:w-1/3 xl:w-1/4 flex-shrink-0">
                  <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                    {podcastData.snippet?.thumbnails?.maxres?.url ? (
                      <img src={podcastData.snippet.thumbnails.maxres.url} alt={podcastData.snippet?.title || 'Video thumbnail'} className="w-full h-full object-cover" />
                    ) : podcastData.snippet?.thumbnails?.high?.url ? (
                      <img src={podcastData.snippet.thumbnails.high.url} alt={podcastData.snippet?.title || 'Video thumbnail'} className="w-full h-full object-cover" />
                    ) : podcastData.images?.[0]?.url ? (
                      <img src={podcastData.images[0].url} alt={podcastData.name || 'Podcast cover'} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                        <span className="text-gray-400">No thumbnail</span>
                      </div>
                    )}
                    
                    {podcastData.id && !podcastData.type?.includes('playlist') && (
                      <a 
                        href={`https://www.youtube.com/watch?v=${podcastData.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 hover:bg-opacity-30 transition-all duration-200"
                      >
                        <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center transform hover:scale-110 transition-transform">
                          <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                        </div>
                      </a>
                    )}
                  </div>
                  
                  {podcastData.statistics && (
                    <div className="mt-4 grid grid-cols-2 gap-4">
                      {Object.entries(podcastData.statistics).map(([key, value]) => (
                        <div key={key} className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg text-center">
                          <div className="text-sm font-medium text-gray-500 dark:text-gray-300 capitalize">
                            {key.replace(/([A-Z])/g, ' $1').trim()}
                          </div>
                          <div className="text-lg font-semibold text-gray-900 dark:text-white">
                            {formatNumber(value)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Right Column: Main Content */}
                <div className="flex-1">
                  {podcastData.snippet?.description && (
                    <div className="mb-6">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Description</h3>
                      <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">
                        {podcastData.snippet.description}
                      </p>
                    </div>
                  )}
                  
                  {podcastData.snippet?.tags?.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Tags</h3>
                      <div className="flex flex-wrap gap-2">
                        {podcastData.snippet.tags.slice(0, 10).map((tag, index) => (
                          <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">
                            {tag}
                          </span>
                        ))}
                        {podcastData.snippet.tags.length > 10 && (
                          <span className="text-xs text-gray-500 dark:text-gray-400 self-center">
                            +{podcastData.snippet.tags.length - 10} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div className="mb-6">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Details</h3>
                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {podcastData.snippet?.publishedAt && (
                          <div>
                            <div className="text-sm font-medium text-gray-500 dark:text-gray-300">Published</div>
                            <div className="text-gray-900 dark:text-white">{formatDate(podcastData.snippet.publishedAt)}</div>
                          </div>
                        )}
                        {podcastData.contentDetails?.duration && (
                          <div>
                            <div className="text-sm font-medium text-gray-500 dark:text-gray-300">Duration</div>
                            <div className="text-gray-900 dark:text-white">{formatDuration(podcastData.contentDetails.duration)}</div>
                          </div>
                        )}
                        {podcastData.snippet?.channelTitle && (
                          <div>
                            <div className="text-sm font-medium text-gray-500 dark:text-gray-300">Channel</div>
                            <div className="text-gray-900 dark:text-white">{podcastData.snippet.channelTitle}</div>
                          </div>
                        )}
                        {podcastData.id && (
                          <div>
                            <div className="text-sm font-medium text-gray-500 dark:text-gray-300">Video ID</div>
                            <div className="text-gray-900 dark:text-white font-mono text-sm">{podcastData.id}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-6">
                    <details className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                      <summary className="px-4 py-2 bg-gray-50 dark:bg-gray-700 cursor-pointer font-medium text-gray-700 dark:text-gray-200">
                        View Raw Data
                      </summary>
                      <div className="p-4 bg-white dark:bg-gray-800 max-h-96 overflow-auto">
                        <pre className="text-xs text-gray-700 dark:text-gray-300">
                          {JSON.stringify(podcastData, null, 2)}
                        </pre>
                      </div>
                    </details>
                  </div>
                </div>
              </div>

              {/* Detailed Data Sections */}
              {podcastData.statistics && (
                <div className="mt-8">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Statistics</h3>
                  <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg">
                    {renderStatistics(podcastData.statistics)}
                  </div>
                </div>
              )}
              {podcastData.snippet && (
                <div className="mt-8">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Metadata</h3>
                  <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg">
                    {renderMetadata(podcastData.snippet)}
                  </div>
                </div>
              )}
              {podcastData.contentDetails && (
                <div className="mt-8">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Content Details</h3>
                  <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg">
                    {renderMetadata(podcastData.contentDetails)}
                  </div>
                </div>
              )}
            </div>

            {/* Analytics & Charts */}
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Analytics Dashboard</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-white dark:bg-gray-700 p-4 rounded-lg shadow"><div className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Views</div><div className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">{formatNumber(podcastData.statistics?.viewCount || 0)}</div></div>
                <div className="bg-white dark:bg-gray-700 p-4 rounded-lg shadow"><div className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Likes</div><div className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">{formatNumber(podcastData.statistics?.likeCount || 0)}</div></div>
                <div className="bg-white dark:bg-gray-700 p-4 rounded-lg shadow"><div className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Comments</div><div className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">{formatNumber(podcastData.statistics?.commentCount || 0)}</div></div>
                <div className="bg-white dark:bg-gray-700 p-4 rounded-lg shadow"><div className="text-sm font-medium text-gray-500 dark:text-gray-400">Engagement Rate</div><div className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">{chartData.engagementRate}%</div></div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-700 p-4 rounded-lg shadow">
                  <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">Views & Likes Over Time</h4>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData.timeSeriesData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis /><Tooltip content={<CustomTooltip />} /><Legend /><Line type="monotone" dataKey="views" name="Views" stroke="#0088FE" strokeWidth={2} dot={false} /><Line type="monotone" dataKey="likes" name="Likes" stroke="#00C49F" strokeWidth={2} dot={false} /></LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-700 p-4 rounded-lg shadow">
                  <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">Engagement Distribution</h4>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart><Pie data={chartData.pieData} cx="50%" cy="50%" labelLine={false} outerRadius={80} fill="#8884d8" dataKey="value" label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}>{chartData.pieData.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}</Pie><Tooltip formatter={(value) => formatNumber(value)} /><Legend /></PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
              
              <div className="mt-8">
                <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Device & Platform Distribution</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white dark:bg-gray-700 p-4 rounded-lg shadow">
                    <h5 className="text-md font-medium text-gray-900 dark:text-white mb-4">Device Types</h5>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={deviceData} cx="50%" cy="50%" outerRadius={80} fill="#8884d8" dataKey="value" label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}>{deviceData.map((entry, index) => (<Cell key={`device-cell-${index}`} fill={COLORS[index % COLORS.length]} />))}</Pie><Tooltip formatter={(value) => `${value}%`} /><Legend /></PieChart></ResponsiveContainer>
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-700 p-4 rounded-lg shadow">
                    <h5 className="text-md font-medium text-gray-900 dark:text-white mb-4">Platforms</h5>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%"><BarChart data={platformData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" /><YAxis dataKey="name" type="category" /><Tooltip formatter={(value) => `${value}%`} /><Legend /><Bar dataKey="value" fill="#8884d8" name="Distribution" /></BarChart></ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* AI Summary Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">AI-Generated Summary</h3>
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              {summary ? (<p className="text-gray-700 dark:text-gray-300">{summary}</p>) : (<p className="text-gray-500 dark:text-gray-400 text-center py-4">No summary available. Click "Generate Summary" to create one.</p>)}
            </div>
            <div className="mt-4 flex justify-end">
              <button onClick={handleGenerateSummary} disabled={isGenerating} className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed">
                {isGenerating ? 'Generating...' : 'Generate Summary'}
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Related Videos</h3>
              <button onClick={handleGetRelatedVideos} disabled={isLoadingRelatedVideos} className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed">
                {isLoadingRelatedVideos ? 'Loading...' : 'Get Related Videos'}
              </button>
            </div>
            {relatedVideosError ? (
              <div className="text-center py-8 bg-red-50 dark:bg-red-900/20 rounded-lg"><p className="text-red-600 dark:text-red-400">{relatedVideosError}</p></div>
            ) : relatedVideos.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {relatedVideos.map((video, index) => (
                  <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="p-4">
                      <h4 className="font-medium text-gray-900 dark:text-white mb-2">{video.title}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300">{video.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 dark:bg-gray-700 rounded-lg"><p className="text-gray-500 dark:text-gray-400">Click "Get Related Videos" to see suggestions.</p></div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;