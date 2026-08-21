import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, Wrench, ChevronRight } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import WhatsAppLinks from '../../components/shared/WhatsAppLinks';

export default function PartnerPage() {
  const navigate = useNavigate();
  return (
    <div className="mx-auto max-w-lg space-y-6 py-8">
      <div>
        <h1 className="font-display text-2xl font-bold">Become a DailyPro partner</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          List your kirana store or home service on DailyCart. Get orders from nearby customers, manage inventory or jobs, and get paid.
        </p>
      </div>
      <Card className="space-y-3 rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <Store className="mt-0.5 h-5 w-5 text-[hsl(var(--primary))]" aria-hidden />
          <div>
            <p className="text-sm font-semibold">Kirana / mart</p>
            <p className="text-sm text-muted-foreground">Catalogue, orders, and packing queue in DailyPro.</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Wrench className="mt-0.5 h-5 w-5 text-[hsl(var(--serve))]" aria-hidden />
          <div>
            <p className="text-sm font-semibold">Home services</p>
            <p className="text-sm text-muted-foreground">Ironing, plumbing, tiffin, and other neighbourhood jobs.</p>
          </div>
        </div>
      </Card>
      <Button
        data-testid="partner-continue-button"
        size="lg"
        className="w-full gap-1"
        onClick={() => navigate('/vendor/auth')}
      >
        Continue to partner login <ChevronRight className="h-4 w-4" aria-hidden />
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Already have an account? The same login opens DailyPro after you apply.
      </p>
      <WhatsAppLinks className="justify-center text-xs text-muted-foreground" prefix="Questions? WhatsApp" />
    </div>
  );
}
