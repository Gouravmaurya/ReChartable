// Layout.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api, { podcastAPI } from '../utils/api';
import { toast } from 'react-hot-toast';
import {
  FiMenu,
  FiX,
  FiHome,
  FiLogOut,
  FiTrendingUp,
  FiUsers,
  FiBarChart2,
  FiFileText,
  FiSearch,
  FiSettings,
  FiHelpCircle,
  FiMic,
  FiChevronRight
} from 'react-icons/fi';

const Layout = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const location = useLocation();
  const navigate = useNavigate();
  const [podcasts, setPodcasts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Function to handle podcast deletion
  const handleDeletePodcast = async (podcastId, e) => {
    e.stopPropagation(); // Prevent navigation when clicking delete

    if (!podcastId) {
      console.error('No podcast ID provided for deletion');
      toast.error('Error: No podcast ID provided');
      return;
    }

    if (window.confirm('Are you sure you want to remove this podcast from your history?')) {
      try {
        await api.delete(`/podcasts/test/history/${podcastId}`);
        // Refresh the podcast list after deletion
        fetchPodcasts();
        toast.success('Podcast removed from history');
      } catch (error) {
        console.error('Error deleting podcast:', error);
        const errorMessage = error.response?.data?.message || 'Failed to remove podcast from history';
        toast.error(errorMessage);
      }
    }
  };

  // Fetch user's podcasts from the test endpoint
  const fetchPodcasts = useCallback(async () => {
    try {
      console.log('Fetching podcast history from test endpoint...');
      const response = await api.get('/podcasts/test/history');
      console.log('Podcast history response:', response);
      
      // Log the full response structure
      console.log('Full response structure:', {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data: response.data
      });

      if (response.data && Array.isArray(response.data)) {
        console.log('Found podcasts:', response.data);
        setPodcasts(response.data);
      } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
        // Handle case where data is nested under 'data' property
        console.log('Found podcasts in data property:', response.data.data);
        setPodcasts(response.data.data);
      } else {
        console.error('Unexpected response format:', response);
        toast.error('Unexpected response format from server');
        setPodcasts([]);
      }
    } catch (error) {
      console.error('Error fetching podcast history:', error);
      if (error.response) {
        console.error('Error response:', {
          status: error.response.status,
          data: error.response.data,
          headers: error.response.headers
        });
      }
      toast.error('Failed to load your podcast history');
      setPodcasts([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial data fetch
  useEffect(() => {
    fetchPodcasts();
  }, [fetchPodcasts]);

  // Check if mobile on resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setIsSidebarOpen(true);
      } else {
        setIsSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Call once to set initial state
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close sidebar when route changes on mobile
  useEffect(() => {
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  }, [location.pathname, isMobile]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  // Toggle sidebar
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const navItems = [
    { path: '/dashboard', icon: FiHome, label: 'Dashboard' }
  ];

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden relative font-sans">
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 bg-gray-900 border-b border-gray-700 p-4 flex justify-between items-center shadow-md">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gray-700 flex items-center justify-center shadow-inner">
            <FiMic className="text-white" size={20} />
          </div>
          <h1 className="text-xl font-bold text-white tracking-wide">PodcastMetrics</h1>
        </div>
        <button
          onClick={toggleSidebar}
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-600 focus:ring-opacity-50"
          aria-label="Toggle menu"
        >
          {isSidebarOpen ? <FiX size={26} /> : <FiMenu size={26} />}
        </button>
      </div>

      {/* Sidebar */}
      <div
        className={`fixed md:relative z-20 bg-gray-900 border-r border-gray-800 flex flex-col h-full transition-all duration-300 ease-in-out shadow-lg ${
          isSidebarOpen ? 'left-0 w-64 md:w-64' : '-left-full md:left-0 md:w-20 overflow-hidden'
        }`}
        style={{
          top: isMobile ? '68px' : '0', // Adjust top for mobile header height
          height: isMobile ? 'calc(100vh - 68px)' : '100vh',
        }}
      >
        {/* Sidebar Header (visible when expanded) */}
        <div className={`p-5 pb-4 ${!isSidebarOpen ? 'hidden' : 'block'}`}>
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gray-700 flex items-center justify-center shadow-inner">
              <FiMic className="text-white" size={22} />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-wide">PodcastMetrics</h1>
          </div>
          {/* Search Bar */}
          <div className="relative mb-6">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiSearch className="h-5 w-5 text-gray-500" />
            </div>
            <input
              type="text"
              placeholder="Search podcasts..."
              className="w-full pl-10 pr-3 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-600 focus:border-transparent text-sm"
            />
          </div>
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto pb-4 custom-scrollbar">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center py-3 px-3 rounded-lg transition-colors duration-200 text-base font-medium ${
                location.pathname === item.path
                  ? 'bg-gray-800 text-white shadow-inner border border-gray-700'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
              title={item.label}
            >
              <item.icon className={`h-6 w-6 flex-shrink-0 ${isSidebarOpen ? 'mr-3' : ''}`} />
              <span className={`${!isSidebarOpen ? 'hidden' : 'block'}`}>{item.label}</span>
            </Link>
          ))}

          {/* Recently Added Podcasts */}
          <div className={`mt-6 pt-4 border-t border-gray-800 ${!isSidebarOpen ? 'hidden' : 'block'}`}>
            <h3 className="text-xs font-semibold text-gray-400 uppercase mb-3 px-3">Recently Added</h3>
            <ul className="space-y-2">
              {isLoading ? (
                <li className="text-gray-500 text-sm px-3">Loading podcasts...</li>
              ) : podcasts.length > 0 ? (
                podcasts.slice(0, 5).map((podcast) => (
                  <li
                    key={podcast._id || podcast.id}
                    className="group flex items-center justify-between py-2 px-3 hover:bg-gray-800 rounded-lg transition-colors duration-200 cursor-pointer"
                  >
                    <Link to={`/dashboard?podcastId=${podcast?._id || podcast?.id || ''}`} className="flex-1 flex items-center min-w-0">
                      <img
                        src={podcast?.coverImage || podcast?.thumbnail || 'https://via.placeholder.com/48x48?text=Thumb'}
                        alt={podcast?.title || 'Podcast'}
                        className="w-9 h-9 rounded-md mr-3 object-cover border border-gray-700 flex-shrink-0"
                      />
                      <span className="text-sm text-gray-300 truncate group-hover:text-white font-medium">
                        {podcast?.title || 'Untitled Podcast'}
                      </span>
                    </Link>
                    <button
                      onClick={(e) => handleDeletePodcast(podcast._id || podcast.id, e)}
                      className="ml-2 p-1.5 text-gray-500 hover:text-red-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                      title="Remove from history"
                    >
                      <FiX className="h-5 w-5" />
                    </button>
                  </li>
                ))
              ) : (
                <li className="text-gray-500 text-sm px-3 py-2">No podcasts added yet.</li>
              )}
            </ul>
          </div>
        </nav>

        {/* User Profile / Logout */}
        <div className={`p-5 border-t border-gray-800 ${!isSidebarOpen ? 'md:hidden' : 'block'}`}>
          <div className="flex items-center p-3 rounded-xl bg-gray-800 shadow-inner">
            <div className="flex-shrink-0 h-11 w-11 rounded-full bg-gray-600 flex items-center justify-center text-white text-xl font-bold border border-gray-700">
              {localStorage.getItem('userName')?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="ml-3 overflow-hidden min-w-0">
              <p className="text-base font-semibold text-white truncate">
                {localStorage.getItem('userName') || 'User'}
              </p>
              <p className="text-sm text-gray-400 truncate">
                {localStorage.getItem('userEmail') || 'user@example.com'}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="ml-auto p-2 text-gray-400 hover:text-white rounded-full hover:bg-gray-700 transition-colors flex items-center focus:outline-none focus:ring-2 focus:ring-gray-600 focus:ring-opacity-50"
              title="Sign out"
            >
              <FiLogOut className="h-6 w-6" />
              <span className="ml-2 text-sm font-medium hidden md:group-hover:inline">Sign out</span> {/* Only show text on hover for larger screens if that effect is desired, otherwise just show icon. Keeping it simple. */}
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div
        className={`flex-1 transition-all duration-300 min-h-72 overflow-auto bg-gray-950 rounded-lg ${
          isSidebarOpen ? 'md:m-4' : 'md:m-20' // Adjust margin based on sidebar state
        } ${isMobile ? 'mt-16' : ''}`}
        style={{
          height: isMobile ? 'calc(100vh - 68px)' : 'calc(100vh - 32px)',
          marginTop: isMobile ? '68px' : '16px',
          marginBottom: '16px'
        }}
      >
        {children}
      </div>

      {/* Mobile menu overlay */}
      {isMobile && isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 z-10 md:hidden"
          onClick={toggleSidebar}
        ></div>
      )}
    </div>
  );
};

export default Layout;