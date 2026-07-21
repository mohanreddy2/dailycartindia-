import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Store, Wrench, Package, Tag } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { api, inr } from '../../lib/api';
import { useCart, useLocationCtx } from '../../lib/store';
import { StoreCard, ServiceVendorCard } from './Home';
import { CardSkeletons, EmptyState, RatingPill, DistanceChip } from '../../components/shared/bits';
import { Thumb } from '../../components/shared/thumb';
import { toast } from 'sonner';

export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const { location } = useLocationCtx();
  const { add, items, dec } = useCart();
  const navigate = useNavigate();
  const [q, setQ] = useState(params.get('q') || '');
  const [results, setResults] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);
  const category = params.get('category');
  const kind = params.get('kind');

  const runSearch = (query) => {
    setLoading(true);
    const p = { lat: location.lat, lng: location.lng, radius_km: 15 };
    if (query) p.q = query;
    if (category) p.category = category;
    if (kind) p.kind = kind;
    api.get('/discovery', { params: p })
      .then(({ data }) => setResults(data))
      .catch(() => toast.error('Search failed. Try again.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { runSearch(params.get('q') || ''); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.lat, location.lng, category, kind]);

  const onChange = (val) => {
    setQ(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (val.trim().length >= 2) {
        api.get('/discovery/autocomplete', { params: { q: val } }).then(({ data }) => setSuggestions(data.suggestions)).catch(() => {});
      } else setSuggestions([]);
      runSearch(val);
      setParams((prev) => { const n = new URLSearchParams(prev); val ? n.set('q', val) : n.delete('q'); return n; }, { replace: true });
    }, 350);
  };

  const products = results?.products || [];
  const stores = results?.stores || [];
  const vendors = results?.service_vendors || [];
  const services = results?.services || [];
  const nothing = !loading && products.length === 0 && stores.length === 0 && vendors.length === 0 && services.length === 0;

  return (
    <div className="space-y-6 py-5">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input data-testid="universal-search-input" autoFocus value={q} onChange={(e) => onChange(e.target.value)}
          placeholder="Search products, stores, services…" className="h-12 rounded-xl pl-9 text-base" />
        {suggestions.length > 0 && q.trim().length >= 2 && (
          <div className="absolute z-30 mt-1 w-full rounded-xl border bg-popover p-1 shadow-lg">
            {suggestions.map((s, i) => (
              <button key={i} data-testid="universal-search-result-item"
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-accent"
                onClick={() => { setSuggestions([]); if (s.type === 'vendor') { navigate(s.vendor_type === 'mart' ? `/store/${s.id}` : `/pro/${s.id}`); } else { setQ(s.label); onChange(s.label); } }}>
                {s.type === 'category' ? <Tag className="h-4 w-4 text-muted-foreground" /> : s.type === 'service' ? <Wrench className="h-4 w-4 text-[hsl(var(--serve))]" /> : s.type === 'vendor' ? <Store className="h-4 w-4 text-[hsl(var(--primary))]" /> : <Package className="h-4 w-4 text-muted-foreground" />}
                <span>{s.label}</span>
                <span className="ml-auto text-xs capitalize text-muted-foreground">{s.type}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {loading && <CardSkeletons n={8} />}
      {nothing && <EmptyState icon={Search} title="Nothing found nearby" subtitle={`No matches around ${location.name}. Try a different search or switch city.`} />}

      {products.length > 0 && (
        <section>
          <h2 className="mb-3 font-display text-lg font-semibold">Products</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {products.map((p) => {
              const qty = items[p.id]?.qty || 0;
              return (
                <Card key={p.id} data-testid="product-tile" className="overflow-hidden rounded-xl">
                  <Thumb src={p.image} alt={p.name} className="h-24 w-full" />
                  <div className="space-y-1 p-3">
                    <p className="truncate text-sm font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.unit} · {p.store_name}</p>
                    <div className="flex items-center justify-between">
                      <p data-testid="product-price-text" className="text-sm font-bold tabular-nums">{inr(p.price)}</p>
                      {qty === 0 ? (
                        <Button data-testid="product-add-button" size="sm" className="h-8" onClick={() => add({ ...p, store_name: p.store_name })}>Add</Button>
                      ) : (
                        <div className="flex items-center gap-2 rounded-full border px-2 py-1">
                          <button data-testid="product-qty-decrement-button" onClick={() => dec(p.id)} className="text-sm font-bold">−</button>
                          <span className="text-sm font-semibold">{qty}</span>
                          <button data-testid="product-qty-increment-button" onClick={() => add(p)} className="text-sm font-bold">+</button>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {services.length > 0 && (
        <section>
          <h2 className="mb-3 font-display text-lg font-semibold">Services</h2>
          <div className="space-y-2">
            {services.map((s) => (
              <Card key={s.id} data-testid="service-result-card" className="flex cursor-pointer items-center gap-3 rounded-xl p-3 transition-shadow hover:shadow-md" onClick={() => navigate(`/book/${s.id}`)}>
                <Thumb src={s.image} alt={s.name} className="h-14 w-14 shrink-0 rounded-lg" tone="serve" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{s.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{s.vendor_name} · {s.duration_minutes} min</p>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <RatingPill rating={s.vendor_rating} />
                    <DistanceChip km={s.vendor_distance_km} />
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold tabular-nums">{inr(s.base_price)}</p>
                  <p className="text-xs text-[hsl(var(--serve))]">Book →</p>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {stores.length > 0 && (
        <section>
          <h2 className="mb-3 font-display text-lg font-semibold">Stores</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {stores.map((s) => <StoreCard key={s.id} store={s} onClick={() => navigate(`/store/${s.id}`)} />)}
          </div>
        </section>
      )}

      {vendors.length > 0 && (
        <section>
          <h2 className="mb-3 font-display text-lg font-semibold">Service providers</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {vendors.map((v) => <ServiceVendorCard key={v.id} vendor={v} onClick={() => navigate(`/pro/${v.id}`)} />)}
          </div>
        </section>
      )}
    </div>
  );
}
