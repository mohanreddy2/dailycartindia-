import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { MapPin, Search, ShoppingCart, User, Home, Package, Crosshair, Minus, Plus, Trash2, LogIn } from 'lucide-react';
import { Button } from '../ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger, DrawerFooter } from '../ui/drawer';
import { Input } from '../ui/input';
import { Separator } from '../ui/separator';
import { toast } from 'sonner';
import { api, inr } from '../../lib/api';
import { useAuth, useCart, useLocationCtx } from '../../lib/store';
import { cn } from '../../lib/utils';
import { Thumb } from '../shared/thumb';

function LocationPicker() {
  const { location, setLocation } = useLocationCtx();
  const [cities, setCities] = useState([]);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');

  useEffect(() => {
    if (open && cities.length === 0) {
      api.get('/cities').then(({ data }) => setCities(data)).catch(() => {});
    }
  }, [open, cities.length]);

  const useGps = () => {
    if (!navigator.geolocation) { toast.error('Location not supported on this device'); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ name: 'Current location', lat: pos.coords.latitude, lng: pos.coords.longitude });
        setOpen(false);
        toast.success('Location updated');
      },
      () => toast.error('Could not get GPS location. Pick a city instead.'),
      { timeout: 8000 }
    );
  };

  const filtered = cities.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" data-testid="location-picker-button" aria-label={`Delivery location: ${location.name}`}
          className="flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-sm font-medium shadow-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <MapPin className="h-4 w-4 text-[hsl(var(--primary))]" aria-hidden />
          <span className="max-w-[120px] truncate">{location.name}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-3">
        <p className="mb-2 text-xs font-medium text-muted-foreground">Choose delivery city</p>
        <Button type="button" data-testid="location-picker-use-gps-button" variant="outline" size="sm" className="mb-2 w-full justify-start gap-2" onClick={useGps}>
          <Crosshair className="h-4 w-4 text-[hsl(var(--trust))]" aria-hidden /> Use my current location
        </Button>
        <Input data-testid="location-picker-search-input" placeholder="Search city…" value={q} onChange={(e) => setQ(e.target.value)} className="mb-2" aria-label="Search cities" />
        <div className="max-h-56 space-y-1 overflow-y-auto" role="listbox" aria-label="Cities">
          {filtered.map((c) => (
            <button type="button" key={c.id} data-testid="location-picker-city-option" role="option"
              className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => { setLocation({ name: c.name, lat: c.lat, lng: c.lng }); setOpen(false); }}>
              <span>{c.name}</span>
              <span className="text-xs text-muted-foreground">{c.state}</span>
            </button>
          ))}
          {filtered.length === 0 && <p className="px-2 py-3 text-center text-sm text-muted-foreground">No cities found</p>}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function CartDrawer({ children }) {
  const { groups, count, subtotal, add, dec, remove } = useCart();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const groupList = Object.entries(groups);

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>{children}</DrawerTrigger>
      <DrawerContent data-testid="cart-drawer" className="mx-auto max-w-lg">
        <DrawerHeader className="pb-2">
          <DrawerTitle className="font-display">Your cart {count > 0 && <span className="text-sm font-normal text-muted-foreground">· {count} items</span>}</DrawerTitle>
        </DrawerHeader>
        <div className="max-h-[50vh] overflow-y-auto px-4">
          {groupList.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">Your cart is empty. Add items from nearby stores.</p>
          )}
          {groupList.map(([vid, g]) => (
            <div key={vid} data-testid="cart-store-group" className="mb-4 rounded-xl border bg-card p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold">{g.store_name}</p>
                <p className="text-xs text-muted-foreground">Delivery {inr(g.delivery_fee ?? 25)}</p>
              </div>
              <Separator className="mb-2" />
              {g.items.map(({ product, qty }) => (
                <div key={product.id} className="flex items-center gap-2 py-1.5">
                  <Thumb src={product.image} alt={product.name} className="h-10 w-10 shrink-0 rounded-lg" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{product.name}</p>
                    <p className="text-xs text-muted-foreground">{product.unit} · {inr(product.price)}</p>
                  </div>
                  <div className="flex items-center gap-1 rounded-full border px-1">
                    <button type="button" data-testid="product-qty-decrement-button" aria-label={`Decrease ${product.name}`} className="p-1" onClick={() => dec(product.id)}><Minus className="h-3.5 w-3.5" aria-hidden /></button>
                    <span className="w-5 text-center text-sm font-semibold tabular-nums" aria-live="polite">{qty}</span>
                    <button type="button" data-testid="product-qty-increment-button" aria-label={`Increase ${product.name}`} className="p-1" onClick={() => add(product)}><Plus className="h-3.5 w-3.5" aria-hidden /></button>
                  </div>
                  <button type="button" aria-label={`Remove ${product.name}`} className="p-1 text-muted-foreground hover:text-destructive" onClick={() => remove(product.id)}>
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              ))}
              <p className="mt-1 text-right text-sm font-semibold">Subtotal {inr(g.subtotal)}</p>
            </div>
          ))}
        </div>
        <DrawerFooter>
          <Button data-testid="cart-checkout-button" size="lg" disabled={count === 0}
            onClick={() => { setOpen(false); navigate('/checkout'); }}>
            Checkout · {inr(subtotal)}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

