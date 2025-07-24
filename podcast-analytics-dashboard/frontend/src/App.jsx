// App.jsx
import { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { FiLoader } from 'react-icons/fi';

// Lazy load pages for better performance
const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));
const Dashboard = lazy(() => import('./pages/NewDashboard'));

// Components
const Layout = lazy(() => import('./components/Layout'));

// Loading component for Suspense fallback
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-black to-gray-900">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-400 mx-auto mb-4"></div>
      <p className="text-gray-300">Loading...</p>
    </div>
  </div>
);

// Auth wrapper component to handle protected routes
const AuthWrapper = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          // Here you could validate the token with the backend
          // For now, we'll just check if it exists
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        localStorage.removeItem('token');
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [location]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-black to-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-t-gray-400 border-r-gray-400/30 border-b-gray-400/30 border-l-gray-400/30 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-white mb-2">Loading Your Dashboard</h2>
          <p className="text-gray-400">Please wait while we prepare your analytics</p>
        </div>
      </div>
    );
  }

  return children;
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token')); // Re-check auth for initial render

  useEffect(() => {
    const handleStorageChange = () => {
      setIsAuthenticated(!!localStorage.getItem('token'));
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return (
    <Suspense fallback={<LoadingFallback />}>
      <Router>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#333',
              color: '#fff',
            },
          }}
        />
        <AuthWrapper>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/dashboard/*"
              element={
                isAuthenticated ? (
                  <Layout>
                    <Dashboard />
                  </Layout>
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />
            <Route
              path="/"
              element={
                isAuthenticated ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />
              }
            />
            <Route path="*" element={
              <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-br from-black to-gray-900">
                <div className="bg-gray-900/90 backdrop-blur-sm rounded-2xl shadow-2xl p-8 max-w-md w-full text-center border border-gray-700/50">
                  <h1 className="text-8xl font-bold mb-4 bg-gradient-to-r from-gray-400 to-gray-500 bg-clip-text text-transparent">404</h1>
                  <h2 className="text-2xl font-semibold text-white mb-2">Page Not Found</h2>
                  <p className="text-gray-400 mb-6">The page you're looking for doesn't exist or has been moved.</p>
                  <a
                    href={isAuthenticated ? "/dashboard" : "/login"}
                    className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-gradient-to-r from-gray-500 to-gray-600 text-white font-medium hover:opacity-90 transition-all transform hover:-translate-y-0.5 shadow-lg hover:shadow-xl"
                  >
                    {isAuthenticated ? 'Go to Dashboard' : 'Go to Login'}
                  </a>
                </div>
              </div>
            } />
          </Routes>
        </AuthWrapper>
      </Router>
    </Suspense>
  );
}

export default App;