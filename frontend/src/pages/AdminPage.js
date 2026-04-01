import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, ShoppingCart, Users, DollarSign, Plus, Pencil, Trash2, ArrowLeft } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Skeleton } from '../components/ui/skeleton';

const API = process.env.REACT_APP_BACKEND_URL;

// Create axios instance with credentials
const api = axios.create({
  baseURL: API,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

const AdminPage = () => {
  const { user, loading: authLoading } = useAuth();
  const { t, getLocalizedName } = useLanguage();
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  // Product form state
  const [productForm, setProductForm] = useState({
    name_en: '', name_ar: '', description_en: '', description_ar: '',
    price: '', category_id: '', image_url: '', stock: '100', featured: false
  });

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      navigate('/');
      return;
    }

    const fetchData = async () => {
      try {
        const [statsRes, productsRes, categoriesRes, ordersRes] = await Promise.all([
          api.get('/api/admin/stats'),
          api.get('/api/products?limit=100'),
          api.get('/api/categories'),
          api.get('/api/admin/orders')
        ]);
        setStats(statsRes.data);
        setProducts(productsRes.data.products);
        setCategories(categoriesRes.data);
        setOrders(ordersRes.data);
      } catch (e) {
        console.error('Failed to fetch admin data:', e);
      } finally {
        setLoading(false);
      }
    };

    if (user?.role === 'admin') {
      fetchData();
    }
  }, [user, authLoading, navigate]);

  const resetProductForm = () => {
    setProductForm({
      name_en: '', name_ar: '', description_en: '', description_ar: '',
      price: '', category_id: '', image_url: '', stock: '100', featured: false
    });
    setEditingProduct(null);
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setProductForm({
      name_en: product.name_en,
      name_ar: product.name_ar,
      description_en: product.description_en,
      description_ar: product.description_ar,
      price: product.price.toString(),
      category_id: product.category_id,
      image_url: product.image_url,
      stock: product.stock.toString(),
      featured: product.featured
    });
    setProductDialogOpen(true);
  };

  const handleSaveProduct = async () => {
    try {
      const data = {
        ...productForm,
        price: parseFloat(productForm.price),
        stock: parseInt(productForm.stock)
      };

      if (editingProduct) {
        await api.put(`/api/admin/products/${editingProduct.id}`, data);
      } else {
        await api.post('/api/admin/products', data);
      }

      // Refresh products
      const { data: productsData } = await api.get('/api/products?limit=100');
      setProducts(productsData.products);
      setProductDialogOpen(false);
      resetProductForm();
    } catch (e) {
      alert(e.response?.data?.detail || 'Failed to save product');
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      await api.delete(`/api/admin/products/${productId}`);
      setProducts(products.filter(p => p.id !== productId));
    } catch (e) {
      alert(e.response?.data?.detail || 'Failed to delete product');
    }
  };

  const handleUpdateOrderStatus = async (orderId, status) => {
    try {
      await api.put(`/api/admin/orders/${orderId}/status?status=${status}`);
      setOrders(orders.map(o => o.id === orderId ? { ...o, status } : o));
    } catch (e) {
      alert(e.response?.data?.detail || 'Failed to update order');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Skeleton className="h-8 w-48 mb-8" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/')} data-testid="admin-back-btn">
              <ArrowLeft className="me-2 h-4 w-4 rtl:rotate-180" />
              Back
            </Button>
            <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight">{t('dashboard')}</h1>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white border border-gray-200 rounded-xl p-6" data-testid="stat-revenue">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <span className="text-sm text-gray-500">{t('totalRevenue')}</span>
            </div>
            <p className="text-2xl font-bold">${stats?.total_revenue?.toFixed(2) || '0.00'}</p>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-xl p-6" data-testid="stat-orders">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <ShoppingCart className="h-5 w-5 text-blue-600" />
              </div>
              <span className="text-sm text-gray-500">{t('totalOrders')}</span>
            </div>
            <p className="text-2xl font-bold">{stats?.total_orders || 0}</p>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-xl p-6" data-testid="stat-products">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Package className="h-5 w-5 text-purple-600" />
              </div>
              <span className="text-sm text-gray-500">{t('totalProducts')}</span>
            </div>
            <p className="text-2xl font-bold">{stats?.total_products || 0}</p>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-xl p-6" data-testid="stat-users">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Users className="h-5 w-5 text-orange-600" />
              </div>
              <span className="text-sm text-gray-500">{t('totalUsers')}</span>
            </div>
            <p className="text-2xl font-bold">{stats?.total_users || 0}</p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="products" className="space-y-6">
          <TabsList>
            <TabsTrigger value="products" data-testid="tab-products">{t('manageProducts')}</TabsTrigger>
            <TabsTrigger value="orders" data-testid="tab-orders">{t('manageOrders')}</TabsTrigger>
          </TabsList>

          {/* Products Tab */}
          <TabsContent value="products">
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="font-medium">{t('manageProducts')}</h2>
                <Dialog open={productDialogOpen} onOpenChange={(open) => { setProductDialogOpen(open); if (!open) resetProductForm(); }}>
                  <DialogTrigger asChild>
                    <Button className="bg-black text-white hover:bg-gray-800 rounded-full" data-testid="add-product-btn">
                      <Plus className="me-2 h-4 w-4" />
                      {t('addProduct')}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{editingProduct ? t('editProduct') : t('addProduct')}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Name (English)</Label>
                          <Input
                            value={productForm.name_en}
                            onChange={(e) => setProductForm({ ...productForm, name_en: e.target.value })}
                            data-testid="product-name-en"
                          />
                        </div>
                        <div>
                          <Label>Name (Arabic)</Label>
                          <Input
                            value={productForm.name_ar}
                            onChange={(e) => setProductForm({ ...productForm, name_ar: e.target.value })}
                            data-testid="product-name-ar"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Description (English)</Label>
                          <Textarea
                            value={productForm.description_en}
                            onChange={(e) => setProductForm({ ...productForm, description_en: e.target.value })}
                            data-testid="product-desc-en"
                          />
                        </div>
                        <div>
                          <Label>Description (Arabic)</Label>
                          <Textarea
                            value={productForm.description_ar}
                            onChange={(e) => setProductForm({ ...productForm, description_ar: e.target.value })}
                            data-testid="product-desc-ar"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label>Price ($)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={productForm.price}
                            onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                            data-testid="product-price"
                          />
                        </div>
                        <div>
                          <Label>Stock</Label>
                          <Input
                            type="number"
                            value={productForm.stock}
                            onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })}
                            data-testid="product-stock"
                          />
                        </div>
                        <div>
                          <Label>Category</Label>
                          <Select value={productForm.category_id} onValueChange={(v) => setProductForm({ ...productForm, category_id: v })}>
                            <SelectTrigger data-testid="product-category">
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map((cat) => (
                                <SelectItem key={cat.id} value={cat.id}>{getLocalizedName(cat)}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <Label>Image URL</Label>
                        <Input
                          value={productForm.image_url}
                          onChange={(e) => setProductForm({ ...productForm, image_url: e.target.value })}
                          data-testid="product-image"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={productForm.featured}
                          onCheckedChange={(checked) => setProductForm({ ...productForm, featured: checked })}
                          data-testid="product-featured"
                        />
                        <Label>Featured Product</Label>
                      </div>
                      <Button onClick={handleSaveProduct} className="bg-black text-white hover:bg-gray-800" data-testid="save-product-btn">
                        {t('save')}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              
              <div className="divide-y divide-gray-200">
                {products.map((product) => (
                  <div key={product.id} className="p-4 flex items-center gap-4" data-testid={`admin-product-${product.id}`}>
                    <img
                      src={product.image_url}
                      alt={product.name_en}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate text-start">{getLocalizedName(product)}</h3>
                      <p className="text-sm text-gray-500">${product.price.toFixed(2)} • Stock: {product.stock}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditProduct(product)}
                        data-testid={`edit-product-${product.id}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:text-red-600"
                        onClick={() => handleDeleteProduct(product.id)}
                        data-testid={`delete-product-${product.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders">
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <h2 className="font-medium">{t('manageOrders')}</h2>
              </div>
              
              <div className="divide-y divide-gray-200">
                {orders.length === 0 ? (
                  <p className="p-8 text-center text-gray-500">{t('noOrders')}</p>
                ) : (
                  orders.map((order) => (
                    <div key={order.id} className="p-4" data-testid={`admin-order-${order.id}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="font-medium">{t('orderNumber')}{order.id.slice(-8).toUpperCase()}</span>
                          <span className="text-sm text-gray-500 ms-2">{order.user_email}</span>
                        </div>
                        <span className="font-bold">${order.total.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-500">
                          {new Date(order.created_at).toLocaleDateString()} • {order.items.length} items
                        </p>
                        <Select value={order.status} onValueChange={(v) => handleUpdateOrderStatus(order.id, v)}>
                          <SelectTrigger className="w-32" data-testid={`order-status-${order.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="confirmed">Confirmed</SelectItem>
                            <SelectItem value="shipped">Shipped</SelectItem>
                            <SelectItem value="delivered">Delivered</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminPage;
