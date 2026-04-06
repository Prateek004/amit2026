'use client';

import { useState, useEffect } from 'react';
import { Plus, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { formatCurrency } from '@/lib/utils';
import { db, Customer, getCurrentBusiness, addToSyncQueue } from '@/lib/db';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
  });
  const [paymentAmount, setPaymentAmount] = useState('');

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    const business = await getCurrentBusiness();
    if (!business) return;

    const custs = await db.customers
      .where('business_id')
      .equals(business.id)
      .toArray();
    setCustomers(custs);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const business = await getCurrentBusiness();
    if (!business) return;

    const customerData = {
      id: crypto.randomUUID(),
      business_id: business.id,
      name: formData.name,
      phone: formData.phone,
      email: formData.email || undefined,
      udhaar_balance: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await db.customers.add(customerData);
    await addToSyncQueue(business.id, 'customers', 'insert', customerData.id, customerData);

    loadCustomers();
    setDialogOpen(false);
    setFormData({ name: '', phone: '', email: '' });
  };

  const handlePayment = async () => {
    if (!selectedCustomer) return;
    const business = await getCurrentBusiness();
    if (!business) return;

    const amount = parseInt(paymentAmount) * 100;
    const newBalance = Math.max(0, selectedCustomer.udhaar_balance - amount);

    await db.customers.update(selectedCustomer.id, { udhaar_balance: newBalance });
    await addToSyncQueue(business.id, 'customers', 'update', selectedCustomer.id, {
      udhaar_balance: newBalance,
    });

    loadCustomers();
    setPaymentDialogOpen(false);
    setPaymentAmount('');
    setSelectedCustomer(null);
  };

  const openPaymentDialog = (customer: Customer) => {
    setSelectedCustomer(customer);
    setPaymentDialogOpen(true);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Customers</h1>
        <Button
          onClick={() => setDialogOpen(true)}
          className="bg-[#E8590C] hover:bg-[#E8590C]/90"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Customer
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {customers.map((customer) => (
          <Card key={customer.id} className="p-4">
            <div className="mb-3">
              <h3 className="font-semibold text-lg">{customer.name}</h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-3 w-3" />
                {customer.phone}
              </div>
              {customer.email && (
                <p className="text-sm text-muted-foreground">{customer.email}</p>
              )}
            </div>

            <div className="mb-3">
              {customer.udhaar_balance > 0 ? (
                <Badge variant="destructive" className="text-sm">
                  Udhaar: {formatCurrency(customer.udhaar_balance)}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-sm">
                  No outstanding balance
                </Badge>
              )}
            </div>

            {customer.udhaar_balance > 0 && (
              <Button
                onClick={() => openPaymentDialog(customer)}
                variant="outline"
                size="sm"
                className="w-full"
              >
                Record Payment
              </Button>
            )}
          </Card>
        ))}
      </div>

      {/* Add Customer Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Customer</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div>
              <Label>Phone</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                type="tel"
                required
              />
            </div>

            <div>
              <Label>Email (Optional)</Label>
              <Input
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                type="email"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                onClick={() => setDialogOpen(false)}
                variant="outline"
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-[#E8590C] hover:bg-[#E8590C]/90">
                Add
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>

          {selectedCustomer && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Customer</p>
                <p className="font-semibold">{selectedCustomer.name}</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Outstanding Balance</p>
                <p className="text-xl font-bold text-destructive">
                  {formatCurrency(selectedCustomer.udhaar_balance)}
                </p>
              </div>

              <div>
                <Label>Payment Amount (₹)</Label>
                <Input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="Enter amount"
                  required
                />
              </div>

              <DialogFooter>
                <Button
                  onClick={() => {
                    setPaymentDialogOpen(false);
                    setPaymentAmount('');
                  }}
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handlePayment}
                  disabled={!paymentAmount}
                  className="bg-[#E8590C] hover:bg-[#E8590C]/90"
                >
                  Record Payment
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
