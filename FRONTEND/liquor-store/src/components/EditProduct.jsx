import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import productService from '../services/productService';
import categoryService from '../services/categoryService';

const EditProduct = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    category_id: '',
    barcode: '',
    price: '',
    cost: '',
    stock: '',
    min_stock_level: '10',
    max_stock_level: '100',
    description: '',
    brand: '',
    size: '',
    alcohol_content: '',
    country_of_origin: '',
    supplier: '',
    is_active: true
  });
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingProduct, setLoadingProduct] = useState(true);
  const [errors, setErrors] = useState({});
  const [dragActive, setDragActive] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [existingImage, setExistingImage] = useState(null);
  const [product, setProduct] = useState(null);

  // Load categories and product data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load categories
        const categoriesResult = await categoryService.getCategories();
        if (categoriesResult.success) {
          setCategories(categoriesResult.data);
        }

        // Load product data
        const productResult = await productService.getProduct(id);
        if (productResult.success) {
          const productData = productResult.data;
          setProduct(productData);
          setFormData({
            name: productData.name || '',
            category: productData.category || '',
            category_id: productData.category_id || '',
            barcode: productData.barcode || '',
            price: productData.price ? productData.price.toString() : '',
            cost: productData.cost ? productData.cost.toString() : '',
            stock: productData.stock ? productData.stock.toString() : '',
            min_stock_level: productData.min_stock_level ? productData.min_stock_level.toString() : '10',
            max_stock_level: productData.max_stock_level ? productData.max_stock_level.toString() : '100',
            description: productData.description || '',
            brand: productData.brand || '',
            size: productData.size || '',
            alcohol_content: productData.alcohol_content ? productData.alcohol_content.toString() : '',
            country_of_origin: productData.country_of_origin || '',
            supplier: productData.supplier || '',
            is_active: productData.is_active !== undefined ? productData.is_active : true
          });

          // Set existing image if available
          if (productData.image_url) {
            setExistingImage(productData.image_url);
          }
        } else {
          setErrors({ submit: 'Failed to load product data' });
        }
      } catch (error) {
        console.error('Error loading data:', error);
        setErrors({ submit: 'An error occurred while loading data' });
      } finally {
        setLoadingProduct(false);
      }
    };
    loadData();
  }, [id]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedImage(file);
      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Product name is required';
    }
    
    if (!formData.category) {
      newErrors.category = 'Category is required';
    }
    
    if (!formData.price || parseFloat(formData.price) <= 0) {
      newErrors.price = 'Valid price is required';
    }
    
    if (formData.stock && parseInt(formData.stock) < 0) {
      newErrors.stock = 'Stock quantity cannot be negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    
    try {
      const productData = {
        name: formData.name.trim(),
        category: formData.category,
        category_id: formData.category_id ? parseInt(formData.category_id) : null,
        barcode: formData.barcode.trim() || null,
        price: parseFloat(formData.price),
        cost: parseFloat(formData.cost),
        stock: parseInt(formData.stock) || 0,
        min_stock_level: parseInt(formData.min_stock_level) || 10,
        max_stock_level: parseInt(formData.max_stock_level) || 100,
        description: formData.description.trim() || null,
        brand: formData.brand.trim() || null,
        size: formData.size.trim() || null,
        alcohol_content: formData.alcohol_content ? parseFloat(formData.alcohol_content) : null,
        country_of_origin: formData.country_of_origin.trim() || null,
        supplier: formData.supplier.trim() || null,
        is_active: formData.is_active
      };

      // First update the product
      const result = await productService.updateProduct(id, productData);
      
      if (result.success) {
        // Clear any previous errors
        setErrors({});
        
        // If there's a new image, upload it
        if (selectedImage) {
          try {
            const imageResult = await productService.uploadProductImage(id, selectedImage, true);
            if (!imageResult.success) {
              console.warn('Product updated but image upload failed:', imageResult.error);
            }
          } catch (imageError) {
            console.warn('Product updated but image upload failed:', imageError);
          }
        }
        
        // Navigate back to products page
        navigate('/admin/products');
      } else {
        setErrors({ submit: result.error || 'Failed to update product' });
      }
    } catch (error) {
      setErrors({ submit: 'An error occurred while updating the product' });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/admin/products');
  };

  if (loadingProduct) {
    return (
      <div className="min-h-screen bg-background-dark flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-white/60">Loading product data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-dark dark">
      <div className="max-w-4xl mx-auto p-8">
        {/* Header */}
        <header className="mb-12">
          <h1 className="text-4xl font-bold text-white tracking-tighter font-display">
            Edit Product
          </h1>
          <p className="text-white/60 mt-2">
            Update the product information for {product?.name || 'this product'}.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Form Section */}
            <div className="lg:col-span-2 space-y-6">
              <div className="p-6 rounded-lg glassmorphism border border-white/10">
                <div className="space-y-6">
                  {/* Basic Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-2" htmlFor="name">
                        Product Name *
                      </label>
                      <input
                        className={`form-input w-full px-4 py-3 rounded text-base focus:ring-primary focus:border-primary transition-all duration-300 ${
                          errors.name ? 'border-red-500' : ''
                        }`}
                        id="name"
                        name="name"
                        type="text"
                        placeholder="e.g., Moët & Chandon Impérial"
                        value={formData.name}
                        onChange={handleInputChange}
                      />
                      {errors.name && (
                        <p className="text-red-400 text-sm mt-1">{errors.name}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-2" htmlFor="category">
                        Category *
                      </label>
                      <select
                        className={`form-input form-select w-full px-4 py-3 rounded text-base focus:ring-primary focus:border-primary transition-all duration-300 ${
                          errors.category ? 'border-red-500' : ''
                        }`}
                        id="category"
                        name="category"
                        value={formData.category}
                        onChange={handleInputChange}
                      >
                        <option value="">Select a category</option>
                        {categories.map((category) => (
                          <option key={category.id} value={category.name}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                      {errors.category && (
                        <p className="text-red-400 text-sm mt-1">{errors.category}</p>
                      )}
                    </div>
                  </div>

                  {/* Barcode and Brand */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-2" htmlFor="barcode">
                        Barcode
                      </label>
                      <input
                        className="form-input w-full px-4 py-3 rounded text-base focus:ring-primary focus:border-primary transition-all duration-300"
                        id="barcode"
                        name="barcode"
                        type="text"
                        placeholder="e.g., 1234567890"
                        value={formData.barcode}
                        onChange={handleInputChange}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-2" htmlFor="brand">
                        Brand
                      </label>
                      <input
                        className="form-input w-full px-4 py-3 rounded text-base focus:ring-primary focus:border-primary transition-all duration-300"
                        id="brand"
                        name="brand"
                        type="text"
                        placeholder="e.g., Moët & Chandon"
                        value={formData.brand}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>

                  {/* Pricing */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-2" htmlFor="price">
                        Price *
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-white/50">
                          KSh
                        </span>
                        <input
                          className={`form-input w-full pl-12 pr-4 py-3 rounded text-base font-bold focus:ring-primary focus:border-primary transition-all duration-300 ${
                            errors.price ? 'border-red-500' : ''
                          }`}
                          id="price"
                          name="price"
                          type="number"
                          step="0.01"
                          placeholder="7,500"
                          value={formData.price}
                          onChange={handleInputChange}
                        />
                      </div>
                      {errors.price && (
                        <p className="text-red-400 text-sm mt-1">{errors.price}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-2" htmlFor="stock">
                        Current Stock
                      </label>
                      <input
                        className={`form-input w-full px-4 py-3 rounded text-base focus:ring-primary focus:border-primary transition-all duration-300 ${
                          errors.stock ? 'border-red-500' : ''
                        }`}
                        id="stock"
                        name="stock"
                        type="number"
                        placeholder="50"
                        value={formData.stock}
                        onChange={handleInputChange}
                      />
                      {errors.stock && (
                        <p className="text-red-400 text-sm mt-1">{errors.stock}</p>
                      )}
                    </div>
                  </div>

                  {/* Product Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-2" htmlFor="size">
                        Size
                      </label>
                      <input
                        className="form-input w-full px-4 py-3 rounded text-base focus:ring-primary focus:border-primary transition-all duration-300"
                        id="size"
                        name="size"
                        type="text"
                        placeholder="e.g., 750ml, 1L"
                        value={formData.size}
                        onChange={handleInputChange}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-2" htmlFor="alcohol_content">
                        Alcohol Content (%)
                      </label>
                      <input
                        className="form-input w-full px-4 py-3 rounded text-base focus:ring-primary focus:border-primary transition-all duration-300"
                        id="alcohol_content"
                        name="alcohol_content"
                        type="number"
                        step="0.1"
                        placeholder="40.0"
                        value={formData.alcohol_content}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>

                  {/* Origin and Supplier */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-2" htmlFor="country_of_origin">
                        Country of Origin
                      </label>
                      <input
                        className="form-input w-full px-4 py-3 rounded text-base focus:ring-primary focus:border-primary transition-all duration-300"
                        id="country_of_origin"
                        name="country_of_origin"
                        type="text"
                        placeholder="e.g., France"
                        value={formData.country_of_origin}
                        onChange={handleInputChange}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-2" htmlFor="supplier">
                        Supplier
                      </label>
                      <input
                        className="form-input w-full px-4 py-3 rounded text-base focus:ring-primary focus:border-primary transition-all duration-300"
                        id="supplier"
                        name="supplier"
                        type="text"
                        placeholder="e.g., ABC Distributors"
                        value={formData.supplier}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2" htmlFor="description">
                      Description
                    </label>
                    <textarea
                      className="form-input w-full px-4 py-3 rounded text-base focus:ring-primary focus:border-primary transition-all duration-300"
                      id="description"
                      name="description"
                      rows={4}
                      placeholder="Enter product description..."
                      value={formData.description}
                      onChange={handleInputChange}
                    />
                  </div>

                  {/* Status */}
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="is_active"
                      name="is_active"
                      checked={formData.is_active}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                    />
                    <label htmlFor="is_active" className="ml-2 block text-sm text-white/80">
                      Active (Product is available for sale)
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Image Upload Section */}
            <div className="lg:col-span-1">
              <div className="p-6 rounded-lg glassmorphism border border-white/10 h-full">
                <label className="block text-sm font-medium text-white/80 mb-2 text-center" htmlFor="file-upload">
                  Product Image
                </label>
                <div 
                  className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-lg transition-colors ${
                    dragActive 
                      ? 'border-primary bg-primary/10' 
                      : 'border-white/20'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <div className="space-y-1 text-center">
                    {imagePreview ? (
                      <div className="space-y-2">
                        <img 
                          src={imagePreview} 
                          alt="Preview" 
                          className="mx-auto h-32 w-32 object-cover rounded-lg"
                        />
                        <p className="text-xs text-green-400">
                          {selectedImage?.name}
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedImage(null);
                            setImagePreview(null);
                          }}
                          className="text-xs text-red-400 hover:text-red-300"
                        >
                          Remove image
                        </button>
                      </div>
                    ) : existingImage ? (
                      <div className="space-y-2">
                        <img 
                          src={`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/${existingImage}`} 
                          alt="Current" 
                          className="mx-auto h-32 w-32 object-cover rounded-lg"
                        />
                        <p className="text-xs text-white/60">
                          Current image
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setExistingImage(null);
                            setSelectedImage(null);
                            setImagePreview(null);
                          }}
                          className="text-xs text-red-400 hover:text-red-300"
                        >
                          Remove image
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-5xl text-white/30">
                          cloud_upload
                        </span>
                        <div className="flex text-sm text-white/60">
                          <label 
                            className="relative cursor-pointer rounded-md font-medium text-primary hover:text-primary/80 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-offset-background-dark focus-within:ring-primary"
                            htmlFor="file-upload"
                          >
                            <span>Upload a file</span>
                            <input
                              className="sr-only"
                              id="file-upload"
                              name="file-upload"
                              type="file"
                              accept="image/*"
                              onChange={handleFileChange}
                            />
                          </label>
                          <p className="pl-1">or drag and drop</p>
                        </div>
                        <p className="text-xs text-white/40">PNG, JPG, GIF up to 10MB</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Error */}
          {errors.submit && (
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-red-400 text-sm">{errors.submit}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end items-center gap-4 pt-6">
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
              {loading ? 'Updating...' : 'Update Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProduct;