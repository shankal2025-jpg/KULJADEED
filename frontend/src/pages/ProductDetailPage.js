import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Star, Minus, Plus, ShoppingCart, ArrowLeft, Heart } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Skeleton } from '../components/ui/skeleton';
import { Separator } from '../components/ui/separator';

const API = process.env.REACT_APP_BACKEND_URL;

// Create axios instance with credentials
const api = axios.create({
  baseURL: API,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart } = useCart();
  const { t, lang, getLocalizedName, getLocalizedDescription, formatPrice } = useLanguage();
  
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const [inWishlist, setInWishlist] = useState(false);
  
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const { data } = await api.get(`/api/products/${id}`);
        setProduct(data);
      } catch (e) {
        console.error('Failed to fetch product:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  useEffect(() => {
    const checkWishlist = async () => {
      if (!user) return;
      try {
        const { data } = await api.get('/api/wishlist');
        setInWishlist(data.items.some(item => item.id === id));
      } catch (e) {
        console.error('Failed to check wishlist:', e);
      }
    };
    checkWishlist();
  }, [user, id]);

  const handleToggleWishlist = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      if (inWishlist) {
        await api.delete(`/api/wishlist/remove/${id}`);
        setInWishlist(false);
      } else {
        await api.post('/api/wishlist/add', { product_id: id });
        setInWishlist(true);
      }
    } catch (e) {
      alert('Failed to update wishlist');
    }
  };

  const handleAddToCart = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    setAddingToCart(true);
    const result = await addToCart(id, quantity);
    if (!result.success) {
      alert(result.error);
    }
    setAddingToCart(false);
  };

  const handleBuyNow = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    setAddingToCart(true);
    const result = await addToCart(id, quantity);
    if (result.success) {
      // Trigger checkout
      try {
        const originUrl = window.location.origin;
        const { data } = await api.post('/api/checkout', { origin_url: originUrl });
        window.location.href = data.url;
      } catch (e) {
        alert(e.response?.data?.detail || 'Checkout failed');
      }
    } else {
      alert(result.error);
    }
    setAddingToCart(false);
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }
    setSubmittingReview(true);
    try {
      await api.post('/api/reviews', {
        product_id: id,
        rating: reviewRating,
        comment: reviewComment
      });
      // Refresh product to get updated reviews
      const { data } = await api.get(`/api/products/${id}`);
      setProduct(data);
      setReviewComment('');
      setReviewRating(5);
    } catch (e) {
      alert(e.response?.data?.detail || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid md:grid-cols-2 gap-12">
            <Skeleton className="aspect-square rounded-xl" />
            <div className="space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-6 w-1/4" />
              <Skeleton className="h-24 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <p className="text-gray-500">Product not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
          data-testid="back-btn"
        >
          <ArrowLeft className="me-2 h-4 w-4 rtl:rotate-180" />
          Back
        </Button>

        <div className="grid md:grid-cols-2 gap-12">
          {/* Product Image & Video */}
          <div className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <img
                src={product.image_url?.startsWith('/') ? `${API}${product.image_url}` : product.image_url}
                alt={getLocalizedName(product)}
                className="w-full aspect-square object-cover"
              />
            </div>
            {product.video_url && (
              <div className="bg-black rounded-xl overflow-hidden" data-testid="product-video">
                <video
                  src={product.video_url.startsWith('/') ? `${API}${product.video_url}` : product.video_url}
                  controls
                  className="w-full rounded-xl"
                  preload="metadata"
                  playsInline
                />
              </div>
            )}
          </div>

          {/* Product Info */}
          <div>
            <h1 className="text-3xl font-display font-bold tracking-tight" data-testid="product-name">
              {getLocalizedName(product)}
            </h1>
            
            <div className="flex items-center gap-4 mt-4">
              <span className="text-3xl font-bold">{formatPrice(product.price)}</span>
              {product.avg_rating > 0 && (
                <div className="flex items-center gap-1 text-sm">
                  <Star className="h-5 w-5 fill-yellow-400 stroke-yellow-400" />
                  <span className="font-medium">{product.avg_rating.toFixed(1)}</span>
                  <span className="text-gray-500">({product.review_count} {t('reviews')})</span>
                </div>
              )}
            </div>

            <p className="mt-6 text-gray-600 leading-relaxed text-start">
              {getLocalizedDescription(product)}
            </p>

            <div className="mt-6">
              <span className={`text-sm font-medium ${product.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {product.stock > 0 ? t('inStock') : t('outOfStock')}
              </span>
            </div>

            {/* Quantity */}
            <div className="flex items-center gap-4 mt-8">
              <span className="font-medium">Quantity:</span>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                  data-testid="decrease-qty"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-12 text-center font-medium">{quantity}</span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity(q => q + 1)}
                  disabled={quantity >= product.stock}
                  data-testid="increase-qty"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-8">
              <Button
                variant="outline"
                size="icon"
                className={`rounded-full h-12 w-12 ${inWishlist ? 'text-rose-500 border-rose-500' : ''}`}
                onClick={handleToggleWishlist}
                data-testid="wishlist-btn"
              >
                <Heart className={`h-5 w-5 ${inWishlist ? 'fill-rose-500' : ''}`} />
              </Button>
              <Button
                variant="outline"
                className="flex-1 rounded-full h-12"
                onClick={handleAddToCart}
                disabled={addingToCart || product.stock === 0}
                data-testid="add-to-cart-btn"
              >
                <ShoppingCart className="me-2 h-5 w-5" />
                {t('addToCart')}
              </Button>
              <Button
                className="flex-1 bg-black text-white hover:bg-gray-800 rounded-full h-12"
                onClick={handleBuyNow}
                disabled={addingToCart || product.stock === 0}
                data-testid="buy-now-btn"
              >
                {t('buyNow')}
              </Button>
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="mt-16">
          <h2 className="text-2xl font-display font-bold tracking-tight mb-8">{t('reviews')}</h2>
          
          {/* Write Review */}
          {user && (
            <div className="bg-white border border-gray-200 rounded-xl p-6 mb-8">
              <h3 className="font-medium mb-4">{t('writeReview')}</h3>
              <form onSubmit={handleSubmitReview}>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-sm">{t('rating')}:</span>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      data-testid={`rating-star-${star}`}
                    >
                      <Star
                        className={`h-6 w-6 transition-colors ${
                          star <= reviewRating
                            ? 'fill-yellow-400 stroke-yellow-400'
                            : 'stroke-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <Textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Write your review..."
                  className="mb-4"
                  required
                  data-testid="review-comment"
                />
                <Button
                  type="submit"
                  disabled={submittingReview}
                  className="bg-black text-white hover:bg-gray-800 rounded-full"
                  data-testid="submit-review-btn"
                >
                  {submittingReview ? t('loading') : t('submit')}
                </Button>
              </form>
            </div>
          )}

          {/* Reviews List */}
          <div className="space-y-4">
            {product.reviews && product.reviews.length > 0 ? (
              product.reviews.map((review) => (
                <div key={review.id} className="bg-white border border-gray-200 rounded-xl p-6" data-testid={`review-${review.id}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{review.user_name}</span>
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < review.rating
                              ? 'fill-yellow-400 stroke-yellow-400'
                              : 'stroke-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-gray-600 text-start">{review.comment}</p>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-8">No reviews yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailPage;
