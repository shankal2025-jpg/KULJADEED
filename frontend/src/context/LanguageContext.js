import React, { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext(null);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
};

const translations = {
  en: {
    // Header
    home: 'Home',
    products: 'Products',
    cart: 'Cart',
    login: 'Login',
    register: 'Register',
    logout: 'Logout',
    admin: 'Admin',
    myOrders: 'My Orders',
    
    // Home
    heroTitle: 'Discover Premium Products',
    heroSubtitle: 'Shop the finest collection of electronics, fashion, beauty, and home essentials.',
    shopNow: 'Shop Now',
    featuredProducts: 'Featured Products',
    viewAll: 'View All',
    categories: 'Categories',
    
    // Products
    allProducts: 'All Products',
    search: 'Search products...',
    filter: 'Filter',
    sort: 'Sort by',
    newest: 'Newest',
    priceLowHigh: 'Price: Low to High',
    priceHighLow: 'Price: High to Low',
    topRated: 'Top Rated',
    noProducts: 'No products found',
    
    // Product Detail
    addToCart: 'Add to Cart',
    buyNow: 'Buy Now',
    reviews: 'Reviews',
    writeReview: 'Write a Review',
    inStock: 'In Stock',
    outOfStock: 'Out of Stock',
    rating: 'Rating',
    submit: 'Submit',
    
    // Cart
    yourCart: 'Your Cart',
    emptyCart: 'Your cart is empty',
    continueShopping: 'Continue Shopping',
    subtotal: 'Subtotal',
    checkout: 'Checkout',
    remove: 'Remove',
    
    // Auth
    email: 'Email',
    password: 'Password',
    name: 'Name',
    confirmPassword: 'Confirm Password',
    forgotPassword: 'Forgot Password?',
    noAccount: "Don't have an account?",
    haveAccount: 'Already have an account?',
    resetPassword: 'Reset Password',
    
    // Orders
    orders: 'Orders',
    orderNumber: 'Order #',
    orderDate: 'Date',
    orderStatus: 'Status',
    orderTotal: 'Total',
    noOrders: 'No orders yet',
    
    // Checkout
    paymentSuccess: 'Payment Successful!',
    thankYou: 'Thank you for your purchase.',
    viewOrders: 'View Orders',
    
    // Admin
    dashboard: 'Dashboard',
    manageProducts: 'Manage Products',
    manageOrders: 'Manage Orders',
    addProduct: 'Add Product',
    editProduct: 'Edit Product',
    deleteProduct: 'Delete Product',
    totalRevenue: 'Total Revenue',
    totalOrders: 'Total Orders',
    totalProducts: 'Total Products',
    totalUsers: 'Total Users',
    
    // General
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    cancel: 'Cancel',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    close: 'Close',
  },
  ar: {
    // Header
    home: 'الرئيسية',
    products: 'المنتجات',
    cart: 'السلة',
    login: 'تسجيل الدخول',
    register: 'إنشاء حساب',
    logout: 'تسجيل الخروج',
    admin: 'الإدارة',
    myOrders: 'طلباتي',
    
    // Home
    heroTitle: 'اكتشف المنتجات الفاخرة',
    heroSubtitle: 'تسوق أفضل مجموعة من الإلكترونيات والأزياء والجمال ومستلزمات المنزل.',
    shopNow: 'تسوق الآن',
    featuredProducts: 'منتجات مميزة',
    viewAll: 'عرض الكل',
    categories: 'الفئات',
    
    // Products
    allProducts: 'جميع المنتجات',
    search: 'ابحث عن منتجات...',
    filter: 'تصفية',
    sort: 'ترتيب حسب',
    newest: 'الأحدث',
    priceLowHigh: 'السعر: من الأقل للأعلى',
    priceHighLow: 'السعر: من الأعلى للأقل',
    topRated: 'الأعلى تقييماً',
    noProducts: 'لا توجد منتجات',
    
    // Product Detail
    addToCart: 'أضف للسلة',
    buyNow: 'اشترِ الآن',
    reviews: 'التقييمات',
    writeReview: 'اكتب تقييماً',
    inStock: 'متوفر',
    outOfStock: 'غير متوفر',
    rating: 'التقييم',
    submit: 'إرسال',
    
    // Cart
    yourCart: 'سلة التسوق',
    emptyCart: 'السلة فارغة',
    continueShopping: 'متابعة التسوق',
    subtotal: 'المجموع الفرعي',
    checkout: 'إتمام الشراء',
    remove: 'إزالة',
    
    // Auth
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    name: 'الاسم',
    confirmPassword: 'تأكيد كلمة المرور',
    forgotPassword: 'نسيت كلمة المرور؟',
    noAccount: 'ليس لديك حساب؟',
    haveAccount: 'لديك حساب بالفعل؟',
    resetPassword: 'إعادة تعيين كلمة المرور',
    
    // Orders
    orders: 'الطلبات',
    orderNumber: 'رقم الطلب',
    orderDate: 'التاريخ',
    orderStatus: 'الحالة',
    orderTotal: 'المجموع',
    noOrders: 'لا توجد طلبات',
    
    // Checkout
    paymentSuccess: 'تم الدفع بنجاح!',
    thankYou: 'شكراً لشرائك.',
    viewOrders: 'عرض الطلبات',
    
    // Admin
    dashboard: 'لوحة التحكم',
    manageProducts: 'إدارة المنتجات',
    manageOrders: 'إدارة الطلبات',
    addProduct: 'إضافة منتج',
    editProduct: 'تعديل المنتج',
    deleteProduct: 'حذف المنتج',
    totalRevenue: 'إجمالي الإيرادات',
    totalOrders: 'إجمالي الطلبات',
    totalProducts: 'إجمالي المنتجات',
    totalUsers: 'إجمالي المستخدمين',
    
    // General
    loading: 'جاري التحميل...',
    error: 'خطأ',
    success: 'نجاح',
    cancel: 'إلغاء',
    save: 'حفظ',
    delete: 'حذف',
    edit: 'تعديل',
    close: 'إغلاق',
  }
};

export const LanguageProvider = ({ children }) => {
  const [lang, setLang] = useState(() => localStorage.getItem('lang') || 'en');
  const [dir, setDir] = useState(() => localStorage.getItem('lang') === 'ar' ? 'rtl' : 'ltr');

  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = lang;
    localStorage.setItem('lang', lang);
  }, [lang, dir]);

  const toggleLanguage = () => {
    const newLang = lang === 'en' ? 'ar' : 'en';
    setLang(newLang);
    setDir(newLang === 'ar' ? 'rtl' : 'ltr');
  };

  const t = (key) => translations[lang][key] || key;

  const getLocalizedName = (item) => {
    if (!item) return '';
    return lang === 'ar' ? (item.name_ar || item.name_en) : (item.name_en || item.name_ar);
  };

  const getLocalizedDescription = (item) => {
    if (!item) return '';
    return lang === 'ar' ? (item.description_ar || item.description_en) : (item.description_en || item.description_ar);
  };

  return (
    <LanguageContext.Provider value={{ lang, dir, t, toggleLanguage, getLocalizedName, getLocalizedDescription }}>
      {children}
    </LanguageContext.Provider>
  );
};
