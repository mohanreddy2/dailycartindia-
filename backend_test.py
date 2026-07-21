"""DailyCart Backend API Test Suite - Comprehensive testing for all endpoints."""
import requests
import sys
from datetime import datetime, timedelta

BASE_URL = "https://cart-essentials-1.preview.emergentagent.com/api"

class DailyCartTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.tests_run = 0
        self.tests_passed = 0
        self.tests_failed = 0
        self.customer_token = None
        self.vendor_mart_token = None
        self.vendor_service_token = None
        self.admin_token = None
        self.test_data = {}

    def log(self, msg, level="INFO"):
        print(f"[{level}] {msg}")

    def test(self, name, method, endpoint, expected_status, data=None, token=None, params=None):
        """Run a single API test."""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if token:
            headers['Authorization'] = f'Bearer {token}'

        self.tests_run += 1
        self.log(f"\n{'='*60}")
        self.log(f"Test #{self.tests_run}: {name}")
        self.log(f"{'='*60}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PATCH':
                response = requests.patch(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)

            success = response.status_code == expected_status
            
            if success:
                self.tests_passed += 1
                self.log(f"✅ PASSED - Status: {response.status_code}", "PASS")
                try:
                    resp_json = response.json()
                    self.log(f"Response: {str(resp_json)[:200]}")
                    return True, resp_json
                except:
                    return True, {}
            else:
                self.tests_failed += 1
                self.log(f"❌ FAILED - Expected {expected_status}, got {response.status_code}", "FAIL")
                try:
                    self.log(f"Response: {response.json()}")
                except:
                    self.log(f"Response: {response.text[:200]}")
                return False, {}

        except Exception as e:
            self.tests_failed += 1
            self.log(f"❌ FAILED - Error: {str(e)}", "FAIL")
            return False, {}

    def run_all_tests(self):
        """Execute all test scenarios."""
        self.log("\n" + "="*80)
        self.log("DAILYCART BACKEND API TEST SUITE")
        self.log("="*80)

        # 1. Test Health
        self.log("\n### SECTION 1: HEALTH CHECK ###")
        self.test("Health Check", "GET", "health", 200)

        # 2. Test Auth - Email/Password
        self.log("\n### SECTION 2: AUTH - EMAIL/PASSWORD ###")
        
        # Register new customer
        timestamp = datetime.now().strftime("%H%M%S")
        new_email = f"test_customer_{timestamp}@dailycart.test"
        success, resp = self.test(
            "Register New Customer",
            "POST", "auth/register", 201,
            data={
                "name": "Test Customer",
                "email": new_email,
                "password": "Test@123",
                "phone": f"98765{timestamp[-5:]}"
            }
        )
        if success and resp.get("access_token"):
            self.test_data["new_customer_token"] = resp["access_token"]
            self.test_data["new_customer_id"] = resp["user"]["id"]

        # Login existing customer
        success, resp = self.test(
            "Login Existing Customer",
            "POST", "auth/login", 200,
            data={"email": "customer@dailycart.in", "password": "Demo@123"}
        )
        if success and resp.get("access_token"):
            self.customer_token = resp["access_token"]
            self.test_data["customer_id"] = resp["user"]["id"]

        # Login mart vendor
        success, resp = self.test(
            "Login Mart Vendor",
            "POST", "auth/login", 200,
            data={"email": "vendor.mart@dailycart.in", "password": "Demo@123"}
        )
        if success and resp.get("access_token"):
            self.vendor_mart_token = resp["access_token"]
            self.test_data["vendor_mart_id"] = resp["user"]["id"]

        # Login service vendor
        success, resp = self.test(
            "Login Service Vendor",
            "POST", "auth/login", 200,
            data={"email": "vendor.service@dailycart.in", "password": "Demo@123"}
        )
        if success and resp.get("access_token"):
            self.vendor_service_token = resp["access_token"]
            self.test_data["vendor_service_id"] = resp["user"]["id"]

        # Login admin
        success, resp = self.test(
            "Login Admin",
            "POST", "auth/login", 200,
            data={"email": "admin@dailycart.in", "password": "Admin@123"}
        )
        if success and resp.get("access_token"):
            self.admin_token = resp["access_token"]
            self.test_data["admin_id"] = resp["user"]["id"]

        # 3. Test Auth - OTP
        self.log("\n### SECTION 3: AUTH - OTP ###")
        
        test_phone = f"9876543{timestamp[-3:]}"
        success, resp = self.test(
            "Send OTP",
            "POST", "auth/otp/send", 200,
            data={"phone": test_phone}
        )
        if success and resp.get("dev_otp"):
            dev_otp = resp["dev_otp"]
            self.log(f"Dev OTP received: {dev_otp}")
            
            # Verify OTP
            success, resp = self.test(
                "Verify OTP",
                "POST", "auth/otp/verify", 200,
                data={"phone": test_phone, "otp": dev_otp, "name": "OTP User"}
            )
            if success and resp.get("access_token"):
                self.test_data["otp_user_token"] = resp["access_token"]

        # 4. Test Discovery - Geo-based
        self.log("\n### SECTION 4: DISCOVERY - GEO-BASED ###")
        
        # Hyderabad discovery
        success, resp = self.test(
            "Discovery - Hyderabad",
            "GET", "discovery", 200,
            params={"lat": 17.385, "lng": 78.4867, "radius_km": 10}
        )
        if success:
            hyd_stores = resp.get("stores", [])
            hyd_services = resp.get("service_vendors", [])
            self.log(f"Found {len(hyd_stores)} stores and {len(hyd_services)} service vendors in Hyderabad")
            if hyd_stores:
                self.test_data["hyd_store_id"] = hyd_stores[0]["id"]
            if hyd_services:
                self.test_data["hyd_service_vendor_id"] = hyd_services[0]["id"]

        # Pune discovery
        success, resp = self.test(
            "Discovery - Pune",
            "GET", "discovery", 200,
            params={"lat": 18.5204, "lng": 73.8567, "radius_km": 10}
        )
        if success:
            pune_stores = resp.get("stores", [])
            pune_services = resp.get("service_vendors", [])
            self.log(f"Found {len(pune_stores)} stores and {len(pune_services)} service vendors in Pune")

        # Search for products
        success, resp = self.test(
            "Discovery - Search 'rice'",
            "GET", "discovery", 200,
            params={"lat": 17.385, "lng": 78.4867, "radius_km": 10, "q": "rice"}
        )
        if success:
            products = resp.get("products", [])
            self.log(f"Found {len(products)} products matching 'rice'")
            if products:
                self.test_data["product_id_1"] = products[0]["id"]
                self.test_data["product_vendor_id"] = products[0].get("vendor_id")

        # 5. Test Store Detail
        self.log("\n### SECTION 5: STORE & SERVICE DETAILS ###")
        
        if self.test_data.get("hyd_store_id"):
            success, resp = self.test(
                "Get Store Detail",
                "GET", f"stores/{self.test_data['hyd_store_id']}", 200
            )
            if success:
                products = resp.get("products", [])
                if len(products) >= 2:
                    self.test_data["product_id_1"] = products[0]["id"]
                    self.test_data["product_id_2"] = products[1]["id"]
                    self.test_data["store_vendor_id"] = products[0]["vendor_id"]

        if self.test_data.get("hyd_service_vendor_id"):
            success, resp = self.test(
                "Get Service Vendor Detail",
                "GET", f"service-vendors/{self.test_data['hyd_service_vendor_id']}", 200
            )
            if success:
                services = resp.get("services", [])
                if services:
                    self.test_data["service_id"] = services[0]["id"]

        # 6. Test Checkout - Anonymous (should fail)
        self.log("\n### SECTION 6: CHECKOUT - AUTH REQUIRED ###")
        
        if self.test_data.get("product_id_1"):
            self.test(
                "Checkout Without Auth (should fail 401)",
                "POST", "orders/checkout", 401,
                data={
                    "items": [{"product_id": self.test_data["product_id_1"], "qty": 1}],
                    "address": {"label": "Home", "line": "Test Address", "city": "Hyderabad"}
                }
            )

        # 7. Test Multi-Store Checkout
        self.log("\n### SECTION 7: MULTI-STORE CHECKOUT ###")
        
        if self.customer_token and self.test_data.get("product_id_1") and self.test_data.get("product_id_2"):
            # First, get products from different stores
            success, resp = self.test(
                "Discovery for Multi-Store Products",
                "GET", "discovery", 200,
                params={"lat": 17.385, "lng": 78.4867, "radius_km": 10}
            )
            
            if success:
                stores = resp.get("stores", [])
                if len(stores) >= 2:
                    # Get products from first store
                    success1, resp1 = self.test(
                        "Get Store 1 Products",
                        "GET", f"stores/{stores[0]['id']}", 200
                    )
                    # Get products from second store
                    success2, resp2 = self.test(
                        "Get Store 2 Products",
                        "GET", f"stores/{stores[1]['id']}", 200
                    )
                    
                    if success1 and success2:
                        prods1 = resp1.get("products", [])
                        prods2 = resp2.get("products", [])
                        
                        if prods1 and prods2:
                            # Checkout with items from 2 different stores
                            success, resp = self.test(
                                "Multi-Store Checkout (2 stores)",
                                "POST", "orders/checkout", 200,
                                token=self.customer_token,
                                data={
                                    "items": [
                                        {"product_id": prods1[0]["id"], "qty": 1},
                                        {"product_id": prods2[0]["id"], "qty": 1}
                                    ],
                                    "address": {
                                        "label": "Home",
                                        "line": "Test Address, Banjara Hills",
                                        "city": "Hyderabad",
                                        "lat": 17.385,
                                        "lng": 78.4867
                                    },
                                    "payment_method": "cod"
                                }
                            )
                            
                            if success:
                                orders = resp.get("orders", [])
                                self.log(f"Created {len(orders)} sub-orders from multi-store checkout")
                                if len(orders) >= 1:
                                    self.test_data["order_id_1"] = orders[0]["id"]
                                    self.test_data["order_vendor_id"] = orders[0]["vendor_id"]
                                if len(orders) >= 2:
                                    self.test_data["order_id_2"] = orders[1]["id"]

        # 8. Test Order Status Flow
        self.log("\n### SECTION 8: VENDOR ORDER STATUS FLOW ###")
        
        if self.vendor_mart_token:
            # Get vendor's orders
            success, resp = self.test(
                "Get Vendor Orders",
                "GET", "vendor/orders", 200,
                token=self.vendor_mart_token,
                params={"status": "placed"}
            )
            
            if success and resp:
                orders = resp if isinstance(resp, list) else []
                if orders:
                    order_id = orders[0]["id"]
                    self.test_data["vendor_order_id"] = order_id
                    
                    # Test valid status transitions
                    self.test(
                        "Order Status: placed → accepted",
                        "PATCH", f"vendor/orders/{order_id}/status", 200,
                        token=self.vendor_mart_token,
                        data={"status": "accepted"}
                    )
                    
                    self.test(
                        "Order Status: accepted → picking",
                        "PATCH", f"vendor/orders/{order_id}/status", 200,
                        token=self.vendor_mart_token,
                        data={"status": "picking"}
                    )
                    
                    self.test(
                        "Order Status: picking → ready",
                        "PATCH", f"vendor/orders/{order_id}/status", 200,
                        token=self.vendor_mart_token,
                        data={"status": "ready"}
                    )
                    
                    self.test(
                        "Order Status: ready → out_for_delivery",
                        "PATCH", f"vendor/orders/{order_id}/status", 200,
                        token=self.vendor_mart_token,
                        data={"status": "out_for_delivery"}
                    )
                    
                    self.test(
                        "Order Status: out_for_delivery → delivered",
                        "PATCH", f"vendor/orders/{order_id}/status", 200,
                        token=self.vendor_mart_token,
                        data={"status": "delivered"}
                    )
                    
                    # Test invalid transition
                    self.test(
                        "Order Status: Invalid transition (should fail 400)",
                        "PATCH", f"vendor/orders/{order_id}/status", 400,
                        token=self.vendor_mart_token,
                        data={"status": "picking"}
                    )

        # 9. Test Bookings
        self.log("\n### SECTION 9: SERVICE BOOKINGS ###")
        
        if self.customer_token and self.test_data.get("service_id"):
            # Get available slots
            tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
            success, resp = self.test(
                "Get Service Slots",
                "GET", f"services/{self.test_data['service_id']}/slots", 200,
                params={"date": tomorrow}
            )
            
            available_slot = None
            if success:
                slots = resp.get("slots", [])
                for slot in slots:
                    if slot.get("available"):
                        available_slot = slot["time"]
                        break
            
            if available_slot:
                # Create booking
                success, resp = self.test(
                    "Create Service Booking",
                    "POST", "bookings", 200,
                    token=self.customer_token,
                    data={
                        "service_id": self.test_data["service_id"],
                        "slot_date": tomorrow,
                        "slot_time": available_slot,
                        "address": {
                            "label": "Home",
                            "line": "Test Address",
                            "city": "Hyderabad"
                        },
                        "notes": "Test booking"
                    }
                )
                
                if success:
                    self.test_data["booking_id"] = resp["id"]
                    self.test_data["booking_vendor_id"] = resp["vendor_id"]
                    
                    # Test slot conflict
                    self.test(
                        "Create Booking - Slot Conflict (should fail 409)",
                        "POST", "bookings", 409,
                        token=self.customer_token,
                        data={
                            "service_id": self.test_data["service_id"],
                            "slot_date": tomorrow,
                            "slot_time": available_slot,
                            "address": {
                                "label": "Home",
                                "line": "Test Address",
                                "city": "Hyderabad"
                            }
                        }
                    )

        # 10. Test Booking Status Flow
        self.log("\n### SECTION 10: VENDOR BOOKING STATUS FLOW ###")
        
        if self.vendor_service_token:
            # Get vendor's jobs
            success, resp = self.test(
                "Get Vendor Jobs",
                "GET", "vendor/jobs", 200,
                token=self.vendor_service_token,
                params={"status": "requested"}
            )
            
            if success and resp:
                jobs = resp if isinstance(resp, list) else []
                if jobs:
                    job_id = jobs[0]["id"]
                    
                    # Test valid status transitions
                    self.test(
                        "Booking Status: requested → accepted",
                        "PATCH", f"vendor/jobs/{job_id}/status", 200,
                        token=self.vendor_service_token,
                        data={"status": "accepted"}
                    )
                    
                    self.test(
                        "Booking Status: accepted → en_route",
                        "PATCH", f"vendor/jobs/{job_id}/status", 200,
                        token=self.vendor_service_token,
                        data={"status": "en_route"}
                    )
                    
                    self.test(
                        "Booking Status: en_route → in_progress",
                        "PATCH", f"vendor/jobs/{job_id}/status", 200,
                        token=self.vendor_service_token,
                        data={"status": "in_progress"}
                    )
                    
                    self.test(
                        "Booking Status: in_progress → completed",
                        "PATCH", f"vendor/jobs/{job_id}/status", 200,
                        token=self.vendor_service_token,
                        data={"status": "completed"}
                    )
                    
                    self.test_data["completed_booking_id"] = job_id

        # 11. Test Reviews
        self.log("\n### SECTION 11: REVIEWS ###")
        
        if self.customer_token and self.test_data.get("vendor_order_id"):
            # Try to review before delivery (should fail)
            success, resp = self.test(
                "Review Before Delivery (should fail 400)",
                "POST", "reviews", 400,
                token=self.customer_token,
                data={
                    "order_id": self.test_data.get("order_id_1"),
                    "rating": 5,
                    "comment": "Great service!"
                }
            )
            
            # Review after delivery
            if self.test_data.get("vendor_order_id"):
                success, resp = self.test(
                    "Review After Delivery",
                    "POST", "reviews", 200,
                    token=self.customer_token,
                    data={
                        "order_id": self.test_data["vendor_order_id"],
                        "rating": 5,
                        "comment": "Excellent service!"
                    }
                )
                
                if success:
                    # Try duplicate review (should fail)
                    self.test(
                        "Duplicate Review (should fail 409)",
                        "POST", "reviews", 409,
                        token=self.customer_token,
                        data={
                            "order_id": self.test_data["vendor_order_id"],
                            "rating": 4,
                            "comment": "Another review"
                        }
                    )

        # 12. Test Vendor Onboarding
        self.log("\n### SECTION 12: VENDOR ONBOARDING ###")
        
        if self.test_data.get("new_customer_token"):
            success, resp = self.test(
                "Vendor Onboarding - New Vendor",
                "POST", "vendor/onboarding", 200,
                token=self.test_data["new_customer_token"],
                data={
                    "type": "mart",
                    "name": f"Test Store {timestamp}",
                    "description": "Test store for automated testing",
                    "category_slugs": ["grocery"],
                    "address": "Test Address, Hyderabad",
                    "city": "Hyderabad",
                    "lat": 17.385,
                    "lng": 78.4867,
                    "min_order": 100,
                    "delivery_fee": 30,
                    "kyc_id_type": "aadhaar",
                    "kyc_id_number": "1234567890"
                }
            )
            
            if success:
                self.test_data["new_vendor_id"] = resp["id"]
                self.log(f"New vendor created with KYC status: {resp.get('kyc_status')}")
                
                # Verify vendor is NOT in discovery (kyc pending)
                success, resp = self.test(
                    "Discovery - Verify KYC Pending Vendor NOT Visible",
                    "GET", "discovery", 200,
                    params={"lat": 17.385, "lng": 78.4867, "radius_km": 10}
                )
                
                if success:
                    stores = resp.get("stores", [])
                    vendor_visible = any(s["id"] == self.test_data["new_vendor_id"] for s in stores)
                    if not vendor_visible:
                        self.log("✅ KYC pending vendor correctly NOT visible in discovery")
                    else:
                        self.log("❌ KYC pending vendor incorrectly visible in discovery")

        # 13. Test Admin KYC Approval
        self.log("\n### SECTION 13: ADMIN KYC MANAGEMENT ###")
        
        if self.admin_token and self.test_data.get("new_vendor_id"):
            # Get KYC queue
            success, resp = self.test(
                "Get KYC Queue",
                "GET", "admin/kyc", 200,
                token=self.admin_token,
                params={"status": "pending"}
            )
            
            # Approve KYC
            success, resp = self.test(
                "Approve Vendor KYC",
                "PATCH", f"admin/kyc/{self.test_data['new_vendor_id']}", 200,
                token=self.admin_token,
                data={"decision": "approved", "note": "Test approval"}
            )
            
            if success:
                self.log(f"Vendor KYC approved: {resp.get('kyc_status')}")
                
                # Verify vendor is NOW in discovery
                success, resp = self.test(
                    "Discovery - Verify Approved Vendor IS Visible",
                    "GET", "discovery", 200,
                    params={"lat": 17.385, "lng": 78.4867, "radius_km": 10}
                )
                
                if success:
                    stores = resp.get("stores", [])
                    vendor_visible = any(s["id"] == self.test_data["new_vendor_id"] for s in stores)
                    if vendor_visible:
                        self.log("✅ Approved vendor correctly visible in discovery")
                    else:
                        self.log("❌ Approved vendor NOT visible in discovery")
            
            # Deactivate vendor
            success, resp = self.test(
                "Deactivate Vendor",
                "PATCH", f"admin/vendors/{self.test_data['new_vendor_id']}/active", 200,
                token=self.admin_token,
                data={"is_active": False}
            )
            
            if success:
                # Verify vendor is NOT in discovery (deactivated)
                success, resp = self.test(
                    "Discovery - Verify Deactivated Vendor NOT Visible",
                    "GET", "discovery", 200,
                    params={"lat": 17.385, "lng": 78.4867, "radius_km": 10}
                )
                
                if success:
                    stores = resp.get("stores", [])
                    vendor_visible = any(s["id"] == self.test_data["new_vendor_id"] for s in stores)
                    if not vendor_visible:
                        self.log("✅ Deactivated vendor correctly NOT visible in discovery")
                    else:
                        self.log("❌ Deactivated vendor incorrectly visible in discovery")

        # 14. Test Disputes
        self.log("\n### SECTION 14: DISPUTES ###")
        
        if self.customer_token and self.test_data.get("order_id_1"):
            # Create dispute
            success, resp = self.test(
                "Create Dispute",
                "POST", "disputes", 200,
                token=self.customer_token,
                data={
                    "order_id": self.test_data["order_id_1"],
                    "subject": "Test dispute",
                    "description": "Automated test dispute"
                }
            )
            
            if success:
                self.test_data["dispute_id"] = resp["id"]
                
                # Admin get disputes
                if self.admin_token:
                    success, resp = self.test(
                        "Admin Get Disputes",
                        "GET", "admin/disputes", 200,
                        token=self.admin_token,
                        params={"status": "open"}
                    )
                    
                    # Resolve dispute
                    if self.test_data.get("dispute_id"):
                        self.test(
                            "Admin Resolve Dispute",
                            "PATCH", f"admin/disputes/{self.test_data['dispute_id']}/resolve", 200,
                            token=self.admin_token,
                            data={"resolution": "Resolved via automated test"}
                        )

        # 15. Test Admin Oversight
        self.log("\n### SECTION 15: ADMIN OVERSIGHT ###")
        
        if self.admin_token:
            success, resp = self.test(
                "Admin Oversight Dashboard",
                "GET", "admin/oversight", 200,
                token=self.admin_token
            )
            
            if success:
                self.log(f"Users: {resp.get('users')}")
                self.log(f"Vendors Total: {resp.get('vendors_total')}")
                self.log(f"KYC Pending: {resp.get('kyc_pending')}")
                self.log(f"Vendors Live: {resp.get('vendors_live')}")
                self.log(f"Orders Total: {resp.get('orders_total')}")
                self.log(f"Bookings Total: {resp.get('bookings_total')}")
                self.log(f"GMV: ₹{resp.get('gmv')}")

        # Print Summary
        self.print_summary()

    def print_summary(self):
        """Print test execution summary."""
        self.log("\n" + "="*80)
        self.log("TEST EXECUTION SUMMARY")
        self.log("="*80)
        self.log(f"Total Tests Run: {self.tests_run}")
        self.log(f"Tests Passed: {self.tests_passed} ✅")
        self.log(f"Tests Failed: {self.tests_failed} ❌")
        
        if self.tests_run > 0:
            success_rate = (self.tests_passed / self.tests_run) * 100
            self.log(f"Success Rate: {success_rate:.1f}%")
        
        self.log("="*80)
        
        return 0 if self.tests_failed == 0 else 1


def main():
    tester = DailyCartTester()
    exit_code = tester.run_all_tests()
    sys.exit(exit_code)


if __name__ == "__main__":
    main()
