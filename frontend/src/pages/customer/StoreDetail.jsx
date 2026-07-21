import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { api, inr } from '../../lib/api';
import { useCart } from '../../lib/store';
import { RatingPill, VerifiedBadge, EmptyState } from '../../components/shared/bits';
import { Thumb } from '../../components/shared/thumb';
import { Store } from 'lucide-react';

export default function StoreDetail() {
  const { id } = useParams();
  const { add, dec, items } = useCart();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeCat, setActiveCat] = useState('all');

  useEffect(() => {
    setLoading(true);
    api.get(`/stores/${id}`)
      .then(({ data }) => setData(data))
      .catch(() => setError('Store not found or unavailable'))
      .finally(() => setLoading(false));
  }, [id]);

  const cats = useMemo(() => {
    const set = new Set((data?.products || []).map((p) => p.category_slug));
    return ['all', ...set];
  }, [data]);

  const products = (data?.products || []).filter((p) => activeCat === 'all' || p.category_slug === activeCat);

  if (loading) return <div className="space-y-4 py-5"><Skeleton className="h-36 rounded-2xl" /><Skeleton className="h-64 rounded-2xl" /></div>;
  if (error) return <div className="py-8"><EmptyState icon={Store} title={error} /></div>;

  const store = data.store;

  return (
    <div className="space-y-5 py-5">
      <Card className="overflow-hidden rounded-2xl">
        <Thumb src={store.image} alt={store.name} className="h-32 w-full md:h-44" />
        <div className="space-y-2 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <h1 data-testid="store-name-heading" className="text-xl font-bold">{store.name}</h1>
            <VerifiedBadge />
          </div>
          <p className="text-sm text-muted-foreground">{store.description}</p>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <RatingPill rating={store.rating} count={store.review_count} />
            <span className="text-xs text-muted-foreground">· {store.address}</span>
          </div>
          <div className="flex gap-3 text-xs text-muted-foreground">
            <span>Delivery fee {inr(store.delivery_fee)}</span>
            {store.min_order > 0 && <span>· Min order {inr(store.min_order)}</span>}
            <span>· {store.is_open ? 'Open now' : 'Closed'}</span>
          </div>
        </div>
      </Card>

      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {cats.map((c) => (
          <button key={c} data-testid="store-category-filter" onClick={() => setActiveCat(c)}
            className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium capitalize transition-colors ${activeCat === c ? 'bg-[hsl(var(--primary))] text-white border-transparent' : 'bg-card hover:bg-accent'}`}>
            {c === 'all' ? 'All items' : c.replace('-', ' & ')}
          </button>
        ))}
      </div>

      {products.length === 0 ? (
        <EmptyState icon={Store} title="No products in this category" />
      ) : (
        <div data-testid="store-products-grid" className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {products.map((p) => {
            const qty = items[p.id]?.qty || 0;
            const out = p.stock_qty <= 0 || !p.is_available;
            return (
              <Card key={p.id} data-testid="product-tile" className="overflow-hidden rounded-xl">
                <div className="relative h-28">
                  <Thumb src={p.image} alt={p.name} className="h-28 w-full" />
                  {p.stock_qty > 0 && p.stock_qty < 10 && (
                    <span className="absolute left-2 top-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">Only {p.stock_qty} left</span>
                  )}
                </div>
                <div className="space-y-1 p-3">
                  <p className="truncate text-sm font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.unit}</p>
                  <div className="flex items-center justify-between">
                    <div>
                      <p data-testid="product-price-text" className="text-sm font-bold tabular-nums">{inr(p.price)}</p>
                      {p.mrp > p.price && <p className="text-xs text-muted-foreground line-through tabular-nums">{inr(p.mrp)}</p>}
                    </div>
                    {out ? (
                      <span className="text-xs font-medium text-muted-foreground">Out of stock</span>
                    ) : qty === 0 ? (
                      <Button data-testid="product-add-button" size="sm" className="h-8" onClick={() => add(p, store)}>Add</Button>
                    ) : (
                      <div className="flex items-center gap-2 rounded-full border px-2 py-1">
                        <button data-testid="product-qty-decrement-button" onClick={() => dec(p.id)} className="text-sm font-bold">−</button>
                        <span className="text-sm font-semibold">{qty}</span>
                        <button data-testid="product-qty-increment-button" onClick={() => add(p, store)} className="text-sm font-bold">+</button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
