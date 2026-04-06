'use client';

import { useState, useEffect } from 'react';
import { Calendar, DollarSign, ShoppingCart, Users, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatCurrency, formatDate } from '@/lib/utils';
import { db, Order, getCurrentBusiness } from '@/lib/db';

export default function ReportsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [gallaOpen, setGallaOpen] = useState(false);
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'all'>('today');

  useEffect(() => {
    loadOrders();
  }, [dateRange]);

  const loadOrders = async () => {
    const business = await getCurrentBusiness();
    if (!business) return;

    let allOrders = await db.orders
      .where('business_id')
      .equals(business.id)
      .toArray();

    // Filter by date range
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    if (dateRange === 'today') {
      allOrders = allOrders.filter(o => new Date(o.created_at) >= startOfDay);
    } else if (dateRange === 'week') {
      allOrders = allOrders.filter(o => new Date(o.created_at) >= startOfWeek);
    } else if (dateRange === 'month') {
      allOrders = allOrders.filter(o => new Date(o.created_at) >= startOfMonth);
    }

    // Sort by date desc
    allOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    setOrders(allOrders);
  };

  const completedOrders = orders.filter(o => o.status === 'completed');

  const totalSales = completedOrders.reduce((sum, o) => sum + o.total, 0);
  const totalOrders = completedOrders.length;
  const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

  const cashSales = completedOrders
    .filter(o => o.payment_mode === 'cash' || o.payment_details?.cash)
    .reduce((sum, o) => sum + (o.payment_details?.cash || o.total), 0);

  const upiSales = completedOrders
    .filter(o => o.payment_mode === 'upi' || o.payment_details?.upi)
    .reduce((sum, o) => sum + (o.payment_details?.upi || o.total), 0);

  const udhaarSales = completedOrders
    .filter(o => o.payment_mode === 'udhaar')
    .reduce((sum, o) => sum + o.total, 0);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Reports</h1>
        <Button
          onClick={() => setGallaOpen(true)}
          className="bg-[#E8590C] hover:bg-[#E8590C]/90"
        >
          <DollarSign className="h-4 w-4 mr-2" />
          Open Galla (Z-Report)
        </Button>
      </div>

      {/* Date Range Selector */}
      <div className="flex gap-2 mb-6">
        {(['today', 'week', 'month', 'all'] as const).map((range) => (
          <Button
            key={range}
            variant={dateRange === range ? 'default' : 'outline'}
            onClick={() => setDateRange(range)}
            className={dateRange === range ? 'bg-[#E8590C]' : ''}
          >
            {range.charAt(0).toUpperCase() + range.slice(1)}
          </Button>
        ))}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalSales)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrders}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(avgOrderValue)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Cash in Hand</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(cashSales)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {orders.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No orders found</p>
            ) : (
              orders.slice(0, 10).map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">{order.bill_number}</p>
                    <p className="text-sm text-muted-foreground">
                      {order.customer_name || 'Walk-in'} • {formatDate(order.created_at)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {order.items.length} items • {order.payment_mode?.toUpperCase()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">{formatCurrency(order.total)}</p>
                    {order.status === 'voided' && (
                      <p className="text-xs text-destructive">VOIDED</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Galla Dialog */}
      <Dialog open={gallaOpen} onOpenChange={setGallaOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Galla (Z-Report)</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="border-b pb-4">
              <h3 className="font-semibold mb-2">Sales Summary</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Total Orders:</span>
                  <span className="font-medium">{totalOrders}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Total Sales:</span>
                  <span className="font-medium">{formatCurrency(totalSales)}</span>
                </div>
              </div>
            </div>

            <div className="border-b pb-4">
              <h3 className="font-semibold mb-2">Payment Breakdown</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Cash:</span>
                  <span className="font-medium">{formatCurrency(cashSales)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>UPI:</span>
                  <span className="font-medium">{formatCurrency(upiSales)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Udhaar:</span>
                  <span className="font-medium">{formatCurrency(udhaarSales)}</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Expected Cash in Hand</h3>
              <p className="text-2xl font-bold text-[#E8590C]">
                {formatCurrency(cashSales)}
              </p>
            </div>

            <Button
              onClick={() => window.print()}
              className="w-full bg-[#E8590C] hover:bg-[#E8590C]/90"
            >
              Print Report
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
