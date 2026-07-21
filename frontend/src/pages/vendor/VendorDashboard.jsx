import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/card';
import { api, inr } from '../../lib/api';
import { RowSkeletons } from '../../components/shared/bits';
import { Package, Clock, Wallet, Star, Boxes, AlertTriangle, CalendarClock } from 'lucide-react';

function Kpi({ icon: Icon, label, value, sub, onClick, testid }) {
  return (
    <Card data-testid={testid || 'vendor-kpi-card'} onClick={onClick}
      className={`rounded-xl p-4 ${onClick ? 'cursor-pointer transition-shadow hover:shadow-md' : ''}`}>
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-bold tabular-nums">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </Card>
  );
}

export default function VendorDashboard() {
  const [data, setData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/vendor/dashboard').then(({ data }) => setData(data)).catch(() => setData({}));
  }, []);

  if (!data) return <RowSkeletons n={3} />;
  const v = data.vendor || {};
  const isMart = v.type === 'mart';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-bold">Namaste, {v.name} 👋</h1>
        <p className="text-sm text-muted-foreground">{isMart ? 'Here’s how your store is doing today.' : 'Here’s your job pipeline for today.'}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi icon={Clock} label={isMart ? 'New orders' : 'New requests'} value={data.pending ?? 0}
          sub="awaiting your action" onClick={() => navigate(isMart ? '/vendor/orders' : '/vendor/jobs')} testid="vendor-kpi-pending" />
        <Kpi icon={isMart ? Package : CalendarClock} label="In progress" value={data.active ?? 0} sub="being fulfilled" />
        <Kpi icon={Wallet} label="Earnings today" value={inr(data.earnings_today ?? 0)} sub={`lifetime ${inr(data.earnings_total ?? 0)}`} />
        <Kpi icon={Star} label="Rating" value={v.rating ? v.rating.toFixed(1) : '—'} sub={`${v.review_count || 0} reviews`} />
      </div>

      {isMart ? (
        <div className="grid grid-cols-2 gap-3">
          <Kpi icon={Boxes} label="Products live" value={data.products_count ?? 0} onClick={() => navigate('/vendor/inventory')} />
          <Kpi icon={AlertTriangle} label="Low stock items" value={data.low_stock ?? 0} sub="below 10 units" onClick={() => navigate('/vendor/inventory')} />
        </div>
      ) : (
        <Kpi icon={Boxes} label="Services listed" value={data.services_count ?? 0} onClick={() => navigate('/vendor/services')} />
      )}
    </div>
  );
}
