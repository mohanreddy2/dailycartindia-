import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/card';
import { api, inr } from '../../lib/api';
import { StatusBadge, RowSkeletons } from '../../components/shared/bits';
import { Users, Store, ShieldCheck, Package, CalendarClock, MessageSquareWarning, IndianRupee, Activity } from 'lucide-react';

function Kpi({ icon: Icon, label, value, sub, onClick, highlight }) {
  return (
    <Card data-testid="admin-kpi-card" onClick={onClick}
      className={`rounded-xl p-4 ${onClick ? 'cursor-pointer transition-shadow hover:shadow-md' : ''} ${highlight ? 'border-[hsl(var(--warning))] bg-amber-50' : ''}`}>
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-bold tabular-nums">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </Card>
  );
}

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const load = () => api.get('/admin/oversight').then(({ data }) => setData(data)).catch(() => {});
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, []);

  if (!data) return <RowSkeletons n={4} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-bold">Operations overview</h1>
        <p className="text-sm text-muted-foreground">Live marketplace health — refreshes automatically.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi icon={IndianRupee} label="GMV (delivered + completed)" value={inr(data.gmv)} />
        <Kpi icon={ShieldCheck} label="KYC pending" value={data.kyc_pending} sub="awaiting review" onClick={() => navigate('/admin/kyc')} highlight={data.kyc_pending > 0} />
        <Kpi icon={Package} label="Active orders" value={data.orders_active} sub={`${data.orders_total} total`} onClick={() => navigate('/admin/orders')} />
        <Kpi icon={CalendarClock} label="Active bookings" value={data.bookings_active} sub={`${data.bookings_total} total`} onClick={() => navigate('/admin/bookings')} />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi icon={Store} label="Live vendors" value={data.vendors_live} sub={`${data.vendors_total} registered`} onClick={() => navigate('/admin/vendors')} />
        <Kpi icon={Users} label="Users" value={data.users} onClick={() => navigate('/admin/users')} />
        <Kpi icon={MessageSquareWarning} label="Open disputes" value={data.disputes_open} onClick={() => navigate('/admin/disputes')} highlight={data.disputes_open > 0} />
        <Kpi icon={Activity} label="Marketplace status" value="Healthy" sub="all systems live" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section>
          <h2 className="mb-2 font-display text-base font-semibold">Recent orders</h2>
          <Card data-testid="admin-recent-activity" className="divide-y rounded-xl">
            {data.recent_orders.length === 0 && <p className="p-4 text-sm text-muted-foreground">No orders yet.</p>}
            {data.recent_orders.map((o) => (
              <div key={o.id} className="flex items-center justify-between p-3 text-sm">
                <div>
                  <p className="font-medium">{o.order_no} · {o.store_name}</p>
                  <p className="text-xs text-muted-foreground">{o.customer_name} · {inr(o.total)}</p>
                </div>
                <StatusBadge status={o.status} />
              </div>
            ))}
          </Card>
        </section>
        <section>
          <h2 className="mb-2 font-display text-base font-semibold">Recent bookings</h2>
          <Card className="divide-y rounded-xl">
            {data.recent_bookings.length === 0 && <p className="p-4 text-sm text-muted-foreground">No bookings yet.</p>}
            {data.recent_bookings.map((b) => (
              <div key={b.id} className="flex items-center justify-between p-3 text-sm">
                <div>
                  <p className="font-medium">{b.booking_no} · {b.service_name}</p>
                  <p className="text-xs text-muted-foreground">{b.customer_name} → {b.vendor_name} · {inr(b.price)}</p>
                </div>
                <StatusBadge status={b.status} />
              </div>
            ))}
          </Card>
        </section>
      </div>
    </div>
  );
}
