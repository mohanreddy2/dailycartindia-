import React, { useEffect, useState } from 'react';
import { Card } from '../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { api, inr } from '../../lib/api';
import { EmptyState, RowSkeletons, StatusBadge } from '../../components/shared/bits';
import { Package, CalendarClock } from 'lucide-react';

export function OrdersAdmin() {
  const [orders, setOrders] = useState(null);

  useEffect(() => {
    api.get('/admin/orders').then(({ data }) => setOrders(data)).catch(() => setOrders([]));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="font-display text-xl font-bold">All orders</h1>
      {!orders ? <RowSkeletons /> : orders.length === 0 ? (
        <EmptyState icon={Package} title="No orders yet" />
      ) : (
        <Card className="overflow-x-auto rounded-xl">
          <Table data-testid="admin-orders-table">
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Store</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Placed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-mono text-xs">{o.order_no}</TableCell>
                  <TableCell>{o.customer_name}</TableCell>
                  <TableCell>{o.store_name}</TableCell>
                  <TableCell>{o.items.length}</TableCell>
                  <TableCell className="tabular-nums">{inr(o.total)}</TableCell>
                  <TableCell><StatusBadge status={o.status} /></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

export function BookingsAdmin() {
  const [bookings, setBookings] = useState(null);

  useEffect(() => {
    api.get('/admin/bookings').then(({ data }) => setBookings(data)).catch(() => setBookings([]));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="font-display text-xl font-bold">All bookings</h1>
      {!bookings ? <RowSkeletons /> : bookings.length === 0 ? (
        <EmptyState icon={CalendarClock} title="No bookings yet" />
      ) : (
        <Card className="overflow-x-auto rounded-xl">
          <Table data-testid="admin-bookings-table">
            <TableHeader>
              <TableRow>
                <TableHead>Booking</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Slot</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-mono text-xs">{b.booking_no}</TableCell>
                  <TableCell>{b.customer_name}</TableCell>
                  <TableCell>{b.service_name}</TableCell>
                  <TableCell>{b.vendor_name}</TableCell>
                  <TableCell className="text-xs">{new Date(b.slot_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} {b.slot_time}</TableCell>
                  <TableCell className="tabular-nums">{inr(b.price)}</TableCell>
                  <TableCell><StatusBadge status={b.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
