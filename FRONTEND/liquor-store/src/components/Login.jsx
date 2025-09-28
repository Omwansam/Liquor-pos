import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Lock, User, Eye, EyeOff, Zap } from 'lucide-react';
import loginImage from '../assets/login_image.png';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await login(username, password);
      
      if (result.success) {
        // Navigate to the appropriate dashboard based on user role
        const redirectUrl = result.redirect_url || (result.user.role === 'ADMIN' ? '/admin' : '/pos');
        navigate(redirectUrl, { replace: true });
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      console.error('Login error:', err);
    }
    
    setLoading(false);
  };

  return (
    <div className="relative min-h-screen w-full">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(${loginImage})`,
          filter: 'blur(2px)'
        }}
      />
      
      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-black/50" />
      
      {/* Main Content */}
      <div className="relative flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8">
          {/* Glassmorphic Login Form */}
          <div 
            className="rounded-xl p-8 transition-all duration-300"
            style={{
              background: 'rgba(16, 19, 34, 0.6)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}
          >
          {/* Header */}
            <div className="text-center mb-8">
              <div className="mx-auto h-16 w-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4 shadow-lg shadow-blue-500/25">
                <Zap className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-white">Welcome Back</h1>
              <p className="text-white/70 mt-2">Enter your credentials to access the system</p>
          </div>

          {/* Login Form */}
            <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
                <div 
                  className="rounded-lg p-4 border"
                  style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    borderColor: 'rgba(239, 68, 68, 0.3)',
                    backdropFilter: 'blur(10px)'
                  }}
                >
                  <div className="flex items-center text-red-200">
                    <div className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse" />
                {error}
                  </div>
              </div>
            )}

              {/* Username Field */}
              <div>
                <label className="sr-only" htmlFor="username">Username</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-white/50" />
                  </div>
                  <input
                    className="w-full rounded-lg border-none bg-white/10 p-4 pl-12 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-all duration-300"
                    id="username"
                    name="username"
                    placeholder="Username"
                    required
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label className="sr-only" htmlFor="password">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-white/50" />
                  </div>
                  <input
                    className="w-full rounded-lg border-none bg-white/10 p-4 pl-12 pr-12 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-all duration-300"
                    id="password"
                    name="password"
                    placeholder="Password"
                    required
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-white/50 hover:text-white/70 transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
              </div>
            </div>

              {/* Login Button */}
              <div>
            <button
                  className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background-dark focus:ring-blue-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              type="submit"
              disabled={loading}
                  style={{
                    boxShadow: '0 0 5px #3b82f6, 0 0 10px rgba(59, 130, 246, 0.5), 0 0 20px rgba(59, 130, 246, 0.3)'
                  }}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      Log In
                    </>
                  )}
            </button>
              </div>
          </form>

          </div>

          {/* Role Badge (Hidden by default, can be shown on successful login) */}
          <div className="absolute top-8 right-8 opacity-0 translate-y-4 transition-all duration-500 ease-out">
            <div 
              className="rounded-full px-4 py-2 flex items-center space-x-2"
              style={{
                background: 'rgba(16, 19, 34, 0.6)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}
            >
              <span 
                className="w-3 h-3 bg-teal-400 rounded-full"
                style={{
                  boxShadow: '0 0 5px #14b8a6, 0 0 10px rgba(20, 184, 166, 0.5), 0 0 20px rgba(20, 184, 166, 0.3)'
                }}
              />
              <span className="text-sm font-medium text-white">Manager</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;