export default function CustomerLayout() {
  const { user } = useAuth();
  const { count } = useCart();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { to: '/', icon: Home, label: 'Home', testid: 'bottom-nav-home' },
    { to: '/search', icon: Search, label: 'Search', testid: 'bottom-nav-search' },
    { to: '/orders', icon: Package, label: 'Orders', testid: 'bottom-nav-orders' },
    { to: '/account', icon: User, label: 'Account', testid: 'bottom-nav-account' },
  ];

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-8">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Link to="/" className="flex items-center gap-1 font-display text-lg font-bold tracking-tight">
            <span className="text-[hsl(var(--primary))]">Daily</span>Cart
          </Link>
          <LocationPicker />
          <div className="ml-auto flex items-center gap-2">
            <button type="button" data-testid="universal-search-open-button" aria-label="Open search"
              onClick={() => navigate('/search')}
              className="hidden items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-sm text-muted-foreground shadow-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:flex">
              <Search className="h-4 w-4" aria-hidden /> Search ‘milk’, ‘AC repair’…
            </button>
            <CartDrawer>
              <Button type="button" data-testid="cart-drawer-open-button" variant="outline" size="icon" className="relative rounded-full" aria-label={count > 0 ? `Cart, ${count} items` : 'Cart'}>
                <ShoppingCart className="h-5 w-5" aria-hidden />
                {count > 0 && (
                  <span data-testid="cart-count-badge" className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[hsl(var(--primary))] px-1 text-[10px] font-bold tabular-nums text-white">{count}</span>
                )}
              </Button>
            </CartDrawer>
            {user ? (
              <Button type="button" variant="ghost" size="icon" className="rounded-full" aria-label="Account" onClick={() => navigate('/account')}>
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[hsl(var(--accent))] text-sm font-bold text-[hsl(var(--accent-foreground))]" aria-hidden>
                  {user.name?.[0]?.toUpperCase() || 'U'}
                </span>
              </Button>
            ) : (
              <Button type="button" data-testid="header-login-button" size="sm" className="gap-1.5" onClick={() => navigate('/auth')}>
                <LogIn className="h-4 w-4" aria-hidden /> Login
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4">
        <Outlet />
      </main>

      <nav data-testid="bottom-nav" aria-label="Primary" className="fixed bottom-0 inset-x-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden">
        <div className="mx-auto flex h-16 max-w-lg items-stretch">
          {navItems.map(({ to, icon: Icon, label, testid }) => {
            const active = to === '/' ? pathname === '/' : pathname.startsWith(to);
            return (
              <Link key={to} to={to} data-testid={testid} aria-current={active ? 'page' : undefined}
                className={cn('flex flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors',
                  active ? 'text-[hsl(var(--primary))]' : 'text-muted-foreground')}>
                <Icon className="h-5 w-5" aria-hidden />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
