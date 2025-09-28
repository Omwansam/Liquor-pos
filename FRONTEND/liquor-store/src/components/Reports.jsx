import { useState, useEffect } from 'react';
import SalesService from '../services/salesService';
import ProductService from '../services/productService';
import CustomerService from '../services/customerService';
import { 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Package,
  Users,
  Calendar,
  Download,
  BarChart3,
  PieChart,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  X,
  ChevronDown
} from 'lucide-react';

const Reports = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [salesData, setSalesData] = useState([]);
  const [productsData, setProductsData] = useState([]);
  const [customersData, setCustomersData] = useState([]);
  const [dateRange, setDateRange] = useState('week');
  const [reportType, setReportType] = useState('overview');
  const [showFilters, setShowFilters] = useState(false);

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [salesResult, productsResult, customersResult] = await Promise.all([
        SalesService.getSales(),
        ProductService.getProducts(),
        CustomerService.getCustomers()
      ]);

      if (salesResult.success) {
        setSalesData(salesResult.data);
      }
      if (productsResult.success) {
        setProductsData(productsResult.data);
      }
      if (customersResult.success) {
        setCustomersData(customersResult.data);
      }
    } catch (error) {
      setError('Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  // Calculate filtered data based on date range
  const getFilteredData = () => {
    const now = new Date();
    let startDate;

    switch (dateRange) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'quarter':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(0);
    }

    return salesData.filter(sale => new Date(sale.created_at) >= startDate);
  };

  const filteredSales = getFilteredData();

  // Calculate key metrics
  const metrics = {
    totalRevenue: filteredSales.reduce((sum, sale) => sum + sale.total, 0),
    totalSales: filteredSales.length,
    averageOrderValue: filteredSales.length > 0 ? filteredSales.reduce((sum, sale) => sum + sale.total, 0) / filteredSales.length : 0,
    totalProducts: productsData.length,
    totalCustomers: customersData.length,
    lowStockProducts: productsData.filter(p => p.stock <= p.min_stock_level).length,
    outOfStockProducts: productsData.filter(p => p.stock === 0).length
  };

  // Calculate revenue by payment method
  const revenueByPaymentMethod = filteredSales.reduce((acc, sale) => {
    const method = sale.payment_method.toLowerCase();
    acc[method] = (acc[method] || 0) + sale.total;
    return acc;
  }, {});

  // Calculate top selling products
  const productSales = {};
  filteredSales.forEach(sale => {
    sale.items?.forEach(item => {
      const productId = item.product_id;
      if (!productSales[productId]) {
        productSales[productId] = {
          name: item.product_name,
          quantity: 0,
          revenue: 0
        };
      }
      productSales[productId].quantity += item.quantity;
      productSales[productId].revenue += item.price * item.quantity;
    });
  });

  const topProducts = Object.values(productSales)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // Calculate daily revenue for the selected period
  const dailyRevenue = {};
  filteredSales.forEach(sale => {
    const date = new Date(sale.created_at).toDateString();
    dailyRevenue[date] = (dailyRevenue[date] || 0) + sale.total;
  });

  const dailyRevenueArray = Object.entries(dailyRevenue)
    .map(([date, revenue]) => ({ date, revenue }))
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const exportReport = () => {
    const reportData = {
      period: dateRange,
      generated: new Date().toISOString(),
      metrics,
      topProducts,
      revenueByPaymentMethod,
      dailyRevenue: dailyRevenueArray
    };

    const dataStr = JSON.stringify(reportData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `liquor-store-report-${dateRange}-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getGrowthIndicator = (current, previous) => {
    if (previous === 0) return { value: 0, isPositive: true, icon: ArrowUpRight, color: 'text-green-400' };
    const growth = ((current - previous) / previous) * 100;
    return {
      value: Math.abs(growth),
      isPositive: growth >= 0,
      icon: growth >= 0 ? ArrowUpRight : ArrowDownRight,
      color: growth >= 0 ? 'text-green-400' : 'text-red-400'
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background-dark flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-white/60">Generating reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-dark">
      {/* Header */}
      <div className="px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white tracking-tighter font-display">
              Reports & Analytics
            </h1>
            <p className="text-white/60 mt-2">
              Comprehensive insights into your liquor store performance.
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={exportReport}
              className="bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 flex items-center space-x-2"
            >
              <Download className="h-5 w-5" />
              <span>Export Report</span>
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-3 rounded-lg transition-colors ${
                showFilters 
                  ? 'bg-primary text-white' 
                  : 'bg-white/10 text-white/60 hover:bg-white/20 hover:text-white'
              }`}
            >
              <Filter className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mb-8 p-6 glassmorphism rounded-lg border border-white/10">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-4">
                <label className="text-white/80 text-sm font-medium">Period:</label>
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="form-input form-select px-4 py-2 rounded-lg focus:ring-primary focus:border-primary"
                >
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                  <option value="quarter">This Quarter</option>
                  <option value="year">This Year</option>
                </select>
              </div>
              <div className="flex items-center space-x-4">
                <label className="text-white/80 text-sm font-medium">Report Type:</label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="form-input form-select px-4 py-2 rounded-lg focus:ring-primary focus:border-primary"
                >
                  <option value="overview">Overview</option>
                  <option value="sales">Sales Analysis</option>
                  <option value="products">Product Performance</option>
                  <option value="customers">Customer Insights</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg mb-6">
            <div className="flex items-center justify-between">
              <span className="text-sm">{error}</span>
              <button
                onClick={() => setError(null)}
                className="ml-2 text-red-400 hover:text-red-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
          <div className="glassmorphism rounded-lg p-6 border border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm font-medium">Total Revenue</p>
                <p className="text-2xl font-bold text-white mt-1">KSH {metrics.totalRevenue.toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-lg bg-green-500/20">
                <DollarSign className="h-6 w-6 text-green-400" />
              </div>
            </div>
          </div>

          <div className="glassmorphism rounded-lg p-6 border border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm font-medium">Total Sales</p>
                <p className="text-2xl font-bold text-white mt-1">{metrics.totalSales}</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-500/20">
                <ShoppingCart className="h-6 w-6 text-blue-400" />
              </div>
            </div>
          </div>

          <div className="glassmorphism rounded-lg p-6 border border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm font-medium">Avg Order Value</p>
                <p className="text-2xl font-bold text-white mt-1">KSH {metrics.averageOrderValue.toFixed(2)}</p>
              </div>
              <div className="p-3 rounded-lg bg-purple-500/20">
                <TrendingUp className="h-6 w-6 text-purple-400" />
              </div>
            </div>
          </div>

          <div className="glassmorphism rounded-lg p-6 border border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm font-medium">Total Products</p>
                <p className="text-2xl font-bold text-white mt-1">{metrics.totalProducts}</p>
              </div>
              <div className="p-3 rounded-lg bg-orange-500/20">
                <Package className="h-6 w-6 text-orange-400" />
              </div>
            </div>
          </div>

          <div className="glassmorphism rounded-lg p-6 border border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm font-medium">Total Customers</p>
                <p className="text-2xl font-bold text-white mt-1">{metrics.totalCustomers}</p>
              </div>
              <div className="p-3 rounded-lg bg-pink-500/20">
                <Users className="h-6 w-6 text-pink-400" />
              </div>
            </div>
          </div>

          <div className="glassmorphism rounded-lg p-6 border border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm font-medium">Low Stock</p>
                <p className="text-2xl font-bold text-white mt-1">{metrics.lowStockProducts}</p>
              </div>
              <div className="p-3 rounded-lg bg-yellow-500/20">
                <Activity className="h-6 w-6 text-yellow-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Revenue by Payment Method */}
          <div className="glassmorphism rounded-lg p-6 border border-white/10">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">Revenue by Payment Method</h3>
              <PieChart className="h-5 w-5 text-white/60" />
            </div>
            <div className="space-y-4">
              {Object.entries(revenueByPaymentMethod).map(([method, revenue]) => {
                const percentage = (revenue / metrics.totalRevenue) * 100;
                const colors = {
                  cash: 'bg-green-500',
                  card: 'bg-blue-500',
                  mpesa: 'bg-orange-500'
                };
                return (
                  <div key={method} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-white/80 capitalize">{method}</span>
                      <span className="text-white">KSH {revenue.toLocaleString()} ({percentage.toFixed(1)}%)</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${colors[method] || 'bg-gray-500'}`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top Selling Products */}
          <div className="glassmorphism rounded-lg p-6 border border-white/10">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">Top Selling Products</h3>
              <BarChart3 className="h-5 w-5 text-white/60" />
            </div>
            <div className="space-y-4">
              {topProducts.map((product, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                      <span className="text-primary text-sm font-bold">{index + 1}</span>
                    </div>
                    <div>
                      <p className="text-white font-medium">{product.name}</p>
                      <p className="text-white/60 text-sm">Qty: {product.quantity}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-semibold">KSH {product.revenue.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Daily Revenue Trend */}
        <div className="glassmorphism rounded-lg p-6 border border-white/10">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white">Daily Revenue Trend</h3>
            <TrendingUp className="h-5 w-5 text-white/60" />
          </div>
          <div className="space-y-4">
            {dailyRevenueArray.length > 0 ? (
              dailyRevenueArray.map((day, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-4 w-4 text-white/60" />
                    <span className="text-white/80">{new Date(day.date).toLocaleDateString()}</span>
                  </div>
                  <span className="text-white font-semibold">KSH {day.revenue.toLocaleString()}</span>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <BarChart3 className="h-12 w-12 text-white/30 mx-auto mb-4" />
                <p className="text-white/60">No sales data available for the selected period</p>
              </div>
            )}
          </div>
        </div>

        {/* Stock Alerts */}
        {(metrics.lowStockProducts > 0 || metrics.outOfStockProducts > 0) && (
          <div className="glassmorphism rounded-lg p-6 border border-white/10 mt-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">Stock Alerts</h3>
              <Activity className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {metrics.lowStockProducts > 0 && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-yellow-500/20 rounded-lg">
                      <TrendingDown className="h-5 w-5 text-yellow-400" />
                    </div>
                    <div>
                      <p className="text-yellow-400 font-medium">Low Stock Products</p>
                      <p className="text-white/60 text-sm">{metrics.lowStockProducts} products need restocking</p>
                    </div>
                  </div>
                </div>
              )}
              {metrics.outOfStockProducts > 0 && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-red-500/20 rounded-lg">
                      <TrendingDown className="h-5 w-5 text-red-400" />
                    </div>
                    <div>
                      <p className="text-red-400 font-medium">Out of Stock Products</p>
                      <p className="text-white/60 text-sm">{metrics.outOfStockProducts} products are out of stock</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;