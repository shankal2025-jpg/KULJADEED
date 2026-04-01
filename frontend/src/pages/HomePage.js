import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Smartphone, Shirt, Sparkles, Home as HomeIcon, ChevronRight, ChevronLeft, Star, Gift } from 'lucide-react';
import axios from 'axios';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import ProductCard from '../components/ProductCard';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';

const API = process.env.REACT_APP_BACKEND_URL;

// Create axios instance with credentials
const api = axios.create({
  baseURL: API,
  withCredentials: true
});

const iconMap = {
  Smartphone: Smartphone,
  Shirt: Shirt,
  Sparkles: Sparkles,
  Home: HomeIcon,
};

const HomePage = () => {
  const { t, lang, getLocalizedName } = useLanguage();
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [banners, setBanners] = useState([]);
  const [currentBanner, setCurrentBanner] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productsRes, categoriesRes, bannersRes] = await Promise.all([
          api.get('/api/products?featured=true&limit=4'),
          api.get('/api/categories'),
          api.get('/api/banners')
        ]);
        setProducts(productsRes.data.products);
        setCategories(categoriesRes.data);
        setBanners(bannersRes.data);
      } catch (e) {
        console.error('Failed to fetch data:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Auto-rotate banners
  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [banners.length]);

  const nextBanner = () => setCurrentBanner((prev) => (prev + 1) % banners.length);
  const prevBanner = () => setCurrentBanner((prev) => (prev - 1 + banners.length) % banners.length);

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1760172287483-02d382f63a6f?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxOTJ8MHwxfHNlYXJjaHwyfHxhYnN0cmFjdCUyMGx1eHVyeSUyMGdyYWRpZW50JTIwYmFja2dyb3VuZHxlbnwwfHx8fDE3NzUwNDkwNzl8MA&ixlib=rb-4.1.0&q=85)' }}
        />
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
          <div className="max-w-2xl">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold text-white tracking-tight leading-tight">
              {t('heroTitle')}
            </h1>
            <p className="mt-6 text-lg text-white/80 leading-relaxed">
              {t('heroSubtitle')}
            </p>
            <Link to="/products">
              <Button 
                className="mt-8 bg-white text-black hover:bg-gray-100 rounded-full px-8 py-6 text-lg font-medium"
                data-testid="shop-now-btn"
              >
                {t('shopNow')}
                <ArrowRight className="ms-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Promotional Banners Carousel */}
      {banners.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="relative overflow-hidden rounded-2xl">
            <div 
              className="flex transition-transform duration-500 ease-out"
              style={{ transform: `translateX(-${currentBanner * 100}%)` }}
            >
              {banners.map((banner) => (
                <Link 
                  key={banner.id} 
                  to={banner.link_url || '/products'}
                  className="w-full flex-shrink-0 relative"
                >
                  <div className="aspect-[3/1] relative overflow-hidden rounded-2xl">
                    <img
                      src={banner.image_url}
                      alt={lang === 'ar' ? banner.title_ar : banner.title_en}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent" />
                    <div className="absolute inset-0 flex items-center p-8 md:p-12">
                      <div className="text-white">
                        <h3 className="text-2xl md:text-4xl font-display font-bold mb-2">
                          {lang === 'ar' ? banner.title_ar : banner.title_en}
                        </h3>
                        {banner.subtitle_en && (
                          <p className="text-white/80 text-sm md:text-lg">
                            {lang === 'ar' ? banner.subtitle_ar : banner.subtitle_en}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            
            {banners.length > 1 && (
              <>
                <button
                  onClick={prevBanner}
                  className="absolute start-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center hover:bg-white transition-colors"
                  data-testid="prev-banner-btn"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={nextBanner}
                  className="absolute end-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center hover:bg-white transition-colors"
                  data-testid="next-banner-btn"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                  {banners.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentBanner(idx)}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        idx === currentBanner ? 'bg-white' : 'bg-white/50'
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </section>
      )}

      {/* Rewards Banner for logged-in users */}
      {user && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
          <Link to="/rewards" className="block">
            <div className="bg-gradient-to-r from-rose-500 to-orange-500 rounded-2xl p-6 flex items-center justify-between hover:opacity-95 transition-opacity">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Gift className="h-6 w-6 text-white" />
                </div>
                <div className="text-white">
                  <p className="font-bold">{lang === 'ar' ? 'نقاط المكافآت' : 'Reward Points'}</p>
                  <p className="text-sm text-white/80">
                    {lang === 'ar' ? 'اكسب نقاط مع كل عملية شراء' : 'Earn points with every purchase'}
                  </p>
                </div>
              </div>
              <ArrowRight className="h-6 w-6 text-white" />
            </div>
          </Link>
        </section>
      )}

      {/* Categories Bento Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl sm:text-3xl font-display font-bold tracking-tight">{t('categories')}</h2>
        </div>
        
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {categories.map((category) => {
              const IconComponent = iconMap[category.icon] || Smartphone;
              return (
                <Link
                  key={category.id}
                  to={`/products?category=${category.id}`}
                  className="group bg-white border border-gray-200 rounded-xl p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-gray-300"
                  data-testid={`category-${category.id}`}
                >
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-black group-hover:text-white transition-colors">
                    <IconComponent className="h-6 w-6" />
                  </div>
                  <h3 className="font-medium text-start">{getLocalizedName(category)}</h3>
                  <div className="flex items-center gap-1 mt-2 text-sm text-gray-500 group-hover:text-black transition-colors">
                    <span>{t('shopNow')}</span>
                    <ChevronRight className="h-4 w-4 rtl:rotate-180" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Featured Products */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl sm:text-3xl font-display font-bold tracking-tight">{t('featuredProducts')}</h2>
          <Link to="/products" className="flex items-center gap-1 text-sm font-medium hover:text-gray-600 transition-colors" data-testid="view-all-link">
            {t('viewAll')}
            <ChevronRight className="h-4 w-4 rtl:rotate-180" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-square rounded-xl" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="bg-black text-white py-12 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-rose-500 to-orange-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">ك</span>
              </div>
              <span className="font-display text-xl font-bold">{lang === 'ar' ? 'كل جديد' : 'KULJADEED'}</span>
            </div>
            <p className="text-gray-400 text-sm">© 2024 {lang === 'ar' ? 'كل جديد' : 'KULJADEED'}. {lang === 'ar' ? 'جميع الحقوق محفوظة' : 'All rights reserved'}.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
