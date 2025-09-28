import { useState } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import ProductManagement from './ProductManagement';
import AddNewProduct from './AddNewProduct';
import EditProduct from './EditProduct';
import CustomerManagement from './CustomerManagement';
import EmployeeManagement from './EmployeeManagement';
import SalesHistory from './SalesHistory';
import Reports from './Reports';
import { 
  BarChart3, 
  Package, 
  Users, 
  ShoppingCart, 
  UserPlus, 
  LogOut, 
  Menu,
  X,
  TrendingUp,
  DollarSign,
  Package2,
  UserCheck,
  Search,
  Bell
} from 'lucide-react';

// Dashboard Overview Component
const DashboardOverview = () => {
  const { products, sales, customers } = useApp();

  const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0);
  const totalProducts = products.length;
  const totalCustomers = customers.length;
  const totalSales = sales.length;

  const lowStockProducts = products.filter(p => p.status === 'Low Stock').length;
  const outOfStockProducts = products.filter(p => p.status === 'Out of Stock').length;

  const stats = [
    {
      title: 'Total Revenue',
      value: `KSH ${totalRevenue.toLocaleString()}`,
      icon: DollarSign,
      color: 'text-green-400',
      bgColor: 'bg-green-500/20'
    },
    {
      title: 'Total Sales',
      value: totalSales.toLocaleString(),
      icon: ShoppingCart,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/20'
    },
    {
      title: 'Products',
      value: totalProducts.toLocaleString(),
      icon: Package2,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/20'
    },
    {
      title: 'Customers',
      value: totalCustomers.toLocaleString(),
      icon: UserCheck,
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/20'
    }
  ];

  const alerts = [
    ...(lowStockProducts > 0 ? [{
      type: 'warning',
      message: `${lowStockProducts} products are low in stock`
    }] : []),
    ...(outOfStockProducts > 0 ? [{
      type: 'error',
      message: `${outOfStockProducts} products are out of stock`
    }] : [])
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white tracking-tighter font-display">Dashboard</h1>
          <p className="text-white/60 mt-2">Welcome back! Here's what's happening at your liquor store.</p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-white/60">
          <TrendingUp className="h-4 w-4" />
          <span>Last updated: {new Date().toLocaleDateString()}</span>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-3">
          {alerts.map((alert, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border ${
                alert.type === 'warning' 
                  ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
                  : 'bg-red-500/10 border-red-500/20 text-red-400'
              }`}
            >
              <div className="flex items-center">
                {alert.type === 'warning' ? (
                  <TrendingUp className="h-5 w-5 mr-2" />
                ) : (
                  <TrendingUp className="h-5 w-5 mr-2" />
                )}
              {alert.message}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="glassmorphism rounded-lg p-6 border border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm font-medium">{stat.title}</p>
                <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Sales */}
      <div className="glassmorphism rounded-lg border border-white/10">
        <div className="p-6 border-b border-white/10">
          <h2 className="text-xl font-semibold text-white">Recent Sales</h2>
          <p className="text-white/60 text-sm mt-1">Latest transactions from your store</p>
        </div>
        <div className="p-6">
          {sales.length > 0 ? (
            <div className="space-y-4">
              {sales.slice(0, 5).map((sale, index) => (
                <div key={index} className="flex items-center justify-between py-3 border-b border-white/5 last:border-b-0">
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-primary/20 rounded-lg">
                      <ShoppingCart className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-white font-medium">Sale #{sale.id}</p>
                      <p className="text-white/60 text-sm">{new Date(sale.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-semibold">KSH {sale.total.toLocaleString()}</p>
                    <p className="text-white/60 text-sm">{sale.payment_method}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <ShoppingCart className="h-12 w-12 text-white/30 mx-auto mb-4" />
              <p className="text-white/60">No sales data available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const navigation = [
    { name: 'Dashboard', href: '/admin', icon: BarChart3 },
    { name: 'Products', href: '/admin/products', icon: Package },
    { name: 'Sales', href: '/admin/sales', icon: ShoppingCart },
    { name: 'Customers', href: '/admin/customers', icon: Users },
    { name: 'Employees', href: '/admin/employees', icon: UserPlus },
    { name: 'Reports', href: '/admin/reports', icon: TrendingUp },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    // Implement search functionality here
  };

  const isActive = (href) => {
    if (href === '/admin') {
      return location.pathname === '/admin';
    }
    return location.pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-background-dark flex">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-background-dark border-r border-white/10 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-white/10">
          <h1 className="text-xl font-bold text-white font-display">The Vault</h1>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 rounded-md text-white/60 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="mt-8 px-4">
          <div className="space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <a
                  key={item.name}
                  href={item.href}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(item.href);
                    setSidebarOpen(false);
                  }}
                  className={`group flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                    isActive(item.href)
                      ? 'bg-primary text-white'
                      : 'text-white/60 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {item.name}
                </a>
              );
            })}
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Navigation */}
        <header className="bg-background-dark border-b border-white/10">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
            {/* Left side - Mobile menu button */}
            <div className="flex items-center">
            <button
              onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-md text-white/60 hover:text-white"
            >
              <Menu className="h-6 w-6" />
            </button>
            </div>

            {/* Center - Search bar (only show on desktop) */}
            <div className="hidden md:block flex-1 max-w-md mx-8">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/40" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={handleSearch}
                  className="form-input pl-10 pr-4 py-2 w-full rounded-lg focus:ring-primary focus:border-primary"
                />
              </div>
            </div>
            
            {/* Right side - Notifications and profile */}
            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <div className="relative">
                <Bell className="h-5 w-5 text-white/60 hover:text-white cursor-pointer transition-colors" />
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  3
                </span>
              </div>
              
              {/* Profile */}
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-white">{user?.name}</p>
                  <p className="text-xs text-white/60 capitalize">{user?.role}</p>
              </div>
              <div className="h-8 w-8 bg-gradient-to-r from-amber-500 to-orange-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {user?.name?.charAt(0)}
                </span>
              </div>
              </div>
              
              {/* Logout */}
              <button
                onClick={handleLogout}
                className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="Logout"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Routes>
            <Route path="/" element={<DashboardOverview />} />
            <Route path="/products" element={<ProductManagement />} />
            <Route path="/products/add" element={<AddNewProduct />} />
            <Route path="/products/edit/:id" element={<EditProduct />} />
            <Route path="/customers" element={<CustomerManagement />} />
            <Route path="/sales" element={<SalesHistory />} />
            <Route path="/employees" element={<EmployeeManagement />} />
            <Route path="/reports" element={<Reports />} />
          </Routes>
        </main>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default AdminDashboard;