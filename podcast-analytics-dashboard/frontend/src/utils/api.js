import axios from 'axios';

// Determine the base URL based on environment
const getBaseURL = () => {
  if (import.meta.env.DEV) {
    return '/api';  // Use proxy in development
  }
  // In production, use the configured API URL
  return import.meta.env.VITE_API_URL || 'https://re-chartable-tra2.vercel.app/api/v1';
};

// Get CORS origin from environment
const CORS_ORIGIN = import.meta.env.VITE_CORS_ORIGIN || 'https://re-chartable.vercel.app';

// Create an axios instance with default config
const api = axios.create({
  baseURL: getBaseURL(),
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Simple request interceptor for auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle specific error cases if needed
    return Promise.reject(error);
  }
);

// Add a request interceptor to include the auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 Unauthorized responses (token expired or invalid)
    if (error.response && error.response.status === 401) {
      // Clear stored token and redirect to login
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API methods
export const authAPI = {
  // Register a new user
  register: async (userData) => {
    try {
      const response = await api.post('/auth/register', userData);
      // Store the token in localStorage
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
      }
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || 'Registration failed';
    }
  },

  // Login user
  login: async (credentials) => {
    try {
      const response = await api.post('/auth/login', credentials);
      // Store the token in localStorage
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
      }
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || 'Login failed';
    }
  },

  // Get current user
  getCurrentUser: async () => {
    try {
      const response = await api.get('/auth/me');
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || 'Failed to fetch user';
    }
  },

  // Logout user
  logout: async () => {
    try {
      await api.get('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear the token from localStorage
      localStorage.removeItem('token');
    }
  },
};

// Podcast API methods
export const podcastAPI = {
  // Get podcast details from URL and save to user's history
  getPodcastDetails: async (podcastId, options = {}) => {
    try {
      // If it's a YouTube ID, convert it to a full URL
      const isYoutubeId = /^[a-zA-Z0-9_-]{11}$/.test(podcastId);
      const podcastUrl = isYoutubeId 
        ? `https://www.youtube.com/watch?v=${podcastId}`
        : podcastId;
      
      const { sourceType = 'youtube' } = options;
      const payload = { 
        podcastUrl,
        sourceType
      };
      
      // Get the podcast details
      const detailsResponse = await api.post('/podcast-details', payload);
      const podcastData = detailsResponse.data;
      
      // Then save it to the user's history
      try {
        await api.post('/podcasts', {
          title: podcastData.snippet?.title || 'Untitled Podcast',
          description: podcastData.snippet?.description || '',
          source: sourceType || 'youtube',
          sourceId: podcastData.id,
          thumbnail: podcastData.snippet?.thumbnails?.high?.url || '',
          statistics: podcastData.statistics || {},
          duration: podcastData.contentDetails?.duration || '00:00:00',
          publishedAt: podcastData.snippet?.publishedAt || new Date().toISOString()
        });
      } catch (saveError) {
        console.warn('Failed to save podcast to history:', saveError);
        // Don't fail the whole operation if saving to history fails
      }
      
      return podcastData;
    } catch (error) {
      console.error('Error in getPodcastDetails:', error);
      const errorMessage = error.response?.data?.message || 'Failed to fetch podcast details';
      throw new Error(errorMessage);
    }
  },
  
  // Get podcast details from URL (legacy function)
  getPodcastDetailsFromUrl: async (podcastUrl) => {
    try {
      const response = await api.post('/podcast-details', { podcastUrl });
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || 'Failed to fetch podcast details';
    }
  },

  // Get all podcasts
  getPodcasts: async () => {
    try {
      const response = await api.get('/podcasts');
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || 'Failed to fetch podcasts';
    }
  },

  // Get a single podcast
  getPodcast: async (id) => {
    try {
      const response = await api.get(`/podcasts/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || 'Failed to fetch podcast';
    }
  },

  // Get podcast analytics
  getPodcastAnalytics: async (podcastId) => {
    try {
      const response = await api.get(`/podcasts/${podcastId}/analytics`);
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || 'Failed to fetch analytics';
    }
  },
};

// AI Insights API methods
export const aiInsightsAPI = {
  // Get AI insights for a podcast
  getInsights: async (podcastId) => {
    try {
      const response = await api.get(`/ai-insights/${podcastId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || 'Failed to fetch AI insights';
    }
  },

  // Generate AI insights
  generateInsights: async (podcastId, params) => {
    try {
      const response = await api.post(`/ai-insights/${podcastId}/generate`, params);
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || 'Failed to generate AI insights';
    }
  },
};

export default api;
