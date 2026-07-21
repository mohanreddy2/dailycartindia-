import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Search, Store, Wrench, ChevronRight, ShoppingBasket, Milk, Apple, Cookie, SprayCan, Zap, Sparkles,
  Snowflake, Scissors, Settings, Shirt, Footprints, Utensils, Bug, Droplets, Flame, Camera, Car,
  Truck, Hammer, PenLine, Baby,
} from 'lucide-react';
import { Card } from '../../components/ui/card';
import { api } from '../../lib/api';
import { useLocationCtx } from '../../lib/store';
import { RatingPill, DistanceChip, VerifiedBadge, CardSkeletons, EmptyState } from '../../components/shared/bits';
import { Thumb } from '../../components/shared/thumb';

const CAT_ICONS = {
  'shopping-basket': ShoppingBasket, milk: Milk, apple: Apple, cookie: Cookie, 'spray-can': SprayCan,
  wrench: Wrench, zap: Zap, sparkles: Sparkles, snowflake: Snowflake, scissors: Scissors, settings: Settings,
  shirt: Shirt, footprints: Footprints, utensils: Utensils, bug: Bug, droplets: Droplets, flame: Flame,
  camera: Camera, car: Car, truck: Truck, hammer: Hammer, 'pen-line': PenLine, baby: Baby,
};

export function StoreCard({ store, onClick }) {
  return (
    <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.15 }}>
      <Card data-testid="store-card" onClick={onClick}
        className="cursor-pointer overflow-hidden rounded-xl border shadow-sm transition-shadow hover:shadow-md">
        <Thumb src={store.image} alt={store.name} className="h-24 w-full" />
        <div className="space-y-1.5 p-3">
          <p className="truncate text-sm font-semibold">{store.name}</p>
          <div className="flex flex-wrap items-center gap-1.5">
            <RatingPill rating={store.rating} count={store.review_count} />
            <DistanceChip km={store.distance_km} />
          </div>
          <div className="flex items-center gap-1.5">
            <VerifiedBadge />
            <span data-testid="store-card-open-status" className="text-xs text-muted-foreground">{store.is_open ? 'Open now' : 'Closed'}</span>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

export function ServiceVendorCard({ vendor, onClick }) {
  return (
    <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.15 }}>
      <Card data-testid="service-vendor-card" onClick={onClick}
        className="cursor-pointer overflow-hidden rounded-xl border shadow-sm transition-shadow hover:shadow-md">
        <Thumb src={vendor.image} alt={vendor.name} className="h-24 w-full" tone="serve" />
        <div className="space-y-1.5 p-3">
          <p className="truncate text-sm font-semibold">{vendor.name}</p>
          <div className="flex flex-wrap items-center gap-1.5">
            <RatingPill rating={vendor.rating} count={vendor.review_count} />
            <DistanceChip km={vendor.distance_km} />
          </div>
          <p className="truncate text-xs text-muted-foreground capitalize">{(vendor.category_slugs || []).map((s) => s.replace('-', ' ')).join(' · ')}</p>
        </div>
      </Card>
    </motion.div>
  );
}

