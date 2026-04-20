from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, APIRouter, HTTPException, Request, Depends, UploadFile, File
from starlette.middleware.cors import CORSMiddleware
from starlette.responses import Response
from fastapi.staticfiles import StaticFiles
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import os
import logging
import bcrypt
import jwt
import secrets
import asyncio
import resend
import uuid
import shutil
from pathlib import Path
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionResponse, CheckoutStatusResponse, CheckoutSessionRequest

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'default-secret-change-me')
JWT_ALGORITHM = "HS256"

# Resend Configuration
RESEND_API_KEY = os.environ.get('RESEND_API_KEY', '')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')
if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY

app = FastAPI()
api_router = APIRouter(prefix="/api")

# Create uploads directory
UPLOAD_DIR = Path("/app/backend/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ===================== MODELS =====================

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str

class ProductCreate(BaseModel):
    name_en: str
    name_ar: str
    description_en: str
    description_ar: str
    price: float
    category_id: str
    image_url: str
    video_url: Optional[str] = None
    stock: int = 100
    featured: bool = False

class ProductUpdate(BaseModel):
    name_en: Optional[str] = None
    name_ar: Optional[str] = None
    description_en: Optional[str] = None
    description_ar: Optional[str] = None
    price: Optional[float] = None
    category_id: Optional[str] = None
    image_url: Optional[str] = None
    video_url: Optional[str] = None
    stock: Optional[int] = None
    featured: Optional[bool] = None

class CategoryCreate(BaseModel):
    name_en: str
    name_ar: str
    icon: str = "Package"

class CartItem(BaseModel):
    product_id: str
    quantity: int

class ReviewCreate(BaseModel):
    product_id: str
    rating: int = Field(ge=1, le=5)
    comment: str

class CheckoutRequest(BaseModel):
    origin_url: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class WishlistItem(BaseModel):
    product_id: str

class CouponCreate(BaseModel):
    code: str
    discount_type: str = "percentage"  # percentage or fixed
    discount_value: float
    min_order: float = 0
    max_uses: int = 100
    expires_at: Optional[str] = None

class CouponApply(BaseModel):
    code: str

class CheckoutWithCoupon(BaseModel):
    origin_url: str
    coupon_code: Optional[str] = None

class OrderStatusUpdate(BaseModel):
    status: str
    tracking_number: Optional[str] = None
    tracking_url: Optional[str] = None

# New Models for enhanced features
class ProductVariant(BaseModel):
    size: Optional[str] = None
    color: Optional[str] = None
    color_hex: Optional[str] = None
    price_adjustment: float = 0
    stock: int = 0

class ProductCreateEnhanced(BaseModel):
    name_en: str
    name_ar: str
    description_en: str
    description_ar: str
    price: float
    category_id: str
    images: List[str] = []  # Multiple images
    image_url: str  # Primary image
    stock: int = 100
    featured: bool = False
    variants: List[ProductVariant] = []

class BannerCreate(BaseModel):
    title_en: str
    title_ar: str
    subtitle_en: Optional[str] = None
    subtitle_ar: Optional[str] = None
    image_url: str
    link_url: Optional[str] = None
    is_active: bool = True
    position: int = 0

class RewardPointsRedeem(BaseModel):
    points: int

# ===================== HELPERS =====================

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))

def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email, "exp": datetime.now(timezone.utc) + timedelta(hours=24), "type": "access"}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    payload = {"sub": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=7), "type": "refresh"}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def serialize_doc(doc: dict) -> dict:
    if doc is None:
        return None
    doc["id"] = str(doc.pop("_id"))
    return doc

