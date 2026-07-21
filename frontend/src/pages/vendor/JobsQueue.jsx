import React, { useCallback, useEffect, useState } from 'react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { api, inr, errMsg } from '../../lib/api';
import { toast } from 'sonner';
import { StatusBadge, EmptyState, RowSkeletons, label } from '../../components/shared/bits';
import { CalendarClock, X } from 'lucide-react';

const NEXT = { requested: 'accepted', accepted: 'en_route', en_route: 'in_progress', in_progress: 'completed' };
const NEXT_LABEL = { requested: 'Accept job', accepted: 'Start travel', en_route: 'Begin work', in_progress: 'Mark completed' };
const FILTERS = ['all', 'requested', 'accepted', 'en_route', 'in_progress', 'completed'];

export default function JobsQueue() {
  const [jobs, setJobs] = useState(null);
  const [filter, setFilter] = useState('all');
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(() => {
    api.get('/vendor/jobs').then(({ data }) => setJobs(data)).catch(() => setJobs([]));
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, [load]);

  const advance = async (job, status) => {
    setBusyId(job.id);
    try {
      const { data: updated } = await api.patch(`/vendor/jobs/${job.id}/status`, { status });
      toast.success(`Job ${job.booking_no} → ${label(status)}`);
      setJobs((prev) => (prev || []).map((j) => (j.id === job.id ? updated : j)));
      if (filter !== 'all' && filter !== status && status !== 'declined') {
        setFilter(status);
      }
      load();
    } catch (e) { toast.error(errMsg(e)); } finally { setBusyId(null); }
  };

  const filtered = (jobs || []).filter((j) => filter === 'all' || j.status === filter);

  return (
    <div className="space-y-4">
      <h1 className="font-display text-xl font-bold">Jobs</h1>
      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList className="h-auto flex-wrap">
          {FILTERS.map((f) => <TabsTrigger key={f} data-testid={`jobs-filter-${f}`} value={f} className="text-xs capitalize">{f === 'all' ? 'All' : label(f)}</TabsTrigger>)}
        </TabsList>
      </Tabs>

      {!jobs ? <RowSkeletons /> : filtered.length === 0 ? (
        <EmptyState icon={CalendarClock} title="No jobs here" subtitle="New booking requests will appear here instantly." />
      ) : (
        <div data-testid="vendor-jobs-list" className="space-y-3">
          {filtered.map((j) => (
            <Card key={j.id} data-testid="vendor-job-row" className="rounded-xl p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-bold">{j.service_name}</p>
                  <p className="text-xs text-muted-foreground">{j.booking_no} · {j.customer_name} · {new Date(j.slot_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} at {j.slot_time}</p>
                  <p className="text-xs text-muted-foreground">{j.address?.line}, {j.address?.city}</p>
                  {j.notes && <p className="mt-1 text-xs italic text-muted-foreground">“{j.notes}”</p>}
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={j.status} />
                  <span className="text-sm font-bold tabular-nums">{inr(j.price)}</span>
                </div>
              </div>
              {NEXT[j.status] && (
                <div className="mt-3 flex gap-2">
                  <Button data-testid="vendor-job-advance-status-button" size="sm" disabled={busyId === j.id}
                    onClick={() => advance(j, NEXT[j.status])}>
                    {NEXT_LABEL[j.status]}
                  </Button>
                  {j.status === 'requested' && (
                    <Button data-testid="vendor-job-decline-button" size="sm" variant="outline" className="gap-1 text-destructive" disabled={busyId === j.id}
                      onClick={() => advance(j, 'declined')}>
                      <X className="h-3.5 w-3.5" /> Decline
                    </Button>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
