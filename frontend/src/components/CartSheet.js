import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from './ui/sheet';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

const CartSheet = ({ children }) => {
  const { user } = useAuth();
  const { cart, updateQuantity, removeFromCart, loading } = useCart();
  const { t, lang, getLocalizedName } = useLanguage();
  const navigate = useNavigate();
  const [open, setOpen] = React.useState(false);
  const [checkoutLoading, setCheckoutLoading] = React.useState(false);

  const handleCheckout = async () => {
    if (!user) {
      setOpen(false);
      navigate('/login');
      return;
    }

    setCheckoutLoading(true);
    try {
      const originUrl = window.location.origin;
      const { data } = await axios.post(`${API}/api/checkout`, { origin_url: originUrl });
      window.location.href = data.url;
    } catch (e) {
      console.error('Checkout error:', e);
      alert(e.response?.data?.detail || 'Checkout failed');
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent side={lang === 'ar' ? 'left' : 'right'} className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            {t('yourCart')}
          </SheetTitle>
        </SheetHeader>

        {!user ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <p className="text-gray-500">{t('login')} to view your cart</p>
            <Button onClick={() => { setOpen(false); navigate('/login'); }} data-testid="cart-login-btn">
              {t('login')}
            </Button>
          </div>
        ) : cart.items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <ShoppingBag className="h-16 w-16 text-gray-300" />
            <p className="text-gray-500">{t('emptyCart')}</p>
            <Button onClick={() => { setOpen(false); navigate('/products'); }} data-testid="continue-shopping-btn">
              {t('continueShopping')}
            </Button>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 -mx-6 px-6">
              <div className="space-y-4 py-4">
                {cart.items.map((item) => (
                  <div key={item.product_id} className="flex gap-4" data-testid={`cart-item-${item.product_id}`}>
                    <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                      <img
                        src={item.product.image_url}
                        alt={getLocalizedName(item.product)}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm line-clamp-1 text-start">
                        {getLocalizedName(item.product)}
                      </h4>
                      <p className="text-sm text-gray-500 mt-0.5">${item.product.price.toFixed(2)}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                          disabled={loading}
                          data-testid={`decrease-qty-${item.product_id}`}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center text-sm">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                          disabled={loading}
                          data-testid={`increase-qty-${item.product_id}`}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 ms-auto text-red-500 hover:text-red-600"
                          onClick={() => removeFromCart(item.product_id)}
                          disabled={loading}
                          data-testid={`remove-item-${item.product_id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="pt-4 border-t">
              <div className="flex items-center justify-between mb-4">
                <span className="font-medium">{t('subtotal')}</span>
                <span className="text-xl font-bold">${cart.total.toFixed(2)}</span>
              </div>
              <Button
                className="w-full bg-black text-white hover:bg-gray-800 rounded-full h-12"
                onClick={handleCheckout}
                disabled={checkoutLoading || loading}
                data-testid="checkout-btn"
              >
                {checkoutLoading ? t('loading') : t('checkout')}
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default CartSheet;