async def send_order_email(to_email: str, order_id: str, items: list, total: float, discount: float = 0):
    """Send order confirmation email"""
    if not RESEND_API_KEY:
        logger.warning("RESEND_API_KEY not set, skipping email")
        return
    
    items_html = "".join([
        f"<tr><td style='padding:8px;border-bottom:1px solid #eee;'>{item['name']}</td>"
        f"<td style='padding:8px;border-bottom:1px solid #eee;text-align:center;'>{item['quantity']}</td>"
        f"<td style='padding:8px;border-bottom:1px solid #eee;text-align:right;'>{item['price']:.2f} YR</td></tr>"
        for item in items
    ])
    
    discount_html = ""
    if discount > 0:
        discount_html = f"<tr><td colspan='2' style='padding:8px;text-align:right;color:#16a34a;'>Discount:</td><td style='padding:8px;text-align:right;color:#16a34a;'>-{discount:.2f} YR</td></tr>"
    
    html_content = f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
        <div style="text-align:center;margin-bottom:30px;">
            <h1 style="color:#000;margin:0;">كل جديد KULJADEED</h1>
            <p style="color:#666;margin-top:5px;">Thank you for your order!</p>
        </div>
        
        <div style="background:#f9fafb;border-radius:12px;padding:20px;margin-bottom:20px;">
            <h2 style="margin:0 0 15px 0;font-size:18px;">Order #{order_id[-8:].upper()}</h2>
            <table style="width:100%;border-collapse:collapse;">
                <thead>
                    <tr style="background:#000;color:#fff;">
                        <th style="padding:10px;text-align:left;">Item</th>
                        <th style="padding:10px;text-align:center;">Qty</th>
                        <th style="padding:10px;text-align:right;">Price</th>
                    </tr>
                </thead>
                <tbody>
                    {items_html}
                    {discount_html}
                    <tr style="font-weight:bold;">
                        <td colspan="2" style="padding:12px;text-align:right;">Total:</td>
                        <td style="padding:12px;text-align:right;">{total:.2f} YR</td>
                    </tr>
                </tbody>
            </table>
        </div>
        
        <p style="color:#666;font-size:14px;text-align:center;">
            You earned <strong>{int(total)}</strong> reward points from this purchase!
        </p>
        
        <div style="text-align:center;margin-top:30px;padding-top:20px;border-top:1px solid #eee;">
            <p style="color:#999;font-size:12px;">© 2024 KULJADEED. All rights reserved.</p>
        </div>
    </div>
    """
    
    try:
        params = {
            "from": SENDER_EMAIL,
            "to": [to_email],
            "subject": f"Order Confirmation #{order_id[-8:].upper()} - KULJADEED",
            "html": html_content
        }
        await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"Order confirmation email sent to {to_email}")
    except Exception as e:
        logger.error(f"Failed to send email: {e}")

async def add_reward_points(user_id: str, points: int, description: str):
    """Add reward points to user account"""
    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$inc": {"reward_points": points}}
    )
    await db.reward_history.insert_one({
        "user_id": user_id,
        "points": points,
        "description": description,
        "created_at": datetime.now(timezone.utc)
    })

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user["id"] = str(user.pop("_id"))
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_admin_user(request: Request) -> dict:
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

async def check_brute_force(identifier: str):
    attempt = await db.login_attempts.find_one({"identifier": identifier})
    if attempt and attempt.get("count", 0) >= 5:
        lockout_time = attempt.get("lockout_until")
        if lockout_time and datetime.now(timezone.utc) < lockout_time:
            raise HTTPException(status_code=429, detail="Too many login attempts. Try again later.")
        else:
            await db.login_attempts.delete_one({"identifier": identifier})

async def record_failed_attempt(identifier: str):
    attempt = await db.login_attempts.find_one({"identifier": identifier})
    if attempt:
        new_count = attempt.get("count", 0) + 1
        update = {"count": new_count}
        if new_count >= 5:
            update["lockout_until"] = datetime.now(timezone.utc) + timedelta(minutes=15)
        await db.login_attempts.update_one({"identifier": identifier}, {"$set": update})
    else:
        await db.login_attempts.insert_one({"identifier": identifier, "count": 1, "created_at": datetime.now(timezone.utc)})

async def clear_failed_attempts(identifier: str):
    await db.login_attempts.delete_one({"identifier": identifier})

# ===================== AUTH ROUTES =====================

@api_router.post("/auth/register")
async def register(data: UserRegister, response: Response):
    email = data.email.lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_doc = {
        "email": email,
        "password_hash": hash_password(data.password),
        "name": data.name,
        "role": "customer",
        "created_at": datetime.now(timezone.utc)
    }
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)
    
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=86400, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")
    
    return {"id": user_id, "email": email, "name": data.name, "role": "customer"}

@api_router.post("/auth/login")
async def login(data: UserLogin, request: Request, response: Response):
    email = data.email.lower()
    ip = request.client.host if request.client else "unknown"
    identifier = f"{ip}:{email}"
    
    await check_brute_force(identifier)
    
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(data.password, user["password_hash"]):
        await record_failed_attempt(identifier)
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    await clear_failed_attempts(identifier)
    
    user_id = str(user["_id"])
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=86400, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")
    
    return {"id": user_id, "email": email, "name": user["name"], "role": user["role"]}

@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"message": "Logged out successfully"}

@api_router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    return user

@api_router.post("/auth/refresh")
async def refresh_token(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        access_token = create_access_token(str(user["_id"]), user["email"])
        response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=86400, path="/")
        return {"message": "Token refreshed"}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

@api_router.post("/auth/forgot-password")
async def forgot_password(data: ForgotPasswordRequest):
    email = data.email.lower()
    user = await db.users.find_one({"email": email})
    if not user:
        return {"message": "If email exists, reset link sent"}
    
    token = secrets.token_urlsafe(32)
    await db.password_reset_tokens.insert_one({
        "token": token,
        "user_id": user["_id"],
        "expires_at": datetime.now(timezone.utc) + timedelta(hours=1),
        "used": False
    })
    logger.info(f"Password reset link: /reset-password?token={token}")
    return {"message": "If email exists, reset link sent"}

@api_router.post("/auth/reset-password")
async def reset_password(data: ResetPasswordRequest):
    token_doc = await db.password_reset_tokens.find_one({"token": data.token, "used": False})
    if not token_doc:
        raise HTTPException(status_code=400, detail="Invalid or expired token")
    if datetime.now(timezone.utc) > token_doc["expires_at"]:
        raise HTTPException(status_code=400, detail="Token expired")
    
    await db.users.update_one({"_id": token_doc["user_id"]}, {"$set": {"password_hash": hash_password(data.new_password)}})
    await db.password_reset_tokens.update_one({"token": data.token}, {"$set": {"used": True}})
    return {"message": "Password reset successfully"}

# ===================== CATEGORY ROUTES =====================

@api_router.get("/categories")
async def get_categories():
    categories = await db.categories.find({}, {"_id": 1, "name_en": 1, "name_ar": 1, "icon": 1}).to_list(100)
    return [serialize_doc(c) for c in categories]

@api_router.post("/admin/categories")
async def create_category(data: CategoryCreate, user: dict = Depends(get_admin_user)):
    result = await db.categories.insert_one(data.model_dump())
    return {"id": str(result.inserted_id), **data.model_dump()}

@api_router.delete("/admin/categories/{category_id}")
async def delete_category(category_id: str, user: dict = Depends(get_admin_user)):
    await db.categories.delete_one({"_id": ObjectId(category_id)})
    return {"message": "Category deleted"}

# ===================== PRODUCT ROUTES =====================

@api_router.get("/products")
async def get_products(
    category: Optional[str] = None,
    search: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    featured: Optional[bool] = None,
    sort: Optional[str] = "newest",
    page: int = 1,
    limit: int = 12
):
    query = {}
    if category:
        query["category_id"] = category
    if search:
        query["$or"] = [
            {"name_en": {"$regex": search, "$options": "i"}},
            {"name_ar": {"$regex": search, "$options": "i"}}
        ]
    if min_price is not None:
        query["price"] = {"$gte": min_price}
    if max_price is not None:
        query.setdefault("price", {})["$lte"] = max_price
    if featured:
        query["featured"] = True
    
    sort_options = {"newest": ("created_at", -1), "price_asc": ("price", 1), "price_desc": ("price", -1), "rating": ("avg_rating", -1)}
    sort_field, sort_dir = sort_options.get(sort, ("created_at", -1))
    
    skip = (page - 1) * limit
    products = await db.products.find(query).sort(sort_field, sort_dir).skip(skip).limit(limit).to_list(limit)
    total = await db.products.count_documents(query)
    
    return {"products": [serialize_doc(p) for p in products], "total": total, "page": page, "pages": (total + limit - 1) // limit}

@api_router.get("/products/{product_id}")
async def get_product(product_id: str):
    product = await db.products.find_one({"_id": ObjectId(product_id)})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    reviews = await db.reviews.find({"product_id": product_id}).to_list(100)
    for r in reviews:
        user = await db.users.find_one({"_id": ObjectId(r["user_id"])}, {"name": 1})
        r["user_name"] = user["name"] if user else "Unknown"
    
    product_data = serialize_doc(product)
    product_data["reviews"] = [serialize_doc(r) for r in reviews]
    return product_data

@api_router.post("/admin/products")
async def create_product(data: ProductCreate, user: dict = Depends(get_admin_user)):
    product_doc = data.model_dump()
    product_doc["created_at"] = datetime.now(timezone.utc)
    product_doc["avg_rating"] = 0
    product_doc["review_count"] = 0
    result = await db.products.insert_one(product_doc)
    return {"id": str(result.inserted_id), **data.model_dump()}

@api_router.put("/admin/products/{product_id}")
async def update_product(product_id: str, data: ProductUpdate, user: dict = Depends(get_admin_user)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    await db.products.update_one({"_id": ObjectId(product_id)}, {"$set": update_data})
    return {"message": "Product updated"}

@api_router.delete("/admin/products/{product_id}")
async def delete_product(product_id: str, user: dict = Depends(get_admin_user)):
    await db.products.delete_one({"_id": ObjectId(product_id)})
    return {"message": "Product deleted"}

# ===================== FILE UPLOAD ROUTES =====================

@api_router.post("/upload/video")
async def upload_video(file: UploadFile = File(...), user: dict = Depends(get_admin_user)):
    # Validate file type
    allowed_types = ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo", "video/mpeg"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Only video files (MP4, WebM, MOV, AVI) are allowed")
    
    # Max 100MB
    max_size = 100 * 1024 * 1024
    
    # Generate unique filename
    ext = file.filename.rsplit(".", 1)[-1] if "." in file.filename else "mp4"
    filename = f"{uuid.uuid4().hex}.{ext}"
    file_path = UPLOAD_DIR / filename
    
    # Save file in chunks
    total_size = 0
    with open(file_path, "wb") as f:
        while True:
            chunk = await file.read(1024 * 1024)  # 1MB chunks
            if not chunk:
                break
            total_size += len(chunk)
            if total_size > max_size:
                f.close()
                file_path.unlink(missing_ok=True)
                raise HTTPException(status_code=400, detail="File too large. Maximum 100MB allowed")
            f.write(chunk)
    
    video_url = f"/api/uploads/{filename}"
    logger.info(f"Video uploaded: {filename} ({total_size / 1024 / 1024:.1f}MB)")
    
    return {"video_url": video_url, "filename": filename, "size": total_size}

@api_router.post("/upload/image")
async def upload_image(file: UploadFile = File(...), user: dict = Depends(get_admin_user)):
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Only image files (JPEG, PNG, WebP, GIF) are allowed")
    
    max_size = 10 * 1024 * 1024  # 10MB
    
    ext = file.filename.rsplit(".", 1)[-1] if "." in file.filename else "jpg"
    filename = f"{uuid.uuid4().hex}.{ext}"
    file_path = UPLOAD_DIR / filename
    
    total_size = 0
    with open(file_path, "wb") as f:
        while True:
            chunk = await file.read(1024 * 1024)
            if not chunk:
                break
            total_size += len(chunk)
            if total_size > max_size:
                f.close()
                file_path.unlink(missing_ok=True)
                raise HTTPException(status_code=400, detail="File too large. Maximum 10MB allowed")
            f.write(chunk)
    
    image_url = f"/api/uploads/{filename}"
    return {"image_url": image_url, "filename": filename, "size": total_size}

# ===================== CART ROUTES =====================

@api_router.get("/cart")
async def get_cart(user: dict = Depends(get_current_user)):
    cart = await db.carts.find_one({"user_id": user["id"]})
    if not cart:
        return {"items": [], "total": 0}
    
    items = []
    total = 0
    for item in cart.get("items", []):
        product = await db.products.find_one({"_id": ObjectId(item["product_id"])})
        if product:
            item_total = product["price"] * item["quantity"]
            items.append({
                "product_id": item["product_id"],
                "quantity": item["quantity"],
                "product": serialize_doc(product),
                "item_total": item_total
            })
            total += item_total
    
    return {"items": items, "total": total}

@api_router.post("/cart/add")
async def add_to_cart(data: CartItem, user: dict = Depends(get_current_user)):
    cart = await db.carts.find_one({"user_id": user["id"]})
    
    if not cart:
        await db.carts.insert_one({"user_id": user["id"], "items": [{"product_id": data.product_id, "quantity": data.quantity}]})
    else:
        existing_item = next((i for i in cart["items"] if i["product_id"] == data.product_id), None)
        if existing_item:
            await db.carts.update_one(
                {"user_id": user["id"], "items.product_id": data.product_id},
                {"$inc": {"items.$.quantity": data.quantity}}
            )
        else:
            await db.carts.update_one(
                {"user_id": user["id"]},
                {"$push": {"items": {"product_id": data.product_id, "quantity": data.quantity}}}
            )
    
    return {"message": "Added to cart"}

@api_router.put("/cart/update")
async def update_cart_item(data: CartItem, user: dict = Depends(get_current_user)):
    if data.quantity <= 0:
        await db.carts.update_one(
            {"user_id": user["id"]},
            {"$pull": {"items": {"product_id": data.product_id}}}
        )
    else:
        await db.carts.update_one(
            {"user_id": user["id"], "items.product_id": data.product_id},
            {"$set": {"items.$.quantity": data.quantity}}
        )
    return {"message": "Cart updated"}

@api_router.delete("/cart/remove/{product_id}")
async def remove_from_cart(product_id: str, user: dict = Depends(get_current_user)):
    await db.carts.update_one(
        {"user_id": user["id"]},
        {"$pull": {"items": {"product_id": product_id}}}
    )
    return {"message": "Removed from cart"}

@api_router.delete("/cart/clear")
async def clear_cart(user: dict = Depends(get_current_user)):
    await db.carts.delete_one({"user_id": user["id"]})
    return {"message": "Cart cleared"}

# ===================== REVIEW ROUTES =====================

@api_router.post("/reviews")
async def create_review(data: ReviewCreate, user: dict = Depends(get_current_user)):
    existing = await db.reviews.find_one({"product_id": data.product_id, "user_id": user["id"]})
    if existing:
        raise HTTPException(status_code=400, detail="You already reviewed this product")
    
    review_doc = {
        "product_id": data.product_id,
        "user_id": user["id"],
        "rating": data.rating,
        "comment": data.comment,
        "created_at": datetime.now(timezone.utc)
    }
    await db.reviews.insert_one(review_doc)
    
    # Update product avg rating
    reviews = await db.reviews.find({"product_id": data.product_id}).to_list(1000)
    avg_rating = sum(r["rating"] for r in reviews) / len(reviews)
    await db.products.update_one(
        {"_id": ObjectId(data.product_id)},
        {"$set": {"avg_rating": avg_rating, "review_count": len(reviews)}}
    )
    
    return {"message": "Review added"}

# ===================== ORDER ROUTES =====================

@api_router.get("/orders")
async def get_orders(user: dict = Depends(get_current_user)):
    orders = await db.orders.find({"user_id": user["id"]}).sort("created_at", -1).to_list(100)
    return [serialize_doc(o) for o in orders]

@api_router.get("/orders/{order_id}")
async def get_order_detail(order_id: str, user: dict = Depends(get_current_user)):
    order = await db.orders.find_one({"_id": ObjectId(order_id), "user_id": user["id"]})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return serialize_doc(order)

@api_router.get("/admin/orders")
async def get_all_orders(user: dict = Depends(get_admin_user)):
    orders = await db.orders.find({}).sort("created_at", -1).to_list(1000)
    return [serialize_doc(o) for o in orders]

@api_router.put("/admin/orders/{order_id}/status")
async def update_order_status(order_id: str, status: str, tracking_number: Optional[str] = None, tracking_url: Optional[str] = None, user: dict = Depends(get_admin_user)):
    update_data = {"status": status, "updated_at": datetime.now(timezone.utc)}
    if tracking_number:
        update_data["tracking_number"] = tracking_number
    if tracking_url:
        update_data["tracking_url"] = tracking_url
    await db.orders.update_one({"_id": ObjectId(order_id)}, {"$set": update_data})
    return {"message": "Order status updated"}

# ===================== WISHLIST ROUTES =====================

@api_router.get("/wishlist")
async def get_wishlist(user: dict = Depends(get_current_user)):
    wishlist = await db.wishlists.find_one({"user_id": user["id"]})
    if not wishlist:
        return {"items": []}
    
    items = []
    for product_id in wishlist.get("items", []):
        product = await db.products.find_one({"_id": ObjectId(product_id)})
        if product:
            items.append(serialize_doc(product))
    
    return {"items": items}

@api_router.post("/wishlist/add")
async def add_to_wishlist(data: WishlistItem, user: dict = Depends(get_current_user)):
    wishlist = await db.wishlists.find_one({"user_id": user["id"]})
    
    if not wishlist:
        await db.wishlists.insert_one({"user_id": user["id"], "items": [data.product_id]})
    else:
        if data.product_id not in wishlist.get("items", []):
            await db.wishlists.update_one(
                {"user_id": user["id"]},
                {"$push": {"items": data.product_id}}
            )
    
    return {"message": "Added to wishlist"}

@api_router.delete("/wishlist/remove/{product_id}")
async def remove_from_wishlist(product_id: str, user: dict = Depends(get_current_user)):
    await db.wishlists.update_one(
        {"user_id": user["id"]},
        {"$pull": {"items": product_id}}
    )
    return {"message": "Removed from wishlist"}

# ===================== COUPON ROUTES =====================

@api_router.get("/coupons")
async def get_coupons(user: dict = Depends(get_admin_user)):
    coupons = await db.coupons.find({}).to_list(100)
    return [serialize_doc(c) for c in coupons]

@api_router.post("/admin/coupons")
async def create_coupon(data: CouponCreate, user: dict = Depends(get_admin_user)):
    existing = await db.coupons.find_one({"code": data.code.upper()})
    if existing:
        raise HTTPException(status_code=400, detail="Coupon code already exists")
    
    coupon_doc = {
        "code": data.code.upper(),
        "discount_type": data.discount_type,
        "discount_value": data.discount_value,
        "min_order": data.min_order,
        "max_uses": data.max_uses,
        "used_count": 0,
        "expires_at": datetime.fromisoformat(data.expires_at) if data.expires_at else None,
        "is_active": True,
        "created_at": datetime.now(timezone.utc)
    }
    result = await db.coupons.insert_one(coupon_doc)
    return {"id": str(result.inserted_id), "code": data.code.upper()}

@api_router.delete("/admin/coupons/{coupon_id}")
async def delete_coupon(coupon_id: str, user: dict = Depends(get_admin_user)):
    await db.coupons.delete_one({"_id": ObjectId(coupon_id)})
    return {"message": "Coupon deleted"}

@api_router.post("/coupons/validate")
async def validate_coupon(data: CouponApply, user: dict = Depends(get_current_user)):
    coupon = await db.coupons.find_one({"code": data.code.upper(), "is_active": True})
    if not coupon:
        raise HTTPException(status_code=400, detail="Invalid coupon code")
    
    expires_at = coupon.get("expires_at")
    if expires_at:
        # Handle both aware and naive datetimes
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) > expires_at:
            raise HTTPException(status_code=400, detail="Coupon has expired")
    
    if coupon.get("used_count", 0) >= coupon.get("max_uses", 100):
        raise HTTPException(status_code=400, detail="Coupon usage limit reached")
    
    return {
        "valid": True,
        "code": coupon["code"],
        "discount_type": coupon["discount_type"],
        "discount_value": coupon["discount_value"],
        "min_order": coupon.get("min_order", 0)
    }

# ===================== BANNER ROUTES =====================

@api_router.get("/banners")
async def get_banners():
    banners = await db.banners.find({"is_active": True}).sort("position", 1).to_list(20)
    return [serialize_doc(b) for b in banners]

@api_router.get("/admin/banners")
async def get_all_banners(user: dict = Depends(get_admin_user)):
    banners = await db.banners.find({}).sort("position", 1).to_list(100)
    return [serialize_doc(b) for b in banners]

@api_router.post("/admin/banners")
async def create_banner(data: BannerCreate, user: dict = Depends(get_admin_user)):
    banner_doc = data.model_dump()
    banner_doc["created_at"] = datetime.now(timezone.utc)
    result = await db.banners.insert_one(banner_doc)
    return {"id": str(result.inserted_id), **data.model_dump()}

@api_router.put("/admin/banners/{banner_id}")
async def update_banner(banner_id: str, data: BannerCreate, user: dict = Depends(get_admin_user)):
    await db.banners.update_one({"_id": ObjectId(banner_id)}, {"$set": data.model_dump()})
    return {"message": "Banner updated"}

@api_router.delete("/admin/banners/{banner_id}")
async def delete_banner(banner_id: str, user: dict = Depends(get_admin_user)):
    await db.banners.delete_one({"_id": ObjectId(banner_id)})
    return {"message": "Banner deleted"}

# ===================== REWARD POINTS ROUTES =====================

@api_router.get("/rewards")
async def get_user_rewards(user: dict = Depends(get_current_user)):
    user_data = await db.users.find_one({"_id": ObjectId(user["id"])})
    points = user_data.get("reward_points", 0)
    
    # Get reward history
    history = await db.reward_history.find({"user_id": user["id"]}).sort("created_at", -1).to_list(50)
    
    return {
        "points": points,
        "points_value": points * 0.01,  # 100 points = 1 YR
        "history": [serialize_doc(h) for h in history]
    }

@api_router.post("/rewards/redeem")
async def redeem_rewards(data: RewardPointsRedeem, user: dict = Depends(get_current_user)):
    user_data = await db.users.find_one({"_id": ObjectId(user["id"])})
    current_points = user_data.get("reward_points", 0)
    
    if data.points > current_points:
        raise HTTPException(status_code=400, detail="Insufficient points")
    
    if data.points < 100:
        raise HTTPException(status_code=400, detail="Minimum 100 points required")
    
    # Create a discount coupon
    discount_value = data.points * 0.01  # 100 points = 1 YR
    coupon_code = f"REWARD{secrets.token_hex(4).upper()}"
    
    await db.coupons.insert_one({
        "code": coupon_code,
        "discount_type": "fixed",
        "discount_value": discount_value,
        "min_order": 0,
        "max_uses": 1,
        "used_count": 0,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=30),
        "is_active": True,
        "user_id": user["id"],
        "created_at": datetime.now(timezone.utc)
    })
    
    # Deduct points
    await db.users.update_one(
        {"_id": ObjectId(user["id"])},
        {"$inc": {"reward_points": -data.points}}
    )
    
    await db.reward_history.insert_one({
        "user_id": user["id"],
        "points": -data.points,
        "description": f"Redeemed for {discount_value:.2f} YR discount coupon",
        "coupon_code": coupon_code,
        "created_at": datetime.now(timezone.utc)
    })
    
    return {
        "coupon_code": coupon_code,
        "discount_value": discount_value,
        "message": f"Redeemed {data.points} points for {discount_value:.2f} YR discount"
    }

# ===================== PAYMENT ROUTES =====================

@api_router.post("/checkout")
async def create_checkout(data: CheckoutWithCoupon, request: Request, user: dict = Depends(get_current_user)):
    cart = await db.carts.find_one({"user_id": user["id"]})
    if not cart or not cart.get("items"):
        raise HTTPException(status_code=400, detail="Cart is empty")
    
    subtotal = 0.0
    items_data = []
    for item in cart["items"]:
        product = await db.products.find_one({"_id": ObjectId(item["product_id"])})
        if product:
            item_total = product["price"] * item["quantity"]
            subtotal += item_total
            items_data.append({
                "product_id": item["product_id"],
                "name": product["name_en"],
                "price": product["price"],
                "quantity": item["quantity"]
            })
    
    if subtotal <= 0:
        raise HTTPException(status_code=400, detail="Invalid cart total")
    
    # Apply coupon if provided
    discount = 0.0
    coupon_code = None
    if data.coupon_code:
        coupon = await db.coupons.find_one({"code": data.coupon_code.upper(), "is_active": True})
        if coupon:
            if coupon.get("expires_at") and datetime.now(timezone.utc) > coupon["expires_at"]:
                raise HTTPException(status_code=400, detail="Coupon has expired")
            if coupon.get("used_count", 0) >= coupon.get("max_uses", 100):
                raise HTTPException(status_code=400, detail="Coupon usage limit reached")
            if subtotal < coupon.get("min_order", 0):
                raise HTTPException(status_code=400, detail=f"Minimum order {coupon['min_order']} YR required for this coupon")
            
            coupon_code = coupon["code"]
            if coupon["discount_type"] == "percentage":
                discount = subtotal * (coupon["discount_value"] / 100)
            else:
                discount = min(coupon["discount_value"], subtotal)
    
    total = max(subtotal - discount, 0.01)  # Minimum $0.01 for Stripe
    
    origin_url = data.origin_url.rstrip("/")
    success_url = f"{origin_url}/checkout/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin_url}/cart"
    
    stripe_api_key = os.environ.get("STRIPE_API_KEY")
    host_url = str(request.base_url).rstrip("/")
    webhook_url = f"{host_url}/api/webhook/stripe"
    
    stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url=webhook_url)
    
    checkout_request = CheckoutSessionRequest(
        amount=float(total),
        currency="usd",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={"user_id": user["id"], "user_email": user["email"], "coupon_code": coupon_code or ""}
    )
    
    session: CheckoutSessionResponse = await stripe_checkout.create_checkout_session(checkout_request)
    
    # Create payment transaction record
    await db.payment_transactions.insert_one({
        "session_id": session.session_id,
        "user_id": user["id"],
        "user_email": user["email"],
        "subtotal": subtotal,
        "discount": discount,
        "coupon_code": coupon_code,
        "amount": total,
        "currency": "usd",
        "items": items_data,
        "payment_status": "pending",
        "created_at": datetime.now(timezone.utc)
    })
    
    return {"url": session.url, "session_id": session.session_id, "subtotal": subtotal, "discount": discount, "total": total}

@api_router.get("/checkout/status/{session_id}")
async def get_checkout_status(session_id: str, user: dict = Depends(get_current_user)):
    stripe_api_key = os.environ.get("STRIPE_API_KEY")
    stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url="")
    
    status: CheckoutStatusResponse = await stripe_checkout.get_checkout_status(session_id)
    
    # Update payment transaction
    transaction = await db.payment_transactions.find_one({"session_id": session_id})
    if transaction and transaction.get("payment_status") != "paid":
        new_status = "paid" if status.payment_status == "paid" else status.payment_status
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {"payment_status": new_status, "updated_at": datetime.now(timezone.utc)}}
        )
        
        # Create order if paid
        if status.payment_status == "paid":
            existing_order = await db.orders.find_one({"session_id": session_id})
            if not existing_order:
                # Update coupon usage if used
                if transaction.get("coupon_code"):
                    await db.coupons.update_one(
                        {"code": transaction["coupon_code"]},
                        {"$inc": {"used_count": 1}}
                    )
                
                await db.orders.insert_one({
                    "session_id": session_id,
                    "user_id": transaction["user_id"],
                    "user_email": transaction["user_email"],
                    "items": transaction["items"],
                    "subtotal": transaction.get("subtotal", transaction["amount"]),
                    "discount": transaction.get("discount", 0),
                    "coupon_code": transaction.get("coupon_code"),
                    "total": transaction["amount"],
                    "currency": "yer",
                    "status": "confirmed",
                    "payment_status": "paid",
                    "tracking_number": None,
                    "tracking_url": None,
                    "created_at": datetime.now(timezone.utc)
                })
                # Clear cart
                await db.carts.delete_one({"user_id": transaction["user_id"]})
                
                # Add reward points (1 point per $1 spent)
                reward_points = int(transaction["amount"])
                await add_reward_points(
                    transaction["user_id"],
                    reward_points,
                    f"Order #{session_id[-8:].upper()} - Earned {reward_points} points"
                )
                
                # Send order confirmation email
                await send_order_email(
                    transaction["user_email"],
                    session_id,
                    transaction["items"],
                    transaction["amount"],
                    transaction.get("discount", 0)
                )
    
    return {
        "status": status.status,
        "payment_status": status.payment_status,
        "amount_total": status.amount_total,
        "currency": status.currency
    }

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    signature = request.headers.get("Stripe-Signature", "")
    
    stripe_api_key = os.environ.get("STRIPE_API_KEY")
    stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url="")
    
    try:
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        logger.info(f"Webhook received: {webhook_response.event_type}")
        
        if webhook_response.payment_status == "paid":
            transaction = await db.payment_transactions.find_one({"session_id": webhook_response.session_id})
            if transaction and transaction.get("payment_status") != "paid":
                await db.payment_transactions.update_one(
                    {"session_id": webhook_response.session_id},
                    {"$set": {"payment_status": "paid", "updated_at": datetime.now(timezone.utc)}}
                )
                
                existing_order = await db.orders.find_one({"session_id": webhook_response.session_id})
                if not existing_order:
                    await db.orders.insert_one({
                        "session_id": webhook_response.session_id,
                        "user_id": transaction["user_id"],
                        "user_email": transaction["user_email"],
                        "items": transaction["items"],
                        "total": transaction["amount"],
                        "currency": "yer",
                        "status": "confirmed",
                        "payment_status": "paid",
                        "created_at": datetime.now(timezone.utc)
                    })
                    await db.carts.delete_one({"user_id": transaction["user_id"]})
        
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return {"status": "error"}

# ===================== ADMIN DASHBOARD =====================

@api_router.get("/admin/stats")
async def get_admin_stats(user: dict = Depends(get_admin_user)):
    total_products = await db.products.count_documents({})
    total_orders = await db.orders.count_documents({})
    total_users = await db.users.count_documents({})
    
    orders = await db.orders.find({"payment_status": "paid"}).to_list(1000)
    total_revenue = sum(o.get("total", 0) for o in orders)
    
    return {
        "total_products": total_products,
        "total_orders": total_orders,
        "total_users": total_users,
        "total_revenue": total_revenue
    }

# ===================== STARTUP =====================

@app.on_event("startup")
async def startup_event():
    # Create indexes
    await db.users.create_index("email", unique=True)
    await db.login_attempts.create_index("identifier")
    await db.password_reset_tokens.create_index("expires_at", expireAfterSeconds=0)
    await db.products.create_index([("name_en", "text"), ("name_ar", "text")])
    
    # Seed admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@store.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "Admin123!")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "name": "Admin",
            "role": "admin",
            "created_at": datetime.now(timezone.utc)
        })
        logger.info(f"Admin user created: {admin_email}")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})
        logger.info("Admin password updated")
    
    # Seed categories
    if await db.categories.count_documents({}) == 0:
        categories = [
            {"name_en": "Electronics", "name_ar": "إلكترونيات", "icon": "Smartphone"},
            {"name_en": "Fashion", "name_ar": "أزياء", "icon": "Shirt"},
            {"name_en": "Beauty", "name_ar": "جمال", "icon": "Sparkles"},
            {"name_en": "Home", "name_ar": "منزل", "icon": "Home"},
        ]
        await db.categories.insert_many(categories)
        logger.info("Categories seeded")
    
    # Seed products
    if await db.products.count_documents({}) == 0:
        categories = await db.categories.find({}).to_list(10)
        cat_map = {c["name_en"]: str(c["_id"]) for c in categories}
        
        products = [
            {"name_en": "Premium Wireless Headphones", "name_ar": "سماعات لاسلكية فاخرة", "description_en": "High-quality wireless headphones with noise cancellation", "description_ar": "سماعات لاسلكية عالية الجودة مع إلغاء الضوضاء", "price": 299.99, "category_id": cat_map.get("Electronics", ""), "image_url": "https://images.pexels.com/photos/6791447/pexels-photo-6791447.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", "stock": 50, "featured": True, "avg_rating": 4.5, "review_count": 12, "created_at": datetime.now(timezone.utc)},
            {"name_en": "Luxury Perfume Collection", "name_ar": "مجموعة عطور فاخرة", "description_en": "Exclusive designer fragrance", "description_ar": "عطر مصمم حصري", "price": 189.99, "category_id": cat_map.get("Beauty", ""), "image_url": "https://images.pexels.com/photos/3785784/pexels-photo-3785784.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", "stock": 30, "featured": True, "avg_rating": 4.8, "review_count": 28, "created_at": datetime.now(timezone.utc)},
            {"name_en": "Designer Straw Hat", "name_ar": "قبعة قش مصممة", "description_en": "Elegant summer accessory", "description_ar": "إكسسوار صيفي أنيق", "price": 79.99, "category_id": cat_map.get("Fashion", ""), "image_url": "https://images.unsplash.com/photo-1745284504844-7979176dc29b?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxOTJ8MHwxfHNlYXJjaHwzfHxtaW5pbWFsaXN0JTIwcHJvZHVjdCUyMGxpZmVzdHlsZXxlbnwwfHx8fDE3NzUwNDkwNTV8MA&ixlib=rb-4.1.0&q=85", "stock": 100, "featured": False, "avg_rating": 4.2, "review_count": 8, "created_at": datetime.now(timezone.utc)},
            {"name_en": "Smart Home Speaker", "name_ar": "مكبر صوت منزلي ذكي", "description_en": "Voice-controlled smart speaker", "description_ar": "مكبر صوت ذكي يتحكم بالصوت", "price": 149.99, "category_id": cat_map.get("Electronics", ""), "image_url": "https://images.unsplash.com/photo-1754254562873-2d38f519aba3?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxOTJ8MHwxfHNlYXJjaHw0fHxtaW5pbWFsaXN0JTIwcHJvZHVjdCUyMGxpZmVzdHlsZXxlbnwwfHx8fDE3NzUwNDkwNTV8MA&ixlib=rb-4.1.0&q=85", "stock": 75, "featured": True, "avg_rating": 4.6, "review_count": 45, "created_at": datetime.now(timezone.utc)},
            {"name_en": "Minimalist Watch", "name_ar": "ساعة بسيطة", "description_en": "Elegant timepiece for everyday wear", "description_ar": "ساعة أنيقة للاستخدام اليومي", "price": 249.99, "category_id": cat_map.get("Fashion", ""), "image_url": "https://images.pexels.com/photos/190819/pexels-photo-190819.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2", "stock": 40, "featured": True, "avg_rating": 4.7, "review_count": 33, "created_at": datetime.now(timezone.utc)},
            {"name_en": "Organic Skincare Set", "name_ar": "مجموعة العناية بالبشرة العضوية", "description_en": "Natural beauty essentials", "description_ar": "أساسيات الجمال الطبيعية", "price": 129.99, "category_id": cat_map.get("Beauty", ""), "image_url": "https://images.pexels.com/photos/3735149/pexels-photo-3735149.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2", "stock": 60, "featured": False, "avg_rating": 4.4, "review_count": 19, "created_at": datetime.now(timezone.utc)},
        ]
        await db.products.insert_many(products)
        logger.info("Products seeded")
    
    # Seed coupons
    if await db.coupons.count_documents({}) == 0:
        coupons = [
            {"code": "WELCOME10", "discount_type": "percentage", "discount_value": 10, "min_order": 50, "max_uses": 1000, "used_count": 0, "expires_at": datetime(2026, 12, 31, tzinfo=timezone.utc), "is_active": True, "created_at": datetime.now(timezone.utc)},
            {"code": "SAVE20", "discount_type": "percentage", "discount_value": 20, "min_order": 100, "max_uses": 500, "used_count": 0, "expires_at": datetime(2026, 12, 31, tzinfo=timezone.utc), "is_active": True, "created_at": datetime.now(timezone.utc)},
            {"code": "FLAT50", "discount_type": "fixed", "discount_value": 50, "min_order": 200, "max_uses": 200, "used_count": 0, "expires_at": datetime(2026, 12, 31, tzinfo=timezone.utc), "is_active": True, "created_at": datetime.now(timezone.utc)},
        ]
        await db.coupons.insert_many(coupons)
        logger.info("Coupons seeded")
    
    # Seed banners
    if await db.banners.count_documents({}) == 0:
        banners = [
            {
                "title_en": "New Arrivals",
                "title_ar": "وصل حديثاً",
                "subtitle_en": "Discover our latest collection of premium products",
                "subtitle_ar": "اكتشف أحدث مجموعتنا من المنتجات الفاخرة",
                "image_url": "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1200&h=400&fit=crop",
                "link_url": "/products?sort=newest",
                "is_active": True,
                "position": 0,
                "created_at": datetime.now(timezone.utc)
            },
            {
                "title_en": "Summer Sale",
                "title_ar": "تخفيضات الصيف",
                "subtitle_en": "Up to 50% off on selected items",
                "subtitle_ar": "خصم يصل إلى 50% على منتجات مختارة",
                "image_url": "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1200&h=400&fit=crop",
                "link_url": "/products",
                "is_active": True,
                "position": 1,
                "created_at": datetime.now(timezone.utc)
            },
            {
                "title_en": "Earn Rewards",
                "title_ar": "اكسب المكافآت",
                "subtitle_en": "Get 1 point for every $1 spent",
                "subtitle_ar": "احصل على نقطة واحدة لكل دولار تنفقه",
                "image_url": "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200&h=400&fit=crop",
                "link_url": "/rewards",
                "is_active": True,
                "position": 2,
                "created_at": datetime.now(timezone.utc)
            }
        ]
        await db.banners.insert_many(banners)
        logger.info("Banners seeded")
    
    # Write test credentials
    import pathlib
    pathlib.Path("/app/memory").mkdir(exist_ok=True)
    with open("/app/memory/test_credentials.md", "w") as f:
        f.write(f"# Test Credentials\n\n## Admin\n- Email: {admin_email}\n- Password: {admin_password}\n- Role: admin\n\n## Coupon Codes\n- WELCOME10: 10% off (min $50)\n- SAVE20: 20% off (min $100)\n- FLAT50: $50 off (min $200)\n\n## Auth Endpoints\n- POST /api/auth/register\n- POST /api/auth/login\n- POST /api/auth/logout\n- GET /api/auth/me\n")
    logger.info("Test credentials written")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

app.include_router(api_router)

# Serve uploaded files via /api/uploads/ path
from starlette.responses import FileResponse

@app.get("/api/uploads/{filename}")
async def serve_upload(filename: str):
    file_path = UPLOAD_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    # Determine content type
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    content_types = {
        "mp4": "video/mp4", "webm": "video/webm", "mov": "video/quicktime",
        "avi": "video/x-msvideo", "jpg": "image/jpeg", "jpeg": "image/jpeg",
        "png": "image/png", "webp": "image/webp", "gif": "image/gif"
    }
    content_type = content_types.get(ext, "application/octet-stream")
    return FileResponse(str(file_path), media_type=content_type)

@api_router.get("/health")
async def health():
    return {"status": "ok"}
