# KULJADEED E-Commerce Store - Product Requirements Document

## Original Problem Statement
Build a bilingual (Arabic/English) e-commerce store named "كل جديد KULJADEED" with Stripe payment integration, multiple diverse products, and full admin management.

## Core Features (All Implemented)
- Bilingual UI (Arabic/English) with RTL/LTR support
- JWT Authentication with admin/customer roles
- Product Catalog with categories, search, filtering, sorting
- Shopping Cart with quantity management
- Stripe Checkout integration (uses USD internally, displays YR on frontend)
- Wishlist functionality
- Reward Points system (earn/redeem)
- Discount Coupons system
- Promotional Banners carousel
- Order Tracking with tracking numbers/URLs
- Admin Dashboard (Products, Orders, Coupons, Banners, Categories CRUD, Stats)
- Email notifications via Resend (requires API key setup)

## Currency
- Display: YR (Yemeni Rial) / ريال
- Stripe: Processes in USD internally

## Tech Stack
- Frontend: React + TailwindCSS + Shadcn UI
- Backend: FastAPI + MongoDB (Motor)
- Payments: Stripe (via emergentintegrations)
- Email: Resend (pending API key)

## Architecture
```
/app/
├── backend/
│   ├── server.py          # All routes and models
│   ├── requirements.txt
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── context/       # AuthContext, CartContext, LanguageContext
│   │   ├── pages/         # All page components
│   │   ├── components/    # Header, ProductCard, CartSheet, ui/
│   │   ├── App.js
│   │   └── index.css
│   ├── package.json
│   └── .env
└── memory/
    └── PRD.md
```

## Admin Credentials
- Email: admin@store.com
- Password: Admin123!

## Completed Tasks
- [x] Full e-commerce MVP
- [x] Bilingual support (EN/AR with RTL)
- [x] Stripe checkout
- [x] Wishlist, Rewards, Coupons, Banners
- [x] Admin Dashboard with full CRUD
- [x] Currency change to YR (Yemeni Rial)
- [x] Categories management in admin panel (Feb 2026)

## Pending / Backlog
- [ ] Resend Email API key setup (user needs to provide key)
- [ ] Backend refactoring (split server.py into separate route files)
