import { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if user is authenticated on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = api.getToken();
        if (token) {
          try {
            const data = await api.getCurrentUser();
            setUser(data.user);
          } catch (error) {
            // Token invalid or backend unavailable, clear it
            console.warn('Auth check failed:', error.message);
            api.setToken(null);
            setUser(null);
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        // Don't crash if there's an error, just set loading to false
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const data = await api.login(email, password);
      api.setToken(data.session.accessToken);
      setUser(data.user);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Login failed'
      };
    }
  };

  const register = async (userData) => {
    try {
      const data = await api.register(userData);
      if (data.session) {
        api.setToken(data.session.accessToken);
        setUser(data.user);
      }
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Registration failed'
      };
    }
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      api.setToken(null);
      setUser(null);
      // Navigation will be handled by ProtectedRoute redirecting to login
      window.location.href = '/';
    }
  };

  // Instantly updates the user state across the app after editing profile
  const updateUserInContext = (updatedUserData) => {
    setUser(updatedUserData);
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    updateUserInContext,
    isAuthenticated: !!user
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};