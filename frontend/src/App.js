import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from './components/ui/sonner';
import { AuthProvider, CartProvider, LocationProvider } from './lib/store';
import './App.css';

import CustomerLayout from './components/customer/CustomerLayout';
import Home from './pages/customer/Home';
import SearchPage from './pages/customer/SearchPage';
import StoreDetail from './pages/customer/StoreDetail';
import ServiceVendorDetail from './pages/customer/ServiceVendorDetail';
import BookService from './pages/customer/BookService';
import Checkout from './pages/customer/Checkout';
import OrdersPage from './pages/customer/OrdersPage';
import OrderDetail from './pages/customer/OrderDetail';
import BookingDetail from './pages/customer/BookingDetail';
import Account from './pages/customer/Account';
import AuthPage from './pages/customer/AuthPage';

import VendorLayout from './components/vendor/VendorLayout';
import VendorAuth from './pages/vendor/VendorAuth';
import Onboarding from './pages/vendor/Onboarding';
import VendorDashboard from './pages/vendor/VendorDashboard';
import OrdersQueue from './pages/vendor/OrdersQueue';
import JobsQueue from './pages/vendor/JobsQueue';
import Inventory from './pages/vendor/Inventory';
import ServicesManager from './pages/vendor/ServicesManager';
import Availability from './pages/vendor/Availability';
import Earnings from './pages/vendor/Earnings';
import VendorProfile from './pages/vendor/VendorProfile';

import AdminLayout from './components/admin/AdminLayout';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import KycQueue from './pages/admin/KycQueue';
import VendorsAdmin from './pages/admin/VendorsAdmin';
import UsersAdmin from './pages/admin/UsersAdmin';
import { OrdersAdmin, BookingsAdmin } from './pages/admin/OrdersAdmin';
import DisputesAdmin from './pages/admin/DisputesAdmin';

function App() {
  return (
    <AuthProvider>
      <LocationProvider>
        <CartProvider>
          <BrowserRouter>
            <Routes>
              {/* Customer portal */}
              <Route element={<CustomerLayout />}>
                <Route path="/" element={<Home />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/store/:id" element={<StoreDetail />} />
                <Route path="/pro/:id" element={<ServiceVendorDetail />} />
                <Route path="/book/:serviceId" element={<BookService />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/orders" element={<OrdersPage />} />
                <Route path="/orders/:id" element={<OrderDetail />} />
                <Route path="/bookings/:id" element={<BookingDetail />} />
                <Route path="/account" element={<Account />} />
                <Route path="/auth" element={<AuthPage />} />
              </Route>

              {/* Vendor portal */}
              <Route path="/vendor/auth" element={<VendorAuth />} />
              <Route path="/vendor/onboarding" element={<Onboarding />} />
              <Route path="/vendor" element={<VendorLayout />}>
                <Route index element={<VendorDashboard />} />
                <Route path="orders" element={<OrdersQueue />} />
                <Route path="jobs" element={<JobsQueue />} />
                <Route path="inventory" element={<Inventory />} />
                <Route path="services" element={<ServicesManager />} />
                <Route path="availability" element={<Availability />} />
                <Route path="earnings" element={<Earnings />} />
                <Route path="profile" element={<VendorProfile />} />
              </Route>

              {/* Admin portal */}
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboard />} />
                <Route path="kyc" element={<KycQueue />} />
                <Route path="vendors" element={<VendorsAdmin />} />
                <Route path="users" element={<UsersAdmin />} />
                <Route path="orders" element={<OrdersAdmin />} />
                <Route path="bookings" element={<BookingsAdmin />} />
                <Route path="disputes" element={<DisputesAdmin />} />
              </Route>
            </Routes>
          </BrowserRouter>
          <Toaster position="top-center" richColors />
        </CartProvider>
      </LocationProvider>
    </AuthProvider>
  );
}

export default App;
