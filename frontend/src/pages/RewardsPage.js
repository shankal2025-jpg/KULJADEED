import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gift, Star, TrendingUp, ArrowRight, Copy, Check } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Skeleton } from '../components/ui/skeleton';
import { Slider } from '../components/ui/slider';

const API = process.env.REACT_APP_BACKEND_URL;

const api = axios.create({
  baseURL: API,
  withCredentials: true
});

const RewardsPage = () => {
  const { user, loading: authLoading } = useAuth();
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const [rewards, setRewards] = useState({ points: 0, points_value: 0, history: [] });
  const [loading, setLoading] = useState(true);
  const [redeemPoints, setRedeemPoints] = useState(100);
  const [redeeming, setRedeeming] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
      return;
    }

    const fetchRewards = async () => {
      try {
        const { data } = await api.get('/api/rewards');
        setRewards(data);
      } catch (e) {
        console.error('Failed to fetch rewards:', e);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchRewards();
    }
  }, [user, authLoading, navigate]);

  const handleRedeem = async () => {
    if (redeemPoints < 100 || redeemPoints > rewards.points) return;
    
    setRedeeming(true);
    try {
      const { data } = await api.post('/api/rewards/redeem', { points: redeemPoints });
      setCouponCode(data.coupon_code);
      
      // Refresh rewards
      const { data: newRewards } = await api.get('/api/rewards');
      setRewards(newRewards);
    } catch (e) {
      alert(e.response?.data?.detail || 'Failed to redeem points');
    } finally {
      setRedeeming(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(couponCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Skeleton className="h-48 rounded-xl mb-8" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight mb-8">
          {lang === 'ar' ? 'نقاط المكافآت' : 'Reward Points'}
        </h1>

        {/* Points Balance Card */}
        <div className="bg-gradient-to-br from-rose-500 to-orange-500 rounded-2xl p-8 text-white mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Star className="h-6 w-6" />
            </div>
            <div>
              <p className="text-white/80 text-sm">{lang === 'ar' ? 'رصيد النقاط' : 'Points Balance'}</p>
              <p className="text-3xl font-bold">{rewards.points.toLocaleString()}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-white/80">
            <TrendingUp className="h-4 w-4" />
            <span className="text-sm">
              {lang === 'ar' ? `قيمة: $${rewards.points_value.toFixed(2)}` : `Worth: $${rewards.points_value.toFixed(2)}`}
            </span>
          </div>
          <p className="mt-4 text-sm text-white/70">
            {lang === 'ar' ? 'اكسب نقطة واحدة لكل دولار تنفقه' : 'Earn 1 point for every $1 you spend'}
          </p>
        </div>

        {/* Redeem Section */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Gift className="h-5 w-5 text-rose-500" />
            {lang === 'ar' ? 'استبدال النقاط' : 'Redeem Points'}
          </h2>

          {couponCode ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
              <Check className="h-12 w-12 text-green-500 mx-auto mb-3" />
              <p className="text-green-800 font-medium mb-2">
                {lang === 'ar' ? 'تم إنشاء كود الخصم!' : 'Discount code created!'}
              </p>
              <div className="flex items-center justify-center gap-2 bg-white rounded-lg p-3 border border-green-200">
                <code className="text-lg font-mono font-bold text-green-700">{couponCode}</code>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={copyToClipboard}
                  className="h-8 w-8"
                >
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-sm text-green-600 mt-2">
                {lang === 'ar' ? 'صالح لمدة 30 يوم' : 'Valid for 30 days'}
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setCouponCode('')}
              >
                {lang === 'ar' ? 'استبدال المزيد' : 'Redeem More'}
              </Button>
            </div>
          ) : rewards.points >= 100 ? (
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500">
                    {lang === 'ar' ? 'النقاط للاستبدال' : 'Points to redeem'}
                  </span>
                  <span className="font-bold">{redeemPoints} = ${(redeemPoints * 0.01).toFixed(2)}</span>
                </div>
                <Slider
                  value={[redeemPoints]}
                  onValueChange={(v) => setRedeemPoints(v[0])}
                  min={100}
                  max={rewards.points}
                  step={100}
                  className="my-4"
                />
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>100</span>
                  <span>{rewards.points}</span>
                </div>
              </div>
              
              <Button
                onClick={handleRedeem}
                disabled={redeeming || redeemPoints > rewards.points}
                className="w-full bg-gradient-to-r from-rose-500 to-orange-500 text-white hover:opacity-90 rounded-full h-12"
                data-testid="redeem-btn"
              >
                {redeeming ? (lang === 'ar' ? 'جاري الاستبدال...' : 'Redeeming...') : (
                  <>
                    {lang === 'ar' ? `استبدال ${redeemPoints} نقطة مقابل $${(redeemPoints * 0.01).toFixed(2)}` : `Redeem ${redeemPoints} points for $${(redeemPoints * 0.01).toFixed(2)}`}
                    <ArrowRight className="ms-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">
                {lang === 'ar' ? 'تحتاج 100 نقطة على الأقل للاستبدال' : 'You need at least 100 points to redeem'}
              </p>
              <Button
                onClick={() => navigate('/products')}
                className="mt-4 bg-black text-white hover:bg-gray-800 rounded-full"
              >
                {lang === 'ar' ? 'تسوق الآن' : 'Shop Now'}
              </Button>
            </div>
          )}
        </div>

        {/* History */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h2 className="font-bold">{lang === 'ar' ? 'سجل النقاط' : 'Points History'}</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {rewards.history.length === 0 ? (
              <p className="p-8 text-center text-gray-500">
                {lang === 'ar' ? 'لا يوجد سجل بعد' : 'No history yet'}
              </p>
            ) : (
              rewards.history.map((item) => (
                <div key={item.id} className="p-4 flex items-center justify-between" data-testid={`history-${item.id}`}>
                  <div>
                    <p className="font-medium text-sm">{item.description}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(item.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`font-bold ${item.points > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {item.points > 0 ? '+' : ''}{item.points}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RewardsPage;
