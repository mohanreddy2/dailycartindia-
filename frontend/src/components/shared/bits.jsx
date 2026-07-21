import React from 'react';
import { Star, MapPin, BadgeCheck, ShoppingBag } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

export const RatingPill = ({ rating, count }) => {
  if (!count && !rating) {
    return (
      <span data-testid="rating-pill" className="inline-flex items-center gap-1 rounded-full bg-[hsl(var(--trust-soft))] px-2 py-0.5 text-xs font-semibold text-[hsl(var(--trust-soft-foreground))]">
        New
      </span>
    );
  }
  return (
    <span data-testid="rating-pill" className="inline-flex items-center gap-1 rounded-full bg-[hsl(var(--serve-soft))] px-2 py-0.5 text-xs font-semibold text-[hsl(var(--serve-soft-foreground))]">
      <Star className="h-3 w-3 fill-current" />
      {Number(rating || 0).toFixed(1)}
      {count ? <span className="font-normal text-muted-foreground">({count})</span> : null}
    </span>
  );
};

export const DistanceChip = ({ km }) => (
  km === undefined || km === null ? null : (
    <span data-testid="distance-chip" className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
      <MapPin className="h-3 w-3" />{km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`}
    </span>
  )
);

export const VerifiedBadge = () => (
  <span data-testid="verified-badge" className="inline-flex items-center gap-1 rounded-full bg-[hsl(var(--trust-soft))] px-2 py-0.5 text-xs font-medium text-[hsl(var(--trust-soft-foreground))]">
    <BadgeCheck className="h-3 w-3" /> Verified
  </span>
);

const STATUS_STYLES = {
  placed: 'bg-[hsl(var(--trust-soft))] text-[hsl(var(--trust-soft-foreground))]',
  requested: 'bg-[hsl(var(--trust-soft))] text-[hsl(var(--trust-soft-foreground))]',
  accepted: 'bg-amber-100 text-amber-800',
  picking: 'bg-amber-100 text-amber-800',
  ready: 'bg-amber-100 text-amber-800',
  en_route: 'bg-amber-100 text-amber-800',
  in_progress: 'bg-amber-100 text-amber-800',
  out_for_delivery: 'bg-orange-100 text-orange-800',
  delivered: 'bg-[hsl(var(--serve-soft))] text-[hsl(var(--serve-soft-foreground))]',
  completed: 'bg-[hsl(var(--serve-soft))] text-[hsl(var(--serve-soft-foreground))]',
  cancelled: 'bg-red-100 text-red-700',
  rejected: 'bg-red-100 text-red-700',
  declined: 'bg-red-100 text-red-700',
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-[hsl(var(--serve-soft))] text-[hsl(var(--serve-soft-foreground))]',
  open: 'bg-amber-100 text-amber-800',
  resolved: 'bg-[hsl(var(--serve-soft))] text-[hsl(var(--serve-soft-foreground))]',
};

export const label = (s) => (s || '').replaceAll('_', ' ').replace(/^\w/, (c) => c.toUpperCase());

export const StatusBadge = ({ status }) => (
  <span data-testid="status-badge" className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize tracking-wide', STATUS_STYLES[status] || 'bg-muted text-muted-foreground')}>
    {label(status)}
  </span>
);

export function StatusTimeline({ flow, history, current, terminal }) {
  const histMap = Object.fromEntries((history || []).map((h) => [h.status, h]));
  const reachedIdx = flow.indexOf(current);
  const isTerminalBad = ['cancelled', 'rejected', 'declined'].includes(current);
  return (
    <ol data-testid="order-status-timeline" className="relative list-none pl-8" aria-label="Status progress">
      {flow.map((step, i) => {
        const done = !isTerminalBad && reachedIdx >= i;
        const currentStep = !isTerminalBad && reachedIdx === i;
        const at = histMap[step]?.at;
        return (
          <li key={step} data-testid="order-status-step" className="relative pb-5 last:pb-0" aria-current={currentStep ? 'step' : undefined}>
            {i < flow.length - 1 && (
              <span className={cn('absolute -left-[26px] top-4 bottom-0 w-px', done && reachedIdx > i ? 'bg-[hsl(var(--primary))]' : 'bg-border')} aria-hidden />
            )}
            <span className={cn('absolute -left-8 top-1 flex h-4 w-4 items-center justify-center rounded-full border-2',
              done ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))]' : 'border-border bg-background')} aria-hidden />
            <p className={cn('text-sm font-medium leading-4', done ? 'text-foreground' : 'text-muted-foreground')}>{label(step)}</p>
            {at && <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">{new Date(at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</p>}
          </li>
        );
      })}
      {isTerminalBad && (
        <li className="relative">
          <span className="absolute -left-8 top-1 flex h-4 w-4 rounded-full border-2 border-red-500 bg-red-500" aria-hidden />
          <p className="text-sm font-medium text-red-600">{label(current)}</p>
        </li>
      )}
    </ol>
  );
}

export function EmptyState({ icon: Icon = ShoppingBag, title, subtitle, actionLabel, onAction }) {
  return (
    <div data-testid="empty-state" role="status" className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card px-6 py-12 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Icon className="h-6 w-6 text-muted-foreground" aria-hidden />
      </div>
      <h3 className="font-display text-base font-semibold">{title}</h3>
      {subtitle && <p className="mt-1 max-w-xs text-sm text-muted-foreground">{subtitle}</p>}
      {actionLabel && (
        <Button type="button" data-testid="empty-state-primary-action" onClick={onAction} className="mt-4">{actionLabel}</Button>
      )}
    </div>
  );
}

export const CardSkeletons = ({ n = 4, h = 'h-40' }) => (
  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
    {Array.from({ length: n }).map((_, i) => <Skeleton key={i} className={`${h} rounded-xl`} />)}
  </div>
);

export const RowSkeletons = ({ n = 5 }) => (
  <div className="space-y-3">
    {Array.from({ length: n }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
  </div>
);
