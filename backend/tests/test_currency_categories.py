"""
Backend API tests for KULJADEED e-commerce store
Testing: Currency (YR) display, Categories CRUD, Admin functionality
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://digital-marketplace-236.preview.emergentagent.com')

# Test credentials
ADMIN_EMAIL = "admin@store.com"
ADMIN_PASSWORD = "Admin123!"


class TestCategoriesAPI:
    """Test Categories CRUD operations"""
    
    def test_get_categories(self):
        """Test GET /api/categories returns list of categories"""
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 4  # Should have at least 4 seeded categories
        
        # Verify category structure
        for cat in data:
            assert "id" in cat
            assert "name_en" in cat
            assert "name_ar" in cat
            assert "icon" in cat
        print(f"✓ GET /api/categories returned {len(data)} categories")
    
    def test_admin_create_category(self):
        """Test POST /api/admin/categories creates a new category"""
        # First login as admin
        session = requests.Session()
        login_response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert login_response.status_code == 200, f"Admin login failed: {login_response.text}"
        
        # Create a new category
        new_category = {
            "name_en": "TEST_TestCategory",
            "name_ar": "فئة اختبار",
            "icon": "Package"
        }
        create_response = session.post(f"{BASE_URL}/api/admin/categories", json=new_category)
        assert create_response.status_code == 200, f"Create category failed: {create_response.text}"
        
        data = create_response.json()
        assert "id" in data
        assert data["name_en"] == new_category["name_en"]
        assert data["name_ar"] == new_category["name_ar"]
        
        # Verify category exists in list
        categories_response = session.get(f"{BASE_URL}/api/categories")
        categories = categories_response.json()
        category_names = [c["name_en"] for c in categories]
        assert new_category["name_en"] in category_names
        
        # Cleanup - delete the test category
        category_id = data["id"]
        delete_response = session.delete(f"{BASE_URL}/api/admin/categories/{category_id}")
        assert delete_response.status_code == 200
        print(f"✓ POST /api/admin/categories created and deleted test category")
    
    def test_admin_delete_category(self):
        """Test DELETE /api/admin/categories/{id} deletes a category"""
        session = requests.Session()
        login_response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert login_response.status_code == 200
        
        # Create a category to delete
        new_category = {
            "name_en": "TEST_ToDelete",
            "name_ar": "للحذف",
            "icon": "Trash2"
        }
        create_response = session.post(f"{BASE_URL}/api/admin/categories", json=new_category)
        assert create_response.status_code == 200
        category_id = create_response.json()["id"]
        
        # Delete the category
        delete_response = session.delete(f"{BASE_URL}/api/admin/categories/{category_id}")
        assert delete_response.status_code == 200
        
        # Verify category is deleted
        categories_response = session.get(f"{BASE_URL}/api/categories")
        categories = categories_response.json()
        category_ids = [c["id"] for c in categories]
        assert category_id not in category_ids
        print(f"✓ DELETE /api/admin/categories/{category_id} successfully deleted category")
    
    def test_unauthorized_create_category(self):
        """Test that non-admin cannot create categories"""
        response = requests.post(f"{BASE_URL}/api/admin/categories", json={
            "name_en": "Unauthorized",
            "name_ar": "غير مصرح",
            "icon": "Package"
        })
        assert response.status_code == 401
        print("✓ Unauthorized user cannot create categories")


class TestProductsAPI:
    """Test Products API - verify price data is returned correctly"""
    
    def test_get_products_with_prices(self):
        """Test GET /api/products returns products with prices"""
        response = requests.get(f"{BASE_URL}/api/products?limit=5")
        assert response.status_code == 200
        data = response.json()
        
        assert "products" in data
        assert len(data["products"]) > 0
        
        for product in data["products"]:
            assert "price" in product
            assert isinstance(product["price"], (int, float))
            assert product["price"] > 0
            print(f"  Product: {product['name_en']} - Price: {product['price']}")
        
        print(f"✓ GET /api/products returned {len(data['products'])} products with prices")
    
    def test_get_product_detail_with_price(self):
        """Test GET /api/products/{id} returns product with price"""
        # First get a product ID
        products_response = requests.get(f"{BASE_URL}/api/products?limit=1")
        products = products_response.json()["products"]
        if not products:
            pytest.skip("No products available")
        
        product_id = products[0]["id"]
        response = requests.get(f"{BASE_URL}/api/products/{product_id}")
        assert response.status_code == 200
        
        product = response.json()
        assert "price" in product
        assert isinstance(product["price"], (int, float))
        print(f"✓ GET /api/products/{product_id} returned price: {product['price']}")


class TestAdminDashboard:
    """Test Admin Dashboard API - verify revenue is returned"""
    
    def test_admin_stats_revenue(self):
        """Test GET /api/admin/stats returns revenue data"""
        session = requests.Session()
        login_response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert login_response.status_code == 200
        
        stats_response = session.get(f"{BASE_URL}/api/admin/stats")
        assert stats_response.status_code == 200
        
        stats = stats_response.json()
        assert "total_revenue" in stats
        assert "total_orders" in stats
        assert "total_products" in stats
        assert "total_users" in stats
        
        print(f"✓ Admin stats: Revenue={stats['total_revenue']}, Orders={stats['total_orders']}, Products={stats['total_products']}, Users={stats['total_users']}")


class TestOrdersAPI:
    """Test Orders API - verify order totals are returned"""
    
    def test_admin_orders_with_totals(self):
        """Test GET /api/admin/orders returns orders with totals"""
        session = requests.Session()
        login_response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert login_response.status_code == 200
        
        orders_response = session.get(f"{BASE_URL}/api/admin/orders")
        assert orders_response.status_code == 200
        
        orders = orders_response.json()
        assert isinstance(orders, list)
        
        for order in orders:
            assert "total" in order
            assert isinstance(order["total"], (int, float))
        
        print(f"✓ GET /api/admin/orders returned {len(orders)} orders")


class TestAuthAPI:
    """Test Authentication API"""
    
    def test_admin_login(self):
        """Test admin login with correct credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert data["role"] == "admin"
        assert data["email"] == ADMIN_EMAIL
        print(f"✓ Admin login successful: {data['email']}")
    
    def test_invalid_login(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "invalid@test.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("✓ Invalid login correctly rejected")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
