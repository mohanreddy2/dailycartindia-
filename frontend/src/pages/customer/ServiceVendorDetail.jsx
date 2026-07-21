import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { Separator } from '../../components/ui/separator';
import { api, inr } from '../../lib/api';
import { RatingPill, VerifiedBadge, EmptyState } from '../../components/shared/bits';
import { Thumb } from '../../components/shared/thumb';
import { Wrench, Clock, Star } from 'lucide-react';

export default function ServiceVendorDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    api.get(`/service-vendors/${id}`)
      .then(({ data }) => setData(data))
      .catch(() => setError('Service provider not found'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="space-y-4 py-5"><Skeleton className="h-36 rounded-2xl" /><Skeleton className="h-64 rounded-2xl" /></div>;
  if (error) return <div className="py-8"><EmptyState icon={Wrench} title={error} /></div>;

  const { vendor, services, reviews } = data;

  return (
    <div className="space-y-5 py-5">
      <Card className="overflow-hidden rounded-2xl">
        <Thumb src={vendor.image} alt={vendor.name} className="h-32 w-full md:h-44" tone="serve" />
        <div className="space-y-2 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <h1 data-testid="vendor-name-heading" className="text-xl font-bold">{vendor.name}</h1>
            <VerifiedBadge />
          </div>
          <p className="text-sm text-muted-foreground">{vendor.description}</p>
          <div className="flex flex-wrap items-center gap-2">
            <RatingPill rating={vendor.rating} count={vendor.review_count} />
            <span className="text-xs capitalize text-muted-foreground">{(vendor.category_slugs || []).map((s) => s.replace('-', ' ')).join(' · ')}</span>
          </div>
        </div>
      </Card>

      <section>
        <h2 className="mb-3 font-display text-lg font-semibold">Services offered</h2>
        <div className="space-y-2">
          {services.filter((s) => s.is_available).map((s) => (
            <Card key={s.id} data-testid="service-card" className="flex items-center gap-3 rounded-xl p-3">
              <Thumb src={s.image} alt={s.name} className="h-16 w-16 shrink-0 rounded-lg" tone="serve" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{s.name}</p>
                <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{s.description}</p>
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Clock className="h-3 w-3" /> {s.duration_minutes} min</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold tabular-nums">{inr(s.base_price)}</p>
                <Button data-testid="service-book-button" size="sm" className="mt-1 h-8 bg-[hsl(var(--serve))] hover:bg-[hsl(var(--serve))]/90"
                  onClick={() => navigate(`/book/${s.id}`)}>Book</Button>
              </div>
            </Card>
          ))}
          {services.length === 0 && <EmptyState icon={Wrench} title="No services listed yet" />}
        </div>
      </section>

      {reviews?.length > 0 && (
        <section>
          <h2 className="mb-3 font-display text-lg font-semibold">Recent reviews</h2>
          <Card className="divide-y rounded-xl">
            {reviews.map((r) => (
              <div key={r.id} className="p-3">
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-0.5 text-sm font-semibold"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />{r.rating}</span>
                  <span className="text-sm font-medium">{r.customer_name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString('en-IN')}</span>
                </div>
                {r.comment && <p className="mt-1 text-sm text-muted-foreground">{r.comment}</p>}
              </div>
            ))}
          </Card>
        </section>
      )}
    </div>
  );
}
