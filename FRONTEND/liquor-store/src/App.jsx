import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AppProvider } from './contexts/AppContext';
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import EmployeePOS from './components/EmployeePOS';
import SaleReceipt from './components/SaleReceipt';
import SalesHistory from './components/SalesHistory';
import LoadingSpinner from './components/LoadingSpinner';

const ProtectedRoute = ({ children, requiredRoles, requiredPermission }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check role-based access
  if (requiredRoles && !requiredRoles.includes(user.role)) {
    // Redirect to appropriate dashboard based on user role
    const redirectPath = user.role === 'ADMIN' || user.role === 'MANAGER' ? '/admin' : '/pos';
    return <Navigate to={redirectPath} replace />;
  }

  // Check permission-based access
  if (requiredPermission && !user.permissions?.[requiredPermission]) {
    const redirectPath = user.role === 'ADMIN' || user.role === 'MANAGER' ? '/admin' : '/pos';
    return <Navigate to={redirectPath} replace />;
  }

  return children;
};

const AppRoutes = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  // Helper function to get redirect path based on user role
  const getRedirectPath = (userRole) => {
    if (!userRole) return '/login';
    return ['ADMIN', 'MANAGER'].includes(userRole) ? '/admin' : '/pos';
  };

  return (
    <Routes>
      <Route 
        path="/login" 
        element={user ? <Navigate to={getRedirectPath(user.role)} replace /> : <Login />} 
      />
      <Route 
        path="/admin/*" 
        element={
          <ProtectedRoute requiredRoles={['ADMIN', 'MANAGER']} requiredPermission="can_view_dashboard">
            <AdminDashboard />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/pos" 
        element={
          <ProtectedRoute requiredPermission="can_process_sales">
            <EmployeePOS />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/pos/sales" 
        element={
          <ProtectedRoute requiredPermission="can_process_sales">
            <SalesHistory />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/pos/receipt/:saleId" 
        element={
          <ProtectedRoute requiredPermission="can_process_sales">
            <SaleReceipt />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/" 
        element={<Navigate to={user ? getRedirectPath(user.role) : '/login'} replace />} 
      />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <Router>
          <div className="min-h-screen bg-background-dark w-screen overflow-x-hidden dark">
            <AppRoutes />
          </div>
        </Router>
      </AppProvider>
    </AuthProvider>
  );
}

export default App;
