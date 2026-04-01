import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { CheckCircle, Loader2 } from 'lucide-react';
import axios from 'axios';
import { useLanguage } from '../context/LanguageContext';
import { useCart } from '../context/CartContext';
import { Button } from '../components/ui/button';

const API = process.env.REACT_APP_BACKEND_URL;

// Create axios instance with credentials
const api = axios.create({
  baseURL: API,
  withCredentials: true
});

const CheckoutSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { fetchCart } = useCart();
  const [status, setStatus] = useState('loading');
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    if (!sessionId) {
      navigate('/');
      return;
    }

    const checkStatus = async () => {
      try {
        const { data } = await api.get(`/api/checkout/status/${sessionId}`);
        
        if (data.payment_status === 'paid') {
          setStatus('success');
          await fetchCart(); // Refresh cart
        } else if (data.status === 'expired') {
          setStatus('expired');
        } else if (attempts < 5) {
          // Keep polling
          setTimeout(() => setAttempts(a => a + 1), 2000);
        } else {
          setStatus('timeout');
        }
      } catch (e) {
        console.error('Error checking status:', e);
        if (attempts < 5) {
          setTimeout(() => setAttempts(a => a + 1), 2000);
        } else {
          setStatus('error');
        }
      }
    };

    checkStatus();
  }, [searchParams, navigate, attempts, fetchCart]);

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center px-4">
      <div className="text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="h-16 w-16 text-gray-400 animate-spin mx-auto mb-4" />
            <p className="text-gray-500">{t('loading')}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="h-20 w-20 text-green-500 mx-auto mb-4" />
            <h1 className="text-3xl font-display font-bold mb-2">{t('paymentSuccess')}</h1>
            <p className="text-gray-500 mb-8">{t('thankYou')}</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/orders">
                <Button className="bg-black text-white hover:bg-gray-800 rounded-full px-8" data-testid="view-orders-btn">
                  {t('viewOrders')}
                </Button>
              </Link>
              <Link to="/products">
                <Button variant="outline" className="rounded-full px-8" data-testid="continue-shopping-btn">
                  {t('continueShopping')}
                </Button>
              </Link>
            </div>
          </>
        )}

        {(status === 'expired' || status === 'timeout' || status === 'error') && (
          <>
            <h1 className="text-2xl font-display font-bold mb-2">Payment Status Unavailable</h1>
            <p className="text-gray-500 mb-8">Please check your orders page or try again.</p>
            <Link to="/orders">
              <Button className="bg-black text-white hover:bg-gray-800 rounded-full px-8">
                {t('viewOrders')}
              </Button>
            </Link>
          </>
        )}
      </div>
    </div>
  );
};

export default CheckoutSuccessPage;
