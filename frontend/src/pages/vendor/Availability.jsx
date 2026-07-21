import React, { useEffect, useState } from 'react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { api, errMsg } from '../../lib/api';
import { useAuth } from '../../lib/store';
import { toast } from 'sonner';
import { RowSkeletons } from '../../components/shared/bits';
import { cn } from '../../lib/utils';

const DAYS = [['mon', 'Monday'], ['tue', 'Tuesday'], ['wed', 'Wednesday'], ['thu', 'Thursday'], ['fri', 'Friday'], ['sat', 'Saturday'], ['sun', 'Sunday']];
const ALL_SLOTS = ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00', '18:00'];

export default function Availability() {
  const { vendor, refreshMe } = useAuth();
  const [avail, setAvail] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (vendor) {
      setAvail(vendor.availability || Object.fromEntries(DAYS.map(([d]) => [d, [...ALL_SLOTS]])));
    }
  }, [vendor]);

  if (!avail) return <RowSkeletons n={4} />;

  const toggle = (day, slot) => {
    setAvail((prev) => {
      const cur = prev[day] || [];
      return { ...prev, [day]: cur.includes(slot) ? cur.filter((s) => s !== slot) : [...cur, slot].sort() };
    });
  };

  const toggleDay = (day) => {
    setAvail((prev) => ({ ...prev, [day]: (prev[day] || []).length > 0 ? [] : [...ALL_SLOTS] }));
  };

  const save = async () => {
    setBusy(true);
    try {
      await api.patch('/vendor/availability', { availability: avail });
      await refreshMe();
      toast.success('Availability updated');
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold">Availability</h1>
          <p className="text-sm text-muted-foreground">Toggle the time slots customers can book.</p>
        </div>
        <Button data-testid="availability-save-button" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</Button>
      </div>

      <div data-testid="availability-grid" className="space-y-3">
        {DAYS.map(([key, name]) => {
          const daySlots = avail[key] || [];
          return (
            <Card key={key} className="rounded-xl p-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold">{name}</p>
                <button data-testid="availability-day-toggle" className="text-xs font-medium text-[hsl(var(--primary))]" onClick={() => toggleDay(key)}>
                  {daySlots.length > 0 ? 'Clear day' : 'Open all'}
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {ALL_SLOTS.map((slot) => (
                  <button key={slot} data-testid="availability-slot-toggle" onClick={() => toggle(key, slot)}
                    className={cn('rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors',
                      daySlots.includes(slot) ? 'border-transparent bg-[hsl(var(--primary))] text-white' : 'bg-card text-muted-foreground hover:bg-muted')}>
                    {slot}
                  </button>
                ))}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
