import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, User, Menu, Globe, LogOut, Package, Settings } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { Button } from './ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from './ui/sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from './ui/dropdown-menu';
import CartSheet from './CartSheet';

const Header = () => {
  const { user, logout } = useAuth();
  const { itemCount } = useCart();
  const { t, lang, toggleLanguage } = useLanguage();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2" data-testid="logo-link">
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">S</span>
            </div>
            <span className="font-display text-xl font-bold tracking-tight">Store</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            <Link to="/" className="text-sm font-medium hover:text-gray-600 transition-colors" data-testid="nav-home">
              {t('home')}
            </Link>
            <Link to="/products" className="text-sm font-medium hover:text-gray-600 transition-colors" data-testid="nav-products">
              {t('products')}
            </Link>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {/* Language Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleLanguage}
              className="rounded-full"
              data-testid="lang-switch-btn"
            >
              <Globe className="h-5 w-5" />
              <span className="sr-only">Toggle Language</span>
            </Button>

            {/* Cart */}
            <CartSheet>
              <Button variant="ghost" size="icon" className="rounded-full relative" data-testid="cart-btn">
                <ShoppingCart className="h-5 w-5" />
                {itemCount > 0 && (
                  <span className="absolute -top-1 -end-1 w-5 h-5 bg-black text-white text-xs rounded-full flex items-center justify-center">
                    {itemCount}
                  </span>
                )}
              </Button>
            </CartSheet>

            {/* User Menu */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full" data-testid="user-menu-btn">
                    <User className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <div className="px-2 py-1.5 text-sm font-medium">{user.name}</div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/orders')} data-testid="my-orders-btn">
                    <Package className="me-2 h-4 w-4" />
                    {t('myOrders')}
                  </DropdownMenuItem>
                  {user.role === 'admin' && (
                    <DropdownMenuItem onClick={() => navigate('/admin')} data-testid="admin-btn">
                      <Settings className="me-2 h-4 w-4" />
                      {t('admin')}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} data-testid="logout-btn">
                    <LogOut className="me-2 h-4 w-4" />
                    {t('logout')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <Button variant="ghost" onClick={() => navigate('/login')} data-testid="login-btn">
                  {t('login')}
                </Button>
                <Button onClick={() => navigate('/register')} className="bg-black text-white hover:bg-gray-800 rounded-full" data-testid="register-btn">
                  {t('register')}
                </Button>
              </div>
            )}

            {/* Mobile Menu */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon" data-testid="mobile-menu-btn">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side={lang === 'ar' ? 'left' : 'right'}>
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col gap-4 mt-6">
                  <Link to="/" onClick={() => setMobileOpen(false)} className="text-lg font-medium">
                    {t('home')}
                  </Link>
                  <Link to="/products" onClick={() => setMobileOpen(false)} className="text-lg font-medium">
                    {t('products')}
                  </Link>
                  {!user && (
                    <>
                      <Link to="/login" onClick={() => setMobileOpen(false)} className="text-lg font-medium">
                        {t('login')}
                      </Link>
                      <Link to="/register" onClick={() => setMobileOpen(false)} className="text-lg font-medium">
                        {t('register')}
                      </Link>
                    </>
                  )}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
