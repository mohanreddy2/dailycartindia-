import React, { useEffect, useState } from 'react';
import { Card } from '../../components/ui/card';
import { api, inr } from '../../lib/api';
import { EmptyState, RowSkeletons } from '../../components/shared/bits';
import { Wallet, IndianRupee, ReceiptText } from 'lucide-react';

export default function Earnings() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/vendor/earnings').then(({ data }) => setData(data)).catch(() => setData({ total: 0, today: 0, count: 0, entries: [] }));
  }, []);

  if (!data) return <RowSkeletons />;

  return (
    <div className="space-y-5">
      <h1 className="font-display text-xl font-bold">Earnings</h1>

      <div className="grid grid-cols-3 gap-3">
        <Card className="rounded-xl p-4">
          <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><IndianRupee className="h-3.5 w-3.5" /> Today</p>
          <p data-testid="earnings-today-text" className="mt-1 text-xl font-bold tabular-nums">{inr(data.today)}</p>
        </Card>
        <Card className="rounded-xl p-4">
          <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><Wallet className="h-3.5 w-3.5" /> Lifetime</p>
          <p data-testid="earnings-total-text" className="mt-1 text-xl font-bold tabular-nums">{inr(data.total)}</p>
        </Card>
        <Card className="rounded-xl p-4">
          <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><ReceiptText className="h-3.5 w-3.5" /> Completed</p>
          <p className="mt-1 text-xl font-bold tabular-nums">{data.count}</p>
        </Card>
      </div>

      <section>
        <h2 className="mb-2 font-display text-base font-semibold">Payout history</h2>
        {data.entries.length === 0 ? (
          <EmptyState icon={Wallet} title="No earnings yet" subtitle="Complete orders or jobs to start earning. COD amounts are collected directly by you." />
        ) : (
          <Card className="divide-y rounded-xl">
            {data.entries.map((e) => (
              <div key={e.id} data-testid="earnings-entry-row" className="flex items-center justify-between p-3 text-sm">
                <div>
                  <p className="font-medium">{e.label}</p>
                  <p className="text-xs text-muted-foreground">{e.ref} · {new Date(e.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                </div>
                <p className="font-bold tabular-nums text-[hsl(var(--serve))]">+{inr(e.amount)}</p>
              </div>
            ))}
          </Card>
        )}
      </section>
    </div>
  );
}
