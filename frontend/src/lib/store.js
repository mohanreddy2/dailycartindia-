import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { api } from './api';

// ---------------- Auth ----------------
const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('dc_token'));
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('dc_user')); } catch { return null; }
  });
  const [vendor, setVendor] = useState(null);
  const [loaded, setLoaded] = useState(false);

  const login = useCallback((tok, usr) => {
    localStorage.setItem('dc_token', tok);
    localStorage.setItem('dc_user', JSON.stringify(usr));
    setToken(tok);
    setUser(usr);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('dc_token');
    localStorage.removeItem('dc_user');
    setToken(null);
    setUser(null);
    setVendor(null);
  }, []);

  const refreshMe = useCallback(async () => {
    if (!localStorage.getItem('dc_token')) { setLoaded(true); return; }
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.user);
      setVendor(data.vendor);
      localStorage.setItem('dc_user', JSON.stringify(data.user));
    } catch {
      logout();
    } finally {
      setLoaded(true);
    }
  }, [logout]);

  useEffect(() => { refreshMe(); }, [refreshMe]);

  const value = useMemo(() => ({ token, user, vendor, setVendor, login, logout, refreshMe, loaded }),
    [token, user, vendor, login, logout, refreshMe, loaded]);
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
export const useAuth = () => useContext(AuthCtx);

// ---------------- Location ----------------
const DEFAULT_LOC = { name: 'Hyderabad', lat: 17.385, lng: 78.4867 };
const LocCtx = createContext(null);

export function LocationProvider({ children }) {
  const [location, setLocationState] = useState(() => {
    try { return JSON.parse(localStorage.getItem('dc_location')) || DEFAULT_LOC; } catch { return DEFAULT_LOC; }
  });
  const setLocation = useCallback((loc) => {
    localStorage.setItem('dc_location', JSON.stringify(loc));
    setLocationState(loc);
  }, []);
  const value = useMemo(() => ({ location, setLocation }), [location, setLocation]);
  return <LocCtx.Provider value={value}>{children}</LocCtx.Provider>;
}
export const useLocationCtx = () => useContext(LocCtx);

// ---------------- Cart ----------------
const CartCtx = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem('dc_cart')) || {}; } catch { return {}; }
  });

  useEffect(() => { localStorage.setItem('dc_cart', JSON.stringify(items)); }, [items]);

  const add = useCallback((product, store) => {
    setItems((prev) => {
      const cur = prev[product.id];
      return {
        ...prev,
        [product.id]: {
          product: {
            id: product.id, name: product.name, price: product.price, mrp: product.mrp,
            unit: product.unit, image: product.image, vendor_id: product.vendor_id,
            store_name: store?.name || product.store_name || '', delivery_fee: store?.delivery_fee,
          },
          qty: (cur?.qty || 0) + 1,
        },
      };
    });
  }, []);

  const dec = useCallback((productId) => {
    setItems((prev) => {
      const cur = prev[productId];
      if (!cur) return prev;
      if (cur.qty <= 1) {
        const { [productId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [productId]: { ...cur, qty: cur.qty - 1 } };
    });
  }, []);

  const remove = useCallback((productId) => {
    setItems((prev) => { const { [productId]: _, ...rest } = prev; return rest; });
  }, []);

  const clear = useCallback(() => setItems({}), []);

  const { count, groups, subtotal } = useMemo(() => {
    const list = Object.values(items);
    const count = list.reduce((s, i) => s + i.qty, 0);
    const subtotal = list.reduce((s, i) => s + i.product.price * i.qty, 0);
    const groups = {};
    for (const it of list) {
      const vid = it.product.vendor_id;
      if (!groups[vid]) groups[vid] = { store_name: it.product.store_name, delivery_fee: it.product.delivery_fee, items: [], subtotal: 0 };
      groups[vid].items.push(it);
      groups[vid].subtotal += it.product.price * it.qty;
    }
    return { count, groups, subtotal };
  }, [items]);

  const value = useMemo(() => ({ items, add, dec, remove, clear, count, groups, subtotal }),
    [items, add, dec, remove, clear, count, groups, subtotal]);
  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}
export const useCart = () => useContext(CartCtx);
