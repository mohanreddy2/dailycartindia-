import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Separator } from '../../components/ui/separator';
import { api, inr, errMsg } from '../../lib/api';
import { useAuth, useCart, useLocationCtx } from '../../lib/store';
import { toast } from 'sonner';
import { CheckCircle2, Banknote, MapPin, ShoppingBag } from 'lucide-react';
import { EmptyState } from '../../components/shared/bits';

export default function Checkout() {
  const { groups, subtotal, count, clear } = useCart();
  const { user } = useAuth();
  const { location } = useLocationCtx();
  const navigate = useNavigate();
  const [addressLine, setAddressLine] = useState('');
  const [placing, setPlacing] = useState(false);
  const [placed, setPlaced] = useState(null);
  const idemKey = useMemo(() => `web-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, []);

  const groupList = Object.entries(groups);
  const deliveryTotal = groupList.reduce((s, [, g]) => s + Number(g.delivery_fee ?? 25), 0);
  const grandTotal = subtotal + deliveryTotal;

  const placeOrder = async () => {
    if (!user) { toast.info('Login to place your order'); navigate('/auth?next=/checkout'); return; }
    if (!addressLine.trim()) { toast.error('Enter your delivery address'); return; }
    setPlacing(true);
    try {
      const items = [];
      for (const [, g] of groupList) for (const it of g.items) items.push({ product_id: it.product.id, qty: it.qty });
      const { data } = await api.post('/orders/checkout', {
        items,
        address: { label: 'Home', line: addressLine, city: location.name, lat: location.lat, lng: location.lng },
        payment_method: 'cod',
        idempotency_key: idemKey,
      });
      clear();
      setPlaced(data.orders);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setPlacing(false);
    }
  };

  if (placed) {
    return (
      <div className="flex flex-col items-center py-12 text-center">
        <CheckCircle2 className="h-14 w-14 text-[hsl(var(--serve))]" />
        <h1 data-testid="order-placed-heading" className="mt-3 text-xl font-bold">Order placed!</h1>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          {placed.length > 1 ? `Split into ${placed.length} orders (one per store) so each store can start right away.` : 'Your store will confirm shortly.'}
        </p>
        <div className="mt-4 w-full max-w-sm space-y-2">
          {placed.map((o) => (
            <Card key={o.id} data-testid="placed-order-card" className="flex items-center justify-between rounded-xl p-3 text-left">
              <div>
                <p className="text-sm font-semibold">{o.store_name}</p>
                <p className="text-xs text-muted-foreground">{o.order_no} · {o.items.length} items</p>
              </div>
              <p className="text-sm font-bold tabular-nums">{inr(o.total)}</p>
            </Card>
          ))}
        </div>
        <div className="mt-5 flex gap-2">
          <Button data-testid="view-orders-button" onClick={() => navigate('/orders')}>Track orders</Button>
          <Button variant="outline" onClick={() => navigate('/')}>Continue shopping</Button>
        </div>
      </div>
    );
  }

  if (count === 0) {
    return <div className="py-8"><EmptyState icon={ShoppingBag} title="Your cart is empty" subtitle="Add items from nearby kirana stores to checkout." actionLabel="Browse stores" onAction={() => navigate('/')} /></div>;
  }

  return (
    <div className="mx-auto max-w-lg space-y-5 py-5">
      <h1 className="text-xl font-bold">Checkout</h1>

      <Card data-testid="checkout-address-card" className="space-y-2 rounded-xl p-4">
        <h2 className="flex items-center gap-2 font-display text-base font-semibold"><MapPin className="h-4 w-4 text-[hsl(var(--primary))]" /> Delivery address</h2>
        <Input data-testid="checkout-address-input" placeholder="House / flat, street, landmark" value={addressLine} onChange={(e) => setAddressLine(e.target.value)} />
        <p className="text-xs text-muted-foreground">City: {location.name} (change from the location picker on home)</p>
      </Card>

      {groupList.map(([vid, g]) => (
        <Card key={vid} data-testid="checkout-store-group" className="rounded-xl p-4">
          <p className="text-sm font-semibold">{g.store_name}</p>
          <Separator className="my-2" />
          {g.items.map(({ product, qty }) => (
            <div key={product.id} className="flex justify-between py-1 text-sm">
              <span className="text-muted-foreground">{product.name} × {qty}</span>
              <span className="tabular-nums">{inr(product.price * qty)}</span>
            </div>
          ))}
          <div className="flex justify-between py-1 text-sm">
            <span className="text-muted-foreground">Delivery fee</span>
            <span className="tabular-nums">{inr(g.delivery_fee ?? 25)}</span>
          </div>
          <Separator className="my-2" />
          <div className="flex justify-between text-sm font-semibold">
            <span>Store total</span>
            <span className="tabular-nums">{inr(g.subtotal + Number(g.delivery_fee ?? 25))}</span>
          </div>
        </Card>
      ))}

      <Card data-testid="checkout-payment-card" className="rounded-xl p-4">
        <h2 className="font-display text-base font-semibold">Payment</h2>
        <div data-testid="checkout-cod-option" className="mt-2 flex items-center gap-3 rounded-xl border-2 border-[hsl(var(--primary))] bg-[hsl(var(--accent))] p-3">
          <Banknote className="h-5 w-5 text-[hsl(var(--primary))]" />
          <div>
            <p className="text-sm font-semibold">Cash on delivery</p>
            <p className="text-xs text-muted-foreground">UPI & cards coming soon</p>
          </div>
        </div>
      </Card>

      <div className="rounded-xl border bg-card p-4">
        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Items ({count})</span><span className="tabular-nums">{inr(subtotal)}</span></div>
        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Delivery ({groupList.length} {groupList.length > 1 ? 'stores' : 'store'})</span><span className="tabular-nums">{inr(deliveryTotal)}</span></div>
        <Separator className="my-2" />
        <div className="flex justify-between font-semibold"><span>To pay</span><span data-testid="checkout-total-text" className="tabular-nums">{inr(grandTotal)}</span></div>
      </div>

      <Button data-testid="checkout-place-order-button" size="lg" className="w-full" disabled={placing} onClick={placeOrder}>
        {placing ? 'Placing order…' : `Place order · ${inr(grandTotal)}`}
      </Button>
    </div>
  );
}
