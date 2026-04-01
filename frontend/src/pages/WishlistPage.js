import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Heart, ShoppingCart, Trash2 } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';

const API = process.env.REACT_APP_BACKEND_URL;

const api = axios.create({
  baseURL: API,
  withCredentials: true
});

const WishlistPage = () => {
  const { user, loading: authLoading } = useAuth();
  const { addToCart } = useCart();
  const { t, getLocalizedName, lang } = useLanguage();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
      return;
    }

    const fetchWishlist = async () => {
      try {
        const { data } = await api.get('/api/wishlist');
        setItems(data.items);
      } catch (e) {
        console.error('Failed to fetch wishlist:', e);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchWishlist();
    }
  }, [user, authLoading, navigate]);

  const handleRemove = async (productId) => {
    try {
      await api.delete(`/api/wishlist/remove/${productId}`);
      setItems(items.filter(item => item.id !== productId));
    } catch (e) {
      alert('Failed to remove item');
    }
  };

  const handleAddToCart = async (productId) => {
    const result = await addToCart(productId, 1);
    if (result.success) {
      handleRemove(productId);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Skeleton className="h-8 w-48 mb-8" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight mb-8">
          {lang === 'ar' ? 'قائمة الرغبات' : 'Wishlist'}
        </h1>

        {items.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
            <Heart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg mb-4">
              {lang === 'ar' ? 'قائمة رغباتك فارغة' : 'Your wishlist is empty'}
            </p>
            <Link to="/products">
              <Button className="bg-black text-white hover:bg-gray-800 rounded-full">
                {lang === 'ar' ? 'تسوق الآن' : 'Shop Now'}
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {items.map((product) => (
              <div
                key={product.id}
                className="bg-white border border-gray-200 rounded-xl overflow-hidden"
                data-testid={`wishlist-item-${product.id}`}
              >
                <Link to={`/products/${product.id}`}>
                  <div className="aspect-square overflow-hidden bg-gray-100">
                    <img
                      src={product.image_url}
                      alt={getLocalizedName(product)}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                </Link>
                <div className="p-4">
                  <h3 className="font-medium text-start line-clamp-1">{getLocalizedName(product)}</h3>
                  <p className="text-lg font-bold mt-1">${product.price.toFixed(2)}</p>
                  <div className="flex gap-2 mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleAddToCart(product.id)}
                      data-testid={`add-to-cart-${product.id}`}
                    >
                      <ShoppingCart className="h-4 w-4 me-1" />
                      {lang === 'ar' ? 'أضف للسلة' : 'Add'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-500 hover:text-red-600"
                      onClick={() => handleRemove(product.id)}
                      data-testid={`remove-wishlist-${product.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WishlistPage;