export default function Home() {
  const { location } = useLocationCtx();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let live = true;
    setLoading(true);
    setError(null);
    Promise.all([
      api.get('/discovery', { params: { lat: location.lat, lng: location.lng, radius_km: 15 } }),
      cats.length ? Promise.resolve({ data: cats }) : api.get('/categories'),
    ])
      .then(([d, c]) => { if (live) { setData(d.data); setCats(c.data); } })
      .catch(() => { if (live) setError('Could not load nearby stores and services. Check your connection.'); })
      .finally(() => live && setLoading(false));
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.lat, location.lng]);

  const stores = data?.stores || [];
  const vendors = data?.service_vendors || [];

  return (
    <div className="space-y-8 py-5">
      {/* hero */}
      <section className="hero-mart grain relative overflow-hidden rounded-2xl border p-6 md:p-10">
        <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-2/5 md:block" aria-hidden>
          <img src="https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=60" alt=""
            className="h-full w-full object-cover [mask-image:linear-gradient(to_right,transparent,black_40%)]" loading="lazy" />
        </div>
        <div className="relative">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--primary))]">Near {location.name}</p>
        <h1 className="max-w-md font-display text-2xl font-bold tracking-tight md:text-4xl">
          Everything local, <span className="text-[hsl(var(--primary))]">delivered</span> & <span className="text-[hsl(var(--serve))]">fixed</span>
        </h1>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground md:text-base">
          Kirana groceries in 30–90 min and trusted home services — from stores & pros near you.
        </p>
        <button type="button" data-testid="hero-search-button" onClick={() => navigate('/search')}
          className="mt-5 flex w-full max-w-md items-center gap-2 rounded-xl border bg-card px-4 py-3.5 text-sm text-muted-foreground shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Search className="h-4 w-4 shrink-0 text-[hsl(var(--primary))]" aria-hidden /> Search ‘milk’, ‘ironing’, ‘AC repair’…
        </button>
        </div>
      </section>

      {/* categories */}
      <section>
        <h2 className="mb-3 font-display text-lg font-semibold">Shop & book by category</h2>
        <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto no-scrollbar pb-1" role="list">
          {cats.map((c) => {
            const Icon = CAT_ICONS[c.icon] || Store;
            const isSvc = c.kind === 'service';
            return (
              <button type="button" key={c.slug} data-testid="category-chip" role="listitem"
                onClick={() => navigate(`/search?category=${c.slug}&kind=${isSvc ? 'service' : 'mart'}`)}
                className={`flex shrink-0 snap-start items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${isSvc ? 'bg-[hsl(var(--serve-soft))] text-[hsl(var(--serve-soft-foreground))] hover:bg-[hsl(var(--serve-soft))]/70' : 'bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))] hover:bg-[hsl(var(--accent))]/70'}`}>
                <Icon className="h-4 w-4" aria-hidden /> {c.name}
              </button>
            );
          })}
        </div>
      </section>

      {error && <EmptyState icon={Store} title="Couldn’t load" subtitle={error} actionLabel="Retry" onAction={() => window.location.reload()} />}

      {/* stores */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
            <Store className="h-5 w-5 text-[hsl(var(--primary))]" /> Kirana stores near you
          </h2>
        </div>
        {loading ? <CardSkeletons n={4} /> : stores.length === 0 ? (
          <EmptyState icon={Store} title="No stores nearby yet" subtitle={`DailyCart hasn’t onboarded stores around ${location.name} yet. Try Hyderabad, Bangalore, Pune, Delhi, Vizag or Bhimavaram.`} />
        ) : (
          <div data-testid="nearby-stores-grid" className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {stores.map((s) => <StoreCard key={s.id} store={s} onClick={() => navigate(`/store/${s.id}`)} />)}
          </div>
        )}
      </section>

      {/* services */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
            <Wrench className="h-5 w-5 text-[hsl(var(--serve))]" /> Home services near you
          </h2>
        </div>
        {loading ? <CardSkeletons n={4} /> : vendors.length === 0 ? (
          <EmptyState icon={Wrench} title="No service pros nearby yet" subtitle="Try another city from the location picker." />
        ) : (
          <div data-testid="nearby-services-grid" className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {vendors.map((v) => <ServiceVendorCard key={v.id} vendor={v} onClick={() => navigate(`/pro/${v.id}`)} />)}
          </div>
        )}
      </section>

      {/* vendor cta */}
      <section className="rounded-2xl border bg-[hsl(var(--serve-soft))] p-6">
        <div className="flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h3 className="font-display text-lg font-semibold text-[hsl(var(--serve-soft-foreground))]">Own a store or provide services?</h3>
            <p className="text-sm text-[hsl(var(--serve-soft-foreground))]/80">Join DailyPro — get orders, manage inventory & grow your business.</p>
          </div>
          <button type="button" data-testid="become-vendor-button" onClick={() => navigate('/vendor')}
            className="inline-flex items-center gap-1 rounded-xl bg-[hsl(var(--serve))] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
            Become a partner <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </section>
    </div>
  );
}
