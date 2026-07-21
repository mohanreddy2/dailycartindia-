import React from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/store';
import AuthPage from '../customer/AuthPage';
import { Button } from '../../components/ui/button';
import { Store, ArrowRight } from 'lucide-react';

/**
 * VendorAuth — Login/register page for the vendor portal.
 *
 * Post-login routing logic:
 *  - Already has an approved/pending/rejected vendor profile → /vendor (VendorLayout handles KYC gate)
 *  - No vendor profile at all → /vendor/onboarding
 *  - Not logged in → show AuthPage
 */
export default function VendorAuth() {
  const { user, vendor, loaded } = useAuth();
  const navigate = useNavigate();

  if (!loaded) return null;

  // Already authenticated — route based on vendor profile state
  if (user) {
    if (vendor) {
      // Has a vendor profile (any KYC status) → let VendorLayout handle the gate
      return <Navigate to="/vendor" replace />;
    }
    // Logged in but no vendor profile yet → send to onboarding
    return (
      <div className="portal-vendor min-h-screen bg-background flex flex-col items-center justify-center px-4 gap-6">
        <div className="text-center space-y-1">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[hsl(var(--accent))]">
            <Store className="h-7 w-7 text-[hsl(var(--primary))]" />
          </div>
          <h1 className="font-display text-2xl font-bold">Welcome, {user.name}!</h1>
          <p className="text-sm text-muted-foreground">
            You're logged in but haven't set up your store yet.
          </p>
        </div>
        <Button
          data-testid="go-to-onboarding-button"
          className="gap-2 px-6"
          onClick={() => navigate('/vendor/onboarding')}
        >
          Set up your store <ArrowRight className="h-4 w-4" />
        </Button>
        <button
          className="text-xs text-muted-foreground underline"
          onClick={() => navigate('/')}
        >
          Continue as customer
        </button>
      </div>
    );
  }

  return (
    <div className="portal-vendor min-h-screen bg-background px-4">
      <AuthPage portal="vendor" />
    </div>
  );
}
