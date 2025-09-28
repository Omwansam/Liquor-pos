import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CustomerService from '../services/customerService';
import { 
  Users, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar,
  UserCheck,
  UserX,
  Filter,
  X,
  Eye
} from 'lucide-react';

const CustomerManagement = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    category: 'regular'
  });

  // Load customers on component mount
  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const result = await CustomerService.getCustomers();
      if (result.success) {
        setCustomers(result.data);
      } else {
        setError(result.error || 'Failed to load customers');
      }
    } catch (error) {
      setError('An error occurred while loading customers');
    } finally {
      setLoading(false);
    }
  };

  // Filter customers based on search and category
  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customer.phone?.includes(searchTerm);
    const matchesCategory = selectedCategory === 'all' || customer.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Get unique categories
  const categories = ['all', ...new Set(customers.map(c => c.category))];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      let result;
      if (editingCustomer) {
        result = await CustomerService.updateCustomer(editingCustomer.id, formData);
      } else {
        result = await CustomerService.createCustomer(formData);
      }
      
      if (result.success) {
        setShowModal(false);
        setEditingCustomer(null);
        setFormData({ name: '', email: '', phone: '', address: '', category: 'regular' });
        loadCustomers();
      } else {
        setError(result.error || 'Failed to save customer');
      }
    } catch (error) {
      setError('An error occurred while saving customer');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      email: customer.email || '',
      phone: customer.phone || '',
      address: customer.address || '',
      category: customer.category || 'regular'
    });
    setShowModal(true);
  };

  const handleDelete = async (customerId) => {
    if (!window.confirm('Are you sure you want to delete this customer?')) {
      return;
    }
    
    try {
      const result = await CustomerService.deleteCustomer(customerId);
      if (result.success) {
        loadCustomers();
      } else {
        setError(result.error || 'Failed to delete customer');
      }
    } catch (error) {
      setError('An error occurred while deleting customer');
    }
  };

  const handleCancel = () => {
    setShowModal(false);
    setEditingCustomer(null);
    setFormData({ name: '', email: '', phone: '', address: '', category: 'regular' });
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'VIP':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'Regular':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'New':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'VIP':
        return <UserCheck className="h-4 w-4" />;
      case 'Regular':
        return <Users className="h-4 w-4" />;
      case 'New':
        return <UserX className="h-4 w-4" />;
      default:
        return <Users className="h-4 w-4" />;
    }
  };

  if (loading && customers.length === 0) {
    return (
      <div className="min-h-screen bg-background-dark flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-white/60">Loading customers...</p>
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
              Customer Management
            </h1>
            <p className="text-white/60 mt-2">
              Manage your customer database and relationships.
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 flex items-center space-x-2"
          >
            <Plus className="h-5 w-5" />
            <span>Add Customer</span>
          </button>
        </div>

        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          <div className="flex items-center space-x-4">
            {/* Search Bar */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/40" />
              <input
                type="text"
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-input pl-10 pr-4 py-3 w-full rounded-lg focus:ring-primary focus:border-primary"
              />
            </div>

            {/* Filter Toggle */}
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

          {/* Category Filters */}
          {showFilters && (
            <div className="flex items-center space-x-4 overflow-x-auto">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-6 py-3 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                    selectedCategory === category
                      ? 'bg-primary text-white shadow-lg'
                      : 'bg-white/10 text-white/60 hover:bg-white/20 hover:text-white'
                  }`}
                >
                  {category === 'all' ? 'All Customers' : category}
                </button>
              ))}
            </div>
          )}
        </div>

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

        {/* Customers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredCustomers.map((customer) => (
            <div key={customer.id} className="bg-white/5 rounded-xl overflow-hidden hover:bg-white/10 transition-all duration-300 group">
              {/* Customer Header */}
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="h-12 w-12 bg-gradient-to-r from-primary to-purple-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-lg font-bold">
                        {customer.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">{customer.name}</h3>
                      <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium border ${getCategoryColor(customer.category)}`}>
                        {getCategoryIcon(customer.category)}
                        <span>{customer.category}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Action buttons overlay */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(customer)}
                        className="p-2 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30 transition-colors"
                      >
                        <Edit className="h-4 w-4 text-white" />
                      </button>
                      <button
                        onClick={() => handleDelete(customer.id)}
                        className="p-2 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30 transition-colors"
                      >
                        <Trash2 className="h-4 w-4 text-white" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Customer Details */}
                <div className="space-y-3">
                  {customer.email && (
                    <div className="flex items-center space-x-3 text-white/60">
                      <Mail className="h-4 w-4" />
                      <span className="text-sm truncate">{customer.email}</span>
                    </div>
                  )}
                  {customer.phone && (
                    <div className="flex items-center space-x-3 text-white/60">
                      <Phone className="h-4 w-4" />
                      <span className="text-sm">{customer.phone}</span>
                    </div>
                  )}
                  {customer.address && (
                    <div className="flex items-center space-x-3 text-white/60">
                      <MapPin className="h-4 w-4" />
                      <span className="text-sm truncate">{customer.address}</span>
                    </div>
                  )}
                  <div className="flex items-center space-x-3 text-white/60">
                    <Calendar className="h-4 w-4" />
                    <span className="text-sm">Joined {new Date(customer.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredCustomers.length === 0 && (
          <div className="text-center py-12">
            <Users className="h-16 w-16 text-white/30 mx-auto mb-4" />
            <p className="text-white/60">No customers found</p>
            <p className="text-white/40 text-sm">Try adjusting your search or filters</p>
          </div>
        )}
      </div>

      {/* Add/Edit Customer Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-background-dark rounded-lg border border-white/10 w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white">
                  {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
                </h3>
                <button
                  onClick={handleCancel}
                  className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2" htmlFor="name">
                    Customer Name *
                  </label>
                  <input
                    className="form-input w-full px-4 py-3 rounded text-base focus:ring-primary focus:border-primary transition-all duration-300"
                    id="name"
                    name="name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={handleInputChange}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2" htmlFor="email">
                    Email
                  </label>
                  <input
                    className="form-input w-full px-4 py-3 rounded text-base focus:ring-primary focus:border-primary transition-all duration-300"
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2" htmlFor="phone">
                    Phone Number
                  </label>
                  <input
                    className="form-input w-full px-4 py-3 rounded text-base focus:ring-primary focus:border-primary transition-all duration-300"
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleInputChange}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2" htmlFor="address">
                    Address
                  </label>
                  <textarea
                    className="form-input w-full px-4 py-3 rounded text-base focus:ring-primary focus:border-primary transition-all duration-300"
                    id="address"
                    name="address"
                    rows={3}
                    value={formData.address}
                    onChange={handleInputChange}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2" htmlFor="category">
                    Category
                  </label>
                  <select
                    className="form-input form-select w-full px-4 py-3 rounded text-base focus:ring-primary focus:border-primary transition-all duration-300"
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                  >
                    <option value="regular">Regular</option>
                    <option value="VIP">VIP</option>
                    <option value="New">New</option>
                  </select>
                </div>

                <div className="flex justify-end items-center gap-4 pt-4">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="px-6 py-3 rounded-lg text-sm font-bold bg-background-light/80 dark:bg-background-dark/80 text-black dark:text-white hover:bg-background-light dark:hover:bg-background-dark transition-colors shadow-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-3 rounded-lg text-sm font-bold bg-primary text-white hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Saving...' : editingCustomer ? 'Update Customer' : 'Add Customer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerManagement;