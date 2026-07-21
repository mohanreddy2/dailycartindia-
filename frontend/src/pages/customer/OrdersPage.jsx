import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Card } from '../../components/ui/card';
import { api, inr } from '../../lib/api';
import { useAuth } from '../../lib/store';
import { StatusBadge, EmptyState, RowSkeletons } from '../../components/shared/bits';
import { Package, CalendarClock } from 'lucide-react';

export default function OrdersPage() {
  const { user, loaded } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState(null);
  const [bookings, setBookings] = useState(null);

  useEffect(() => {
    if (!user) return;
    api.get('/orders/mine').then(({ data }) => setOrders(data)).catch(() => setOrders([]));
    api.get('/bookings/mine').then(({ data }) => setBookings(data)).catch(() => setBookings([]));
  }, [user]);

  if (loaded && !user) {
    return <div className="py-8"><EmptyState icon={Package} title="Login to see your orders" actionLabel="Login" onAction={() => navigate('/auth?next=/orders')} /></div>;
  }

  return (
    <div className="space-y-4 py-5">
      <h1 className="text-xl font-bold">My orders & bookings</h1>
      <Tabs defaultValue="orders">
        <TabsList className="grid w-full max-w-xs grid-cols-2">
          <TabsTrigger data-testid="orders-tab" value="orders">Mart orders</TabsTrigger>
          <TabsTrigger data-testid="bookings-tab" value="bookings">Service bookings</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="mt-4">
          {!orders ? <RowSkeletons /> : orders.length === 0 ? (
            <EmptyState icon={Package} title="No orders yet" subtitle="Order groceries from nearby kirana stores." actionLabel="Browse stores" onAction={() => navigate('/')} />
          ) : (
            <div className="space-y-2">
              {orders.map((o) => (
                <Card key={o.id} data-testid="order-list-item" className="flex cursor-pointer items-center gap-3 rounded-xl p-3 transition-shadow hover:shadow-md"
                  onClick={() => navigate(`/orders/${o.id}`)}>
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--accent))]">
                    <Package className="h-5 w-5 text-[hsl(var(--accent-foreground))]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{o.store_name}</p>
                    <p className="text-xs text-muted-foreground">{o.order_no} · {o.items.length} items · {new Date(o.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold tabular-nums">{inr(o.total)}</p>
                    <StatusBadge status={o.status} />
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="bookings" className="mt-4">
          {!bookings ? <RowSkeletons /> : bookings.length === 0 ? (
            <EmptyState icon={CalendarClock} title="No bookings yet" subtitle="Book trusted home services near you." actionLabel="Browse services" onAction={() => navigate('/')} />
          ) : (
            <div className="space-y-2">
              {bookings.map((b) => (
                <Card key={b.id} data-testid="booking-list-item" className="flex cursor-pointer items-center gap-3 rounded-xl p-3 transition-shadow hover:shadow-md"
                  onClick={() => navigate(`/bookings/${b.id}`)}>
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--serve-soft))]">
                    <CalendarClock className="h-5 w-5 text-[hsl(var(--serve-soft-foreground))]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{b.service_name}</p>
                    <p className="text-xs text-muted-foreground">{b.vendor_name} · {new Date(b.slot_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} {b.slot_time}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold tabular-nums">{inr(b.price)}</p>
                    <StatusBadge status={b.status} />
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
