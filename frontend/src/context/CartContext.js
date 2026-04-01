import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

const API = process.env.REACT_APP_BACKEND_URL;

const CartContext = createContext(null);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
};

export const CartProvider = ({ children }) => {
  const { user } = useAuth();
  const [cart, setCart] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(false);

  const fetchCart = useCallback(async () => {
    if (!user) {
      setCart({ items: [], total: 0 });
      return;
    }
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/api/cart`);
      setCart(data);
    } catch {
      setCart({ items: [], total: 0 });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const addToCart = async (productId, quantity = 1) => {
    try {
      await axios.post(`${API}/api/cart/add`, { product_id: productId, quantity });
      await fetchCart();
      return { success: true };
    } catch (e) {
      return { success: false, error: e.response?.data?.detail || 'Failed to add to cart' };
    }
  };

  const updateQuantity = async (productId, quantity) => {
    try {
      await axios.put(`${API}/api/cart/update`, { product_id: productId, quantity });
      await fetchCart();
      return { success: true };
    } catch (e) {
      return { success: false, error: e.response?.data?.detail || 'Failed to update cart' };
    }
  };

  const removeFromCart = async (productId) => {
    try {
      await axios.delete(`${API}/api/cart/remove/${productId}`);
      await fetchCart();
      return { success: true };
    } catch (e) {
      return { success: false, error: e.response?.data?.detail || 'Failed to remove item' };
    }
  };

  const clearCart = async () => {
    try {
      await axios.delete(`${API}/api/cart/clear`);
      setCart({ items: [], total: 0 });
      return { success: true };
    } catch (e) {
      return { success: false, error: e.response?.data?.detail || 'Failed to clear cart' };
    }
  };

  const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider value={{ cart, loading, addToCart, updateQuantity, removeFromCart, clearCart, fetchCart, itemCount }}>
      {children}
    </CartContext.Provider>
  );
};
