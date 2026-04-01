#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime

class ECommerceAPITester:
    def __init__(self, base_url="https://digital-marketplace-236.preview.emergentagent.com"):
        self.base_url = base_url
        self.access_token = None
        self.admin_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_user_id = None
        self.test_product_id = None

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        return success

    def make_request(self, method, endpoint, data=None, headers=None, cookies=None):
        """Make HTTP request with error handling"""
        url = f"{self.base_url}/api/{endpoint}"
        default_headers = {'Content-Type': 'application/json'}
        if headers:
            default_headers.update(headers)
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=default_headers, cookies=cookies)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=default_headers, cookies=cookies)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=default_headers, cookies=cookies)
            elif method == 'DELETE':
                response = requests.delete(url, headers=default_headers, cookies=cookies)
            
            return response
        except Exception as e:
            print(f"Request error: {str(e)}")
            return None

    def test_health_check(self):
        """Test API health endpoint"""
        response = self.make_request('GET', 'health')
        if response and response.status_code == 200:
            return self.log_test("Health Check", True)
        return self.log_test("Health Check", False, f"Status: {response.status_code if response else 'No response'}")

    def test_get_categories(self):
        """Test getting categories"""
        response = self.make_request('GET', 'categories')
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, list) and len(data) > 0:
                return self.log_test("Get Categories", True, f"Found {len(data)} categories")
            return self.log_test("Get Categories", False, "No categories found")
        return self.log_test("Get Categories", False, f"Status: {response.status_code if response else 'No response'}")

    def test_get_products(self):
        """Test getting products"""
        response = self.make_request('GET', 'products')
        if response and response.status_code == 200:
            data = response.json()
            if 'products' in data and len(data['products']) > 0:
                self.test_product_id = data['products'][0]['id']  # Store for later tests
                return self.log_test("Get Products", True, f"Found {len(data['products'])} products")
            return self.log_test("Get Products", False, "No products found")
        return self.log_test("Get Products", False, f"Status: {response.status_code if response else 'No response'}")

    def test_get_featured_products(self):
        """Test getting featured products"""
        response = self.make_request('GET', 'products?featured=true')
        if response and response.status_code == 200:
            data = response.json()
            if 'products' in data:
                return self.log_test("Get Featured Products", True, f"Found {len(data['products'])} featured products")
            return self.log_test("Get Featured Products", False, "Invalid response format")
        return self.log_test("Get Featured Products", False, f"Status: {response.status_code if response else 'No response'}")

    def test_search_products(self):
        """Test product search"""
        response = self.make_request('GET', 'products?search=headphones')
        if response and response.status_code == 200:
            data = response.json()
            if 'products' in data:
                return self.log_test("Search Products", True, f"Search returned {len(data['products'])} results")
            return self.log_test("Search Products", False, "Invalid response format")
        return self.log_test("Search Products", False, f"Status: {response.status_code if response else 'No response'}")

    def test_user_registration(self):
        """Test user registration"""
        timestamp = datetime.now().strftime('%H%M%S')
        test_data = {
            "email": f"test_user_{timestamp}@example.com",
            "password": "TestPass123!",
            "name": f"Test User {timestamp}"
        }
        
        response = self.make_request('POST', 'auth/register', test_data)
        if response and response.status_code == 200:
            data = response.json()
            if 'id' in data and 'email' in data:
                self.test_user_id = data['id']
                # Extract cookies for session
                if 'Set-Cookie' in response.headers:
                    return self.log_test("User Registration", True, f"User created with ID: {data['id']}")
                return self.log_test("User Registration", False, "No session cookies set")
            return self.log_test("User Registration", False, "Invalid response format")
        return self.log_test("User Registration", False, f"Status: {response.status_code if response else 'No response'}")

    def test_admin_login(self):
        """Test admin login"""
        login_data = {
            "email": "admin@store.com",
            "password": "Admin123!"
        }
        
        response = self.make_request('POST', 'auth/login', login_data)
        if response and response.status_code == 200:
            data = response.json()
            if 'role' in data and data['role'] == 'admin':
                # Store cookies for admin requests
                self.admin_cookies = response.cookies
                return self.log_test("Admin Login", True, f"Admin logged in: {data['email']}")
            return self.log_test("Admin Login", False, f"Not admin role: {data.get('role', 'unknown')}")
        return self.log_test("Admin Login", False, f"Status: {response.status_code if response else 'No response'}")

    def test_user_login(self):
        """Test regular user login"""
        # First register a user
        timestamp = datetime.now().strftime('%H%M%S')
        register_data = {
            "email": f"login_test_{timestamp}@example.com",
            "password": "TestPass123!",
            "name": f"Login Test {timestamp}"
        }
        
        reg_response = self.make_request('POST', 'auth/register', register_data)
        if not reg_response or reg_response.status_code != 200:
            return self.log_test("User Login (Setup)", False, "Failed to create test user")
        
        # Now test login
        login_data = {
            "email": register_data["email"],
            "password": register_data["password"]
        }
        
        response = self.make_request('POST', 'auth/login', login_data)
        if response and response.status_code == 200:
            data = response.json()
            if 'role' in data and data['role'] == 'customer':
                self.user_cookies = response.cookies
                return self.log_test("User Login", True, f"User logged in: {data['email']}")
            return self.log_test("User Login", False, f"Unexpected role: {data.get('role', 'unknown')}")
        return self.log_test("User Login", False, f"Status: {response.status_code if response else 'No response'}")

    def test_admin_stats(self):
        """Test admin stats endpoint"""
        if not hasattr(self, 'admin_cookies'):
            return self.log_test("Admin Stats", False, "No admin session available")
        
        response = self.make_request('GET', 'admin/stats', cookies=self.admin_cookies)
        if response and response.status_code == 200:
            data = response.json()
            required_fields = ['total_products', 'total_orders', 'total_users', 'total_revenue']
            if all(field in data for field in required_fields):
                return self.log_test("Admin Stats", True, f"Stats: {data}")
            return self.log_test("Admin Stats", False, f"Missing fields in response: {data}")
        return self.log_test("Admin Stats", False, f"Status: {response.status_code if response else 'No response'}")

    def test_cart_operations(self):
        """Test cart operations (requires user login)"""
        if not hasattr(self, 'user_cookies') or not self.test_product_id:
            return self.log_test("Cart Operations", False, "No user session or product ID available")
        
        # Test get empty cart
        response = self.make_request('GET', 'cart', cookies=self.user_cookies)
        if not response or response.status_code != 200:
            return self.log_test("Cart Operations (Get Empty)", False, f"Status: {response.status_code if response else 'No response'}")
        
        # Test add to cart
        cart_data = {
            "product_id": self.test_product_id,
            "quantity": 2
        }
        
        response = self.make_request('POST', 'cart/add', cart_data, cookies=self.user_cookies)
        if response and response.status_code == 200:
            # Test get cart with items
            response = self.make_request('GET', 'cart', cookies=self.user_cookies)
            if response and response.status_code == 200:
                data = response.json()
                if 'items' in data and len(data['items']) > 0:
                    return self.log_test("Cart Operations", True, f"Cart has {len(data['items'])} items")
                return self.log_test("Cart Operations", False, "Cart is empty after adding item")
            return self.log_test("Cart Operations", False, "Failed to get cart after adding item")
        return self.log_test("Cart Operations", False, f"Failed to add to cart: {response.status_code if response else 'No response'}")

    def test_product_detail(self):
        """Test getting product details"""
        if not self.test_product_id:
            return self.log_test("Product Detail", False, "No product ID available")
        
        response = self.make_request('GET', f'products/{self.test_product_id}')
        if response and response.status_code == 200:
            data = response.json()
            required_fields = ['id', 'name_en', 'name_ar', 'price', 'description_en']
            if all(field in data for field in required_fields):
                return self.log_test("Product Detail", True, f"Product: {data['name_en']}")
            return self.log_test("Product Detail", False, f"Missing fields in response")
        return self.log_test("Product Detail", False, f"Status: {response.status_code if response else 'No response'}")

    def test_invalid_login(self):
        """Test login with invalid credentials"""
        login_data = {
            "email": "invalid@example.com",
            "password": "wrongpassword"
        }
        
        response = self.make_request('POST', 'auth/login', login_data)
        if response and response.status_code == 401:
            return self.log_test("Invalid Login (Expected Failure)", True, "Correctly rejected invalid credentials")
        return self.log_test("Invalid Login", False, f"Unexpected status: {response.status_code if response else 'No response'}")

    def test_unauthorized_admin_access(self):
        """Test accessing admin endpoint without admin role"""
        response = self.make_request('GET', 'admin/stats')
        if response and response.status_code == 401:
            return self.log_test("Unauthorized Admin Access (Expected Failure)", True, "Correctly blocked unauthorized access")
        return self.log_test("Unauthorized Admin Access", False, f"Unexpected status: {response.status_code if response else 'No response'}")

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting E-Commerce API Tests")
        print("=" * 50)
        
        # Basic API tests
        self.test_health_check()
        self.test_get_categories()
        self.test_get_products()
        self.test_get_featured_products()
        self.test_search_products()
        self.test_product_detail()
        
        # Authentication tests
        self.test_user_registration()
        self.test_admin_login()
        self.test_user_login()
        self.test_invalid_login()
        
        # Protected endpoint tests
        self.test_admin_stats()
        self.test_unauthorized_admin_access()
        
        # Cart functionality tests
        self.test_cart_operations()
        
        print("\n" + "=" * 50)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            return 1

def main():
    tester = ECommerceAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())