import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, ShoppingCart, Users, DollarSign, Plus, Pencil, Trash2, ArrowLeft, Tag, Truck, Image } from 'lucide-react';
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
  const { t, lang, getLocalizedName } = useLanguage();
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [orders, setOrders] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [couponDialogOpen, setCouponDialogOpen] = useState(false);
  const [bannerDialogOpen, setBannerDialogOpen] = useState(false);
  const [trackingDialogOpen, setTrackingDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Product form state
  const [productForm, setProductForm] = useState({
    name_en: '', name_ar: '', description_en: '', description_ar: '',
    price: '', category_id: '', image_url: '', stock: '100', featured: false
  });

  // Coupon form state
  const [couponForm, setCouponForm] = useState({
    code: '', discount_type: 'percentage', discount_value: '', min_order: '0', max_uses: '100'
  });

  // Tracking form state
  const [trackingForm, setTrackingForm] = useState({
    status: '', tracking_number: '', tracking_url: ''
  });

  // Banner form state
  const [bannerForm, setBannerForm] = useState({
    title_en: '', title_ar: '', subtitle_en: '', subtitle_ar: '',
    image_url: '', link_url: '', is_active: true, position: 0
  });

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      navigate('/');
      return;
    }

    const fetchData = async () => {
      try {
        const [statsRes, productsRes, categoriesRes, ordersRes, couponsRes, bannersRes] = await Promise.all([
          api.get('/api/admin/stats'),
          api.get('/api/products?limit=100'),
          api.get('/api/categories'),
          api.get('/api/admin/orders'),
          api.get('/api/coupons'),
          api.get('/api/admin/banners')
        ]);
        setStats(statsRes.data);
        setProducts(productsRes.data.products);
        setCategories(categoriesRes.data);
        setOrders(ordersRes.data);
        setCoupons(couponsRes.data);
        setBanners(bannersRes.data);
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

  const handleOpenTrackingDialog = (order) => {
    setSelectedOrder(order);
    setTrackingForm({
      status: order.status,
      tracking_number: order.tracking_number || '',
      tracking_url: order.tracking_url || ''
    });
    setTrackingDialogOpen(true);
  };

  const handleSaveTracking = async () => {
    if (!selectedOrder) return;
    try {
      await api.put(`/api/admin/orders/${selectedOrder.id}/status?status=${trackingForm.status}&tracking_number=${trackingForm.tracking_number}&tracking_url=${encodeURIComponent(trackingForm.tracking_url)}`);
      setOrders(orders.map(o => o.id === selectedOrder.id ? { 
        ...o, 
        status: trackingForm.status,
        tracking_number: trackingForm.tracking_number,
        tracking_url: trackingForm.tracking_url
      } : o));
      setTrackingDialogOpen(false);
    } catch (e) {
      alert(e.response?.data?.detail || 'Failed to update tracking');
    }
  };

  const handleCreateCoupon = async () => {
    try {
      const data = {
        code: couponForm.code,
        discount_type: couponForm.discount_type,
        discount_value: parseFloat(couponForm.discount_value),
        min_order: parseFloat(couponForm.min_order) || 0,
        max_uses: parseInt(couponForm.max_uses) || 100
      };
      const { data: newCoupon } = await api.post('/api/admin/coupons', data);
      setCoupons([...coupons, { ...data, id: newCoupon.id, used_count: 0, is_active: true }]);
      setCouponDialogOpen(false);
      setCouponForm({ code: '', discount_type: 'percentage', discount_value: '', min_order: '0', max_uses: '100' });
    } catch (e) {
      alert(e.response?.data?.detail || 'Failed to create coupon');
    }
  };

  const handleDeleteCoupon = async (couponId) => {
    if (!confirm('Are you sure you want to delete this coupon?')) return;
    try {
      await api.delete(`/api/admin/coupons/${couponId}`);
      setCoupons(coupons.filter(c => c.id !== couponId));
    } catch (e) {
      alert(e.response?.data?.detail || 'Failed to delete coupon');
    }
  };

  const handleCreateBanner = async () => {
    try {
      const { data: newBanner } = await api.post('/api/admin/banners', bannerForm);
      setBanners([...banners, { ...bannerForm, id: newBanner.id }]);
      setBannerDialogOpen(false);
      setBannerForm({ title_en: '', title_ar: '', subtitle_en: '', subtitle_ar: '', image_url: '', link_url: '', is_active: true, position: 0 });
    } catch (e) {
      alert(e.response?.data?.detail || 'Failed to create banner');
    }
  };

  const handleDeleteBanner = async (bannerId) => {
    if (!confirm('Are you sure you want to delete this banner?')) return;
    try {
      await api.delete(`/api/admin/banners/${bannerId}`);
      setBanners(banners.filter(b => b.id !== bannerId));
    } catch (e) {
      alert(e.response?.data?.detail || 'Failed to delete banner');
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
            <TabsTrigger value="coupons" data-testid="tab-coupons">{lang === 'ar' ? 'الكوبونات' : 'Coupons'}</TabsTrigger>
            <TabsTrigger value="banners" data-testid="tab-banners">{lang === 'ar' ? 'البانرات' : 'Banners'}</TabsTrigger>
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
                          {order.tracking_number && <span className="ms-2 text-blue-600">• {lang === 'ar' ? 'تم الشحن' : 'Shipped'}</span>}
                        </p>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenTrackingDialog(order)}
                            data-testid={`tracking-btn-${order.id}`}
                          >
                            <Truck className="h-4 w-4 me-1" />
                            {lang === 'ar' ? 'تتبع' : 'Track'}
                          </Button>
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
                    </div>
                  ))
                )}
              </div>
            </div>
          </TabsContent>

          {/* Coupons Tab */}
          <TabsContent value="coupons">
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="font-medium">{lang === 'ar' ? 'إدارة الكوبونات' : 'Manage Coupons'}</h2>
                <Dialog open={couponDialogOpen} onOpenChange={setCouponDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-black text-white hover:bg-gray-800 rounded-full" data-testid="add-coupon-btn">
                      <Plus className="me-2 h-4 w-4" />
                      {lang === 'ar' ? 'إضافة كوبون' : 'Add Coupon'}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{lang === 'ar' ? 'إضافة كوبون جديد' : 'Add New Coupon'}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div>
                        <Label>{lang === 'ar' ? 'كود الكوبون' : 'Coupon Code'}</Label>
                        <Input
                          value={couponForm.code}
                          onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })}
                          placeholder="e.g., SAVE20"
                          data-testid="coupon-code-input"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>{lang === 'ar' ? 'نوع الخصم' : 'Discount Type'}</Label>
                          <Select value={couponForm.discount_type} onValueChange={(v) => setCouponForm({ ...couponForm, discount_type: v })}>
                            <SelectTrigger data-testid="coupon-type-select">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="percentage">{lang === 'ar' ? 'نسبة مئوية' : 'Percentage'}</SelectItem>
                              <SelectItem value="fixed">{lang === 'ar' ? 'مبلغ ثابت' : 'Fixed Amount'}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>{lang === 'ar' ? 'قيمة الخصم' : 'Discount Value'}</Label>
                          <Input
                            type="number"
                            value={couponForm.discount_value}
                            onChange={(e) => setCouponForm({ ...couponForm, discount_value: e.target.value })}
                            placeholder={couponForm.discount_type === 'percentage' ? '20' : '50'}
                            data-testid="coupon-value-input"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>{lang === 'ar' ? 'الحد الأدنى للطلب ($)' : 'Min Order ($)'}</Label>
                          <Input
                            type="number"
                            value={couponForm.min_order}
                            onChange={(e) => setCouponForm({ ...couponForm, min_order: e.target.value })}
                            data-testid="coupon-min-order"
                          />
                        </div>
                        <div>
                          <Label>{lang === 'ar' ? 'الحد الأقصى للاستخدام' : 'Max Uses'}</Label>
                          <Input
                            type="number"
                            value={couponForm.max_uses}
                            onChange={(e) => setCouponForm({ ...couponForm, max_uses: e.target.value })}
                            data-testid="coupon-max-uses"
                          />
                        </div>
                      </div>
                      <Button onClick={handleCreateCoupon} className="bg-black text-white hover:bg-gray-800" data-testid="save-coupon-btn">
                        {t('save')}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              
              <div className="divide-y divide-gray-200">
                {coupons.length === 0 ? (
                  <p className="p-8 text-center text-gray-500">{lang === 'ar' ? 'لا توجد كوبونات' : 'No coupons yet'}</p>
                ) : (
                  coupons.map((coupon) => (
                    <div key={coupon.id} className="p-4 flex items-center justify-between" data-testid={`coupon-${coupon.id}`}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-rose-100 rounded-lg flex items-center justify-center">
                          <Tag className="h-5 w-5 text-rose-600" />
                        </div>
                        <div>
                          <p className="font-medium">{coupon.code}</p>
                          <p className="text-sm text-gray-500">
                            {coupon.discount_type === 'percentage' ? `${coupon.discount_value}%` : `$${coupon.discount_value}`} off
                            {coupon.min_order > 0 && ` • Min $${coupon.min_order}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-500">
                          {coupon.used_count || 0}/{coupon.max_uses} {lang === 'ar' ? 'استخدام' : 'uses'}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:text-red-600"
                          onClick={() => handleDeleteCoupon(coupon.id)}
                          data-testid={`delete-coupon-${coupon.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </TabsContent>

          {/* Banners Tab */}
          <TabsContent value="banners">
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="font-medium">{lang === 'ar' ? 'إدارة البانرات' : 'Manage Banners'}</h2>
                <Dialog open={bannerDialogOpen} onOpenChange={setBannerDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-black text-white hover:bg-gray-800 rounded-full" data-testid="add-banner-btn">
                      <Plus className="me-2 h-4 w-4" />
                      {lang === 'ar' ? 'إضافة بانر' : 'Add Banner'}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>{lang === 'ar' ? 'إضافة بانر جديد' : 'Add New Banner'}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Title (English)</Label>
                          <Input
                            value={bannerForm.title_en}
                            onChange={(e) => setBannerForm({ ...bannerForm, title_en: e.target.value })}
                            data-testid="banner-title-en"
                          />
                        </div>
                        <div>
                          <Label>Title (Arabic)</Label>
                          <Input
                            value={bannerForm.title_ar}
                            onChange={(e) => setBannerForm({ ...bannerForm, title_ar: e.target.value })}
                            data-testid="banner-title-ar"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Subtitle (English)</Label>
                          <Input
                            value={bannerForm.subtitle_en}
                            onChange={(e) => setBannerForm({ ...bannerForm, subtitle_en: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Subtitle (Arabic)</Label>
                          <Input
                            value={bannerForm.subtitle_ar}
                            onChange={(e) => setBannerForm({ ...bannerForm, subtitle_ar: e.target.value })}
                          />
                        </div>
                      </div>
                      <div>
                        <Label>Image URL</Label>
                        <Input
                          value={bannerForm.image_url}
                          onChange={(e) => setBannerForm({ ...bannerForm, image_url: e.target.value })}
                          placeholder="https://..."
                          data-testid="banner-image-url"
                        />
                      </div>
                      <div>
                        <Label>Link URL</Label>
                        <Input
                          value={bannerForm.link_url}
                          onChange={(e) => setBannerForm({ ...bannerForm, link_url: e.target.value })}
                          placeholder="/products or /products?category=..."
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={bannerForm.is_active}
                          onCheckedChange={(checked) => setBannerForm({ ...bannerForm, is_active: checked })}
                        />
                        <Label>Active</Label>
                      </div>
                      <Button onClick={handleCreateBanner} className="bg-black text-white hover:bg-gray-800" data-testid="save-banner-btn">
                        {t('save')}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              
              <div className="divide-y divide-gray-200">
                {banners.length === 0 ? (
                  <p className="p-8 text-center text-gray-500">{lang === 'ar' ? 'لا توجد بانرات' : 'No banners yet'}</p>
                ) : (
                  banners.map((banner) => (
                    <div key={banner.id} className="p-4 flex items-center gap-4" data-testid={`banner-${banner.id}`}>
                      <div className="w-32 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                        <img
                          src={banner.image_url}
                          alt={banner.title_en}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{lang === 'ar' ? banner.title_ar : banner.title_en}</p>
                        <p className="text-sm text-gray-500 truncate">
                          {lang === 'ar' ? banner.subtitle_ar : banner.subtitle_en}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${banner.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {banner.is_active ? 'Active' : 'Inactive'}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:text-red-600"
                          onClick={() => handleDeleteBanner(banner.id)}
                          data-testid={`delete-banner-${banner.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Tracking Dialog */}
        <Dialog open={trackingDialogOpen} onOpenChange={setTrackingDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{lang === 'ar' ? 'تحديث معلومات التتبع' : 'Update Tracking Info'}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div>
                <Label>{lang === 'ar' ? 'حالة الطلب' : 'Order Status'}</Label>
                <Select value={trackingForm.status} onValueChange={(v) => setTrackingForm({ ...trackingForm, status: v })}>
                  <SelectTrigger>
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
              <div>
                <Label>{lang === 'ar' ? 'رقم التتبع' : 'Tracking Number'}</Label>
                <Input
                  value={trackingForm.tracking_number}
                  onChange={(e) => setTrackingForm({ ...trackingForm, tracking_number: e.target.value })}
                  placeholder="e.g., 1Z999AA10123456784"
                  data-testid="tracking-number-input"
                />
              </div>
              <div>
                <Label>{lang === 'ar' ? 'رابط التتبع' : 'Tracking URL'}</Label>
                <Input
                  value={trackingForm.tracking_url}
                  onChange={(e) => setTrackingForm({ ...trackingForm, tracking_url: e.target.value })}
                  placeholder="https://..."
                  data-testid="tracking-url-input"
                />
              </div>
              <Button onClick={handleSaveTracking} className="bg-black text-white hover:bg-gray-800" data-testid="save-tracking-btn">
                {t('save')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AdminPage;
