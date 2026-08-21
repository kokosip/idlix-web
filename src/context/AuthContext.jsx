import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  initDatabase, 
  verifyCredentials, 
  updatePassword as dbUpdatePassword,
  updateProfile as dbUpdateProfile,
  findUser
} from '../services/db';

const AuthContext = createContext();
const SESSION_KEY = 'idlix_session_user';

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize DB & load saved session on initial mount
  useEffect(() => {
    initDatabase();
    try {
      const savedUsername = localStorage.getItem(SESSION_KEY);
      if (savedUsername) {
        const found = findUser(savedUsername);
        if (found) {
          const { password: _, ...userNoPass } = found;
          setCurrentUser(userNoPass);
        } else {
          localStorage.removeItem(SESSION_KEY);
        }
      }
    } catch (e) {
      console.error('Failed to load user session:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Login handler
  const login = (username, password) => {
    const res = verifyCredentials(username, password);
    if (res.success && res.user) {
      setCurrentUser(res.user);
      localStorage.setItem(SESSION_KEY, res.user.username);
    }
    return res;
  };

  // Logout handler
  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem(SESSION_KEY);
  };

  // Change password handler
  const changePassword = (oldPassword, newPassword) => {
    if (!currentUser) return { success: false, message: 'Belum login!' };
    return dbUpdatePassword(currentUser.username, oldPassword, newPassword);
  };

  // Update profile details
  const editProfile = (updatedFields) => {
    if (!currentUser) return { success: false, message: 'Belum login!' };
    const res = dbUpdateProfile(currentUser.username, updatedFields);
    if (res.success && res.user) {
      setCurrentUser(res.user);
    }
    return res;
  };

  const value = {
    currentUser,
    isLoggedIn: !!currentUser,
    isLoading,
    login,
    logout,
    changePassword,
    editProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
