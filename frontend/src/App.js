import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { LanguageProvider } from "./context/LanguageContext";
import { Toaster } from "./components/ui/sonner";
import Header from "./components/Header";
import HomePage from "./pages/HomePage";
import ProductsPage from "./pages/ProductsPage";
import ProductDetailPage from "./pages/ProductDetailPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import OrdersPage from "./pages/OrdersPage";
import WishlistPage from "./pages/WishlistPage";
import RewardsPage from "./pages/RewardsPage";
import CheckoutSuccessPage from "./pages/CheckoutSuccessPage";
import AdminPage from "./pages/AdminPage";

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <CartProvider>
          <BrowserRouter>
            <div className="min-h-screen bg-[#F8F9FA]">
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route
                  path="/*"
                  element={
                    <>
                      <Header />
                      <Routes>
                        <Route path="/" element={<HomePage />} />
                        <Route path="/products" element={<ProductsPage />} />
                        <Route path="/products/:id" element={<ProductDetailPage />} />
                        <Route path="/orders" element={<OrdersPage />} />
                        <Route path="/wishlist" element={<WishlistPage />} />
                        <Route path="/rewards" element={<RewardsPage />} />
                        <Route path="/checkout/success" element={<CheckoutSuccessPage />} />
                        <Route path="/admin" element={<AdminPage />} />
                      </Routes>
                    </>
                  }
                />
              </Routes>
            </div>
            <Toaster position="top-center" />
          </BrowserRouter>
        </CartProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
