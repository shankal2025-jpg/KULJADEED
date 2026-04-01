# كل جديد KULJADEED - E-Commerce Store

## Original Problem Statement
Build a bilingual (Arabic/English) e-commerce store "كل جديد KULJADEED" with:
- Multi-category products
- Stripe payment integration
- User authentication
- Admin dashboard
- Shopping cart with coupon codes
- Search and filter
- Product ratings/reviews
- Wishlist functionality
- Order tracking
- Bilingual support (Arabic and English) with RTL

## Architecture
### Backend (FastAPI + MongoDB)
- `/app/backend/server.py` - Main API server
- Authentication: JWT with HTTP-only cookies, brute force protection
- Collections: users, products, categories, carts, orders, reviews, wishlists, coupons, payment_transactions

### Frontend (React + Tailwind CSS)
- Context: AuthContext, CartContext, LanguageContext
- Pages: Home, Products, ProductDetail, Login, Register, Orders, Wishlist, Admin, CheckoutSuccess
- Components: Header, ProductCard, CartSheet (with coupon input)

## What's Been Implemented (April 1, 2026)
### Phase 1 (MVP)
- [x] User authentication (register, login, logout)
- [x] Product catalog with 4 categories
- [x] Shopping cart with quantity controls
- [x] Stripe checkout integration
- [x] Admin dashboard with stats
- [x] Product CRUD for admin
- [x] Product reviews/ratings
- [x] Bilingual (EN/AR) with RTL support
- [x] Search and filter products

### Phase 2 (Enhancements)
- [x] Wishlist functionality
- [x] Coupon codes system (WELCOME10, SAVE20, FLAT50)
- [x] Order tracking with tracking number/URL
- [x] Admin coupon management
- [x] Admin order tracking updates
- [x] KULJADEED branding (rose-orange gradient)

## Test Credentials
- Admin: admin@store.com / Admin123!
- Coupons: WELCOME10 (10% off $50+), SAVE20 (20% off $100+), FLAT50 ($50 off $200+)

## API Endpoints
### Auth
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/logout
- GET /api/auth/me

### Products
- GET /api/products (with search, category, sort, pagination)
- GET /api/products/:id
- POST /api/admin/products
- PUT /api/admin/products/:id
- DELETE /api/admin/products/:id

### Cart
- GET /api/cart
- POST /api/cart/add
- PUT /api/cart/update
- DELETE /api/cart/remove/:id

### Wishlist
- GET /api/wishlist
- POST /api/wishlist/add
- DELETE /api/wishlist/remove/:id

### Coupons
- GET /api/coupons (admin)
- POST /api/coupons/validate
- POST /api/admin/coupons
- DELETE /api/admin/coupons/:id

### Orders
- GET /api/orders
- GET /api/admin/orders
- PUT /api/admin/orders/:id/status

### Checkout
- POST /api/checkout (with coupon support)
- GET /api/checkout/status/:session_id

## Next Tasks
1. Email notifications for orders
2. Multiple product images gallery
3. Product variants (size, color)
4. Promotional banners
5. Customer reviews moderation
