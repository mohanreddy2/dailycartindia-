import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { useAuth } from '../../lib/store';
import { EmptyState } from '../../components/shared/bits';
import { User, Package, Store, ShieldCheck, LogOut, ChevronRight } from 'lucide-react';

export default function Account() {
  const { user, vendor, logout, loaded } = useAuth();
  const navigate = useNavigate();

  if (loaded && !user) {
    return <div className="py-8"><EmptyState icon={User} title="You’re not logged in" subtitle="Login to manage your orders, bookings and profile." actionLabel="Login / Register" onAction={() => navigate('/auth')} /></div>;
  }
  if (!user) return null;

  const isAdmin = user.capabilities?.includes('admin');

  return (
    <div className="mx-auto max-w-lg space-y-4 py-5">
      <Card className="flex items-center gap-3 rounded-xl p-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[hsl(var(--accent))] text-lg font-bold text-[hsl(var(--accent-foreground))]">
          {user.name?.[0]?.toUpperCase()}
        </span>
        <div>
          <p data-testid="account-name-text" className="font-semibold">{user.name}</p>
          <p className="text-xs text-muted-foreground">{user.email || user.phone}</p>
        </div>
      </Card>

      <Card className="divide-y rounded-xl">
        <button data-testid="account-orders-link" className="flex w-full items-center gap-3 p-4 text-left text-sm font-medium hover:bg-accent" onClick={() => navigate('/orders')}>
          <Package className="h-5 w-5 text-muted-foreground" /> My orders & bookings <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
        </button>
        <button data-testid="account-vendor-link" className="flex w-full items-center gap-3 p-4 text-left text-sm font-medium hover:bg-accent"
          onClick={() => navigate(vendor ? '/vendor' : '/vendor/onboarding')}>
          <Store className="h-5 w-5 text-muted-foreground" />
          <span className="flex-1">
            {vendor ? 'DailyPro vendor portal' : 'Become a vendor partner'}
            {!vendor && <span className="ml-2 rounded-full bg-[hsl(var(--primary))] px-2 py-0.5 text-[10px] font-semibold text-white">NEW</span>}
          </span>
          <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
        </button>
        {isAdmin && (
          <button data-testid="account-admin-link" className="flex w-full items-center gap-3 p-4 text-left text-sm font-medium hover:bg-accent" onClick={() => navigate('/admin')}>
            <ShieldCheck className="h-5 w-5 text-muted-foreground" /> Admin ops console <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </Card>

      <Button data-testid="logout-button" variant="outline" className="w-full gap-2 text-destructive" onClick={() => { logout(); navigate('/'); }}>
        <LogOut className="h-4 w-4" /> Logout
      </Button>
    </div>
  );
}
