import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

// API Base URL - adjust this to match your backend
const API_BASE_URL = 'http://localhost:5000/api';

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);

  useEffect(() => {
    // Check for existing session on app load
    const savedUser = localStorage.getItem('liquor_pos_user');
    const savedToken = localStorage.getItem('liquor_pos_token');
    
    if (savedUser && savedToken) {
      setUser(JSON.parse(savedUser));
      setToken(savedToken);
      // Verify token is still valid by fetching profile
      verifyToken(savedToken);
    } else {
      setLoading(false);
    }
  }, []);

  const verifyToken = async (tokenToVerify) => {
    try {
      const response = await fetch(`${API_BASE_URL}/profile`, {
        headers: {
          'Authorization': `Bearer ${tokenToVerify}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        localStorage.setItem('liquor_pos_user', JSON.stringify(data.user));
        setLoading(false);
      } else {
        // Token is invalid, clear stored data
        localStorage.removeItem('liquor_pos_user');
        localStorage.removeItem('liquor_pos_token');
        setUser(null);
        setToken(null);
        setLoading(false);
      }
    } catch (error) {
      console.error('Token verification failed:', error);
      localStorage.removeItem('liquor_pos_user');
      localStorage.removeItem('liquor_pos_token');
      setUser(null);
      setToken(null);
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      setLoading(true);
      
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: email,
          password: password
        })
      });

      const data = await response.json();

      if (response.ok) {
        const { access_token, user: userData, redirect_url } = data;
        
        // Store token and user data
        setToken(access_token);
        setUser(userData);
        localStorage.setItem('liquor_pos_token', access_token);
        localStorage.setItem('liquor_pos_user', JSON.stringify(userData));
        
        setLoading(false);
        return { 
          success: true, 
          user: userData, 
          redirect_url: redirect_url 
        };
      } else {
        setLoading(false);
        return { 
          success: false, 
          error: data.message || 'Login failed' 
        };
      }
    } catch (error) {
      setLoading(false);
      console.error('Login error:', error);
      return { 
        success: false, 
        error: 'Network error. Please check your connection.' 
      };
    }
  };

  const logout = async () => {
    try {
      // Call backend logout endpoint if user is authenticated
      if (token && user) {
        await fetch(`${API_BASE_URL}/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
      }
    } catch (error) {
      console.error('Logout API call failed:', error);
      // Continue with local logout even if API call fails
    } finally {
      // Clear local state and storage
      setUser(null);
      setToken(null);
      localStorage.removeItem('liquor_pos_user');
      localStorage.removeItem('liquor_pos_token');
      setLoading(false);
    }
  };

  // Fallback to demo credentials if backend is not available
  const loginWithDemo = (username, password) => {
    const credentials = {
      admin: { username: 'admin', password: 'admin123', role: 'ADMIN', name: 'System Administrator', email: 'admin@liquorstore.com' },
      employee1: { username: 'john', password: 'john123', role: 'EMPLOYEE', name: 'John Mwangi', email: 'john@liquorstore.com' },
      employee2: { username: 'mary', password: 'mary123', role: 'EMPLOYEE', name: 'Mary Wanjiku', email: 'mary@liquorstore.com' }
    };

    const user = Object.values(credentials).find(
      cred => cred.username === username && cred.password === password
    );

    if (user) {
      const userData = { ...user };
      delete userData.password; // Don't store password
      
      // Add permissions based on role
      userData.permissions = {
        'can_view_dashboard': userData.role === 'ADMIN',
        'can_manage_users': userData.role === 'ADMIN',
        'can_manage_products': userData.role === 'ADMIN',
        'can_process_sales': true,
        'can_view_reports': userData.role === 'ADMIN',
        'can_manage_inventory': userData.role === 'ADMIN',
      };
      
      setUser(userData);
      localStorage.setItem('liquor_pos_user', JSON.stringify(userData));
      return { 
        success: true, 
        user: userData,
        redirect_url: userData.role === 'ADMIN' ? '/admin' : '/pos'
      };
    }

    return { success: false, error: 'Invalid credentials' };
  };

  const value = {
    user,
    token,
    login,
    loginWithDemo,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
