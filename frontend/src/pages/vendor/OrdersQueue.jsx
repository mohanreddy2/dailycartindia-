import React, { useCallback, useEffect, useState } from 'react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { api, inr, errMsg } from '../../lib/api';
import { toast } from 'sonner';
import { StatusBadge, EmptyState, RowSkeletons, label } from '../../components/shared/bits';
import { Package, X } from 'lucide-react';

const NEXT = { placed: 'accepted', accepted: 'picking', picking: 'ready', ready: 'out_for_delivery', out_for_delivery: 'delivered' };
const NEXT_LABEL = { placed: 'Accept order', accepted: 'Start picking', picking: 'Mark ready', ready: 'Out for delivery', out_for_delivery: 'Mark delivered' };
const FILTERS = ['all', 'placed', 'accepted', 'picking', 'ready', 'out_for_delivery', 'delivered'];

export default function OrdersQueue() {
  const [orders, setOrders] = useState(null);
  const [filter, setFilter] = useState('all');
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(() => {
    api.get('/vendor/orders').then(({ data }) => setOrders(data)).catch(() => setOrders([]));
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, [load]);

  const advance = async (order, status) => {
    setBusyId(order.id);
    try {
      const { data: updated } = await api.patch(`/vendor/orders/${order.id}/status`, { status });
      toast.success(`Order ${order.order_no} → ${label(status)}`);
      // Keep row visible after status change (filter follow) — fixes "advance vanished" UX
      setOrders((prev) => (prev || []).map((o) => (o.id === order.id ? updated : o)));
      if (filter !== 'all' && filter !== status && status !== 'rejected') {
        setFilter(status);
      }
      load();
    } catch (e) { toast.error(errMsg(e)); } finally { setBusyId(null); }
  };

  const filtered = (orders || []).filter((o) => filter === 'all' || o.status === filter);

  return (
    <div className="space-y-4">
      <h1 className="font-display text-xl font-bold">Orders</h1>
      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList className="h-auto flex-wrap">
          {FILTERS.map((f) => <TabsTrigger key={f} data-testid={`orders-filter-${f}`} value={f} className="text-xs capitalize">{f === 'all' ? 'All' : label(f)}</TabsTrigger>)}
        </TabsList>
      </Tabs>

      {!orders ? <RowSkeletons /> : filtered.length === 0 ? (
        <EmptyState icon={Package} title="No orders here" subtitle={filter === 'placed' ? 'New orders will appear here the moment customers place them.' : 'Nothing in this state right now.'} />
      ) : (
        <div data-testid="vendor-orders-table" className="space-y-3">
          {filtered.map((o) => (
            <Card key={o.id} data-testid="vendor-order-row" className="rounded-xl p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-bold">{o.order_no} <span className="font-normal text-muted-foreground">· {o.customer_name}</span></p>
                  <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })} · {o.address?.line}, {o.address?.city}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={o.status} />
                  <span className="text-sm font-bold tabular-nums">{inr(o.total)}</span>
                </div>
              </div>
              <div className="mt-2 rounded-lg bg-muted/60 p-2 text-xs text-muted-foreground">
                {o.items.map((it) => `${it.name} ×${it.qty}`).join(' · ')}
              </div>
              {NEXT[o.status] && (
                <div className="mt-3 flex gap-2">
                  <Button data-testid="vendor-order-advance-status-button" size="sm" disabled={busyId === o.id}
                    onClick={() => advance(o, NEXT[o.status])}>
                    {NEXT_LABEL[o.status]}
                  </Button>
                  {o.status === 'placed' && (
                    <Button data-testid="vendor-order-reject-button" size="sm" variant="outline" className="gap-1 text-destructive" disabled={busyId === o.id}
                      onClick={() => advance(o, 'rejected')}>
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
