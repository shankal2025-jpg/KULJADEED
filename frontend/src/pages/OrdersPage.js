import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Skeleton } from '../components/ui/skeleton';

const API = process.env.REACT_APP_BACKEND_URL;

// Create axios instance with credentials
const api = axios.create({
  baseURL: API,
  withCredentials: true
});

const OrdersPage = () => {
  const { user, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
      return;
    }

    const fetchOrders = async () => {
      try {
        const { data } = await api.get('/api/orders');
        setOrders(data);
      } catch (e) {
        console.error('Failed to fetch orders:', e);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchOrders();
    }
  }, [user, authLoading, navigate]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Skeleton className="h-8 w-48 mb-8" />
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight mb-8">{t('orders')}</h1>

        {orders.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
            <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">{t('noOrders')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="bg-white border border-gray-200 rounded-xl p-6"
                data-testid={`order-${order.id}`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                  <div>
                    <p className="font-medium">{t('orderNumber')}{order.id.slice(-8).toUpperCase()}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(order.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full ${
                      order.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                      order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {order.status}
                    </span>
                    <span className="font-bold">${order.total.toFixed(2)}</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <span>{item.name} x{item.quantity}</span>
                      <span className="text-gray-500">${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrdersPage;
