import React, { useCallback, useEffect, useState } from 'react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { api, inr, errMsg } from '../../lib/api';
import { toast } from 'sonner';
import { EmptyState, RowSkeletons, StatusBadge, label } from '../../components/shared/bits';
import { Package, CalendarClock, X } from 'lucide-react';

const NEXT = { placed: 'accepted', accepted: 'picking', picking: 'ready', ready: 'out_for_delivery', out_for_delivery: 'delivered' };
const NEXT_LABEL = { placed: 'Accept order', accepted: 'Start picking', picking: 'Mark ready', ready: 'Out for delivery', out_for_delivery: 'Mark delivered' };
const FILTERS = ['all', 'placed', 'accepted', 'picking', 'ready', 'out_for_delivery', 'delivered'];

const JOB_NEXT = { requested: 'accepted', accepted: 'en_route', en_route: 'in_progress', in_progress: 'completed' };
const JOB_NEXT_LABEL = { requested: 'Accept job', accepted: 'Start travel', en_route: 'Begin work', in_progress: 'Mark completed' };
const JOB_FILTERS = ['all', 'requested', 'accepted', 'en_route', 'in_progress', 'completed'];

export function OrdersAdmin() {
  const [orders, setOrders] = useState(null);
  const [filter, setFilter] = useState('all');
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(() => {
    api.get('/admin/orders').then(({ data }) => setOrders(data)).catch(() => setOrders([]));
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, [load]);

  const advance = async (order, status) => {
    setBusyId(order.id);
    try {
      const { data: updated } = await api.patch(`/admin/orders/${order.id}/status`, { status });
      toast.success(`${order.order_no} → ${label(status)}`);
      setOrders((prev) => (prev || []).map((o) => (o.id === order.id ? updated : o)));
      if (filter !== 'all' && filter !== status && status !== 'rejected') {
        setFilter(status);
      }
      load();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusyId(null);
    }
  };

  const filtered = (orders || []).filter((o) => filter === 'all' || o.status === filter);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-xl font-bold">All orders</h1>
        <p className="text-sm text-muted-foreground">
          Process grocery orders here if the store is slow — same steps as DailyPro: accept, pack, deliver, or reject a new order.
        </p>
      </div>
      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList className="h-auto flex-wrap">
          {FILTERS.map((f) => (
            <TabsTrigger key={f} data-testid={`admin-orders-filter-${f}`} value={f} className="text-xs capitalize">
              {f === 'all' ? 'All' : label(f)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {!orders ? <RowSkeletons /> : filtered.length === 0 ? (
        <EmptyState icon={Package} title="No orders here" subtitle={filter === 'placed' ? 'New customer orders will appear here.' : 'Nothing in this state right now.'} />
      ) : (
        <div data-testid="admin-orders-table" className="space-y-3">
          {filtered.map((o) => (
            <Card key={o.id} data-testid="admin-order-row" className="rounded-xl p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-bold">
                    {o.order_no}{' '}
                    <span className="font-normal text-muted-foreground">· {o.customer_name}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {o.store_name} · {o.customer_phone || 'no phone'} · {o.payment_method === 'razorpay' ? 'Paid online' : 'COD'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(o.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
                    {o.address?.line ? ` · ${o.address.line}, ${o.address.city}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={o.status} />
                  <span className="text-sm font-bold tabular-nums">{inr(o.total)}</span>
                </div>
              </div>
              <div className="mt-2 rounded-lg bg-muted/60 p-2 text-xs text-muted-foreground">
                {(o.items || []).map((it) => `${it.name} ×${it.qty}`).join(' · ') || 'No items'}
              </div>
              {NEXT[o.status] && (
                <div className="mt-3 flex gap-2">
                  <Button
                    data-testid="admin-order-advance-status-button"
                    size="sm"
                    disabled={busyId === o.id}
                    onClick={() => advance(o, NEXT[o.status])}
                  >
                    {NEXT_LABEL[o.status]}
                  </Button>
                  {o.status === 'placed' && (
                    <Button
                      data-testid="admin-order-reject-button"
                      size="sm"
                      variant="outline"
                      className="gap-1 text-destructive"
                      disabled={busyId === o.id}
                      onClick={() => advance(o, 'rejected')}
                    >
                      <X className="h-3.5 w-3.5" /> Reject
                    </Button>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export function BookingsAdmin() {
  const [bookings, setBookings] = useState(null);
  const [filter, setFilter] = useState('all');
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(() => {
    api.get('/admin/bookings').then(({ data }) => setBookings(data)).catch(() => setBookings([]));
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, [load]);

  const advance = async (booking, status) => {
    setBusyId(booking.id);
    try {
      const { data: updated } = await api.patch(`/admin/bookings/${booking.id}/status`, { status });
      toast.success(`${booking.booking_no} → ${label(status)}`);
      setBookings((prev) => (prev || []).map((b) => (b.id === booking.id ? updated : b)));
      if (filter !== 'all' && filter !== status && status !== 'declined') {
        setFilter(status);
      }
      load();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusyId(null);
    }
  };

  const filtered = (bookings || []).filter((b) => filter === 'all' || b.status === filter);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-xl font-bold">All bookings</h1>
        <p className="text-sm text-muted-foreground">
          Process service jobs here if the partner is slow — same steps as DailyPro: accept, travel, complete, or decline a new request.
        </p>
      </div>
      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList className="h-auto flex-wrap">
          {JOB_FILTERS.map((f) => (
            <TabsTrigger key={f} data-testid={`admin-bookings-filter-${f}`} value={f} className="text-xs capitalize">
              {f === 'all' ? 'All' : label(f)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {!bookings ? <RowSkeletons /> : filtered.length === 0 ? (
        <EmptyState icon={CalendarClock} title="No bookings here" subtitle={filter === 'requested' ? 'New booking requests will appear here.' : 'Nothing in this state right now.'} />
      ) : (
        <div data-testid="admin-bookings-table" className="space-y-3">
          {filtered.map((b) => (
            <Card key={b.id} data-testid="admin-booking-row" className="rounded-xl p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-bold">
                    {b.service_name}{' '}
                    <span className="font-normal text-muted-foreground">· {b.customer_name}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {b.booking_no} · {b.vendor_name} · {b.customer_phone || 'no phone'} · {b.payment_method === 'razorpay' ? 'Paid online' : 'COD'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {b.slot_date ? new Date(b.slot_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''} at {b.slot_time}
                    {b.address?.line ? ` · ${b.address.line}, ${b.address.city}` : ''}
                  </p>
                  {b.notes && <p className="mt-1 text-xs italic text-muted-foreground">“{b.notes}”</p>}
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={b.status} />
                  <span className="text-sm font-bold tabular-nums">{inr(b.price)}</span>
                </div>
              </div>
              {JOB_NEXT[b.status] && (
                <div className="mt-3 flex gap-2">
                  <Button
                    data-testid="admin-booking-advance-status-button"
                    size="sm"
                    disabled={busyId === b.id}
                    onClick={() => advance(b, JOB_NEXT[b.status])}
                  >
                    {JOB_NEXT_LABEL[b.status]}
                  </Button>
                  {b.status === 'requested' && (
                    <Button
                      data-testid="admin-booking-decline-button"
                      size="sm"
                      variant="outline"
                      className="gap-1 text-destructive"
                      disabled={busyId === b.id}
                      onClick={() => advance(b, 'declined')}
                    >
                      <X className="h-3.5 w-3.5" /> Reject
                    </Button>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
