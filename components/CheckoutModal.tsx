'use client';

import { useState } from 'react';
import QRCode from 'qrcode';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatCurrency, calculateGST } from '@/lib/utils';
import { db, getNextBillNumber, addToSyncQueue, Order, getCurrentBusiness } from '@/lib/db';
import { useCartStore } from '@/store/useCartStore';
import { Printer, Share2, Phone } from 'lucide-react';
import { generateESCPOS, printToBluetooth } from '@/lib/printer';

interface CheckoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CheckoutModal({ open, onOpenChange }: CheckoutModalProps) {
  const { items, getSubtotal, clearCart, currentTable } = useCartStore();
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMode, setPaymentMode] = useState<'cash' | 'upi' | 'split' | 'udhaar'>('cash');
  const [cashAmount, setCashAmount] = useState('');
  const [upiAmount, setUpiAmount] = useState('');
  const [processing, setProcessing] = useState(false);

  const subtotal = getSubtotal();
  const { cgst, sgst } = calculateGST(subtotal, 5);
  const total = subtotal + cgst + sgst;

  const handleCheckout = async () => {
    setProcessing(true);
    try {
      const business = await getCurrentBusiness();
      if (!business) throw new Error('No business found');

      const billNumber = await getNextBillNumber(business.id);

      const paymentDetails: any = {};
      if (paymentMode === 'split') {
        paymentDetails.cash = parseInt(cashAmount) * 100 || 0;
        paymentDetails.upi = parseInt(upiAmount) * 100 || 0;
      }

      const order: Order = {
        id: crypto.randomUUID(),
        business_id: business.id,
        bill_number: billNumber,
        customer_name: customerName || undefined,
        customer_phone: customerPhone || undefined,
        table_number: currentTable,
        items: structuredClone(items),
        subtotal,
        cgst,
        sgst,
        igst: 0,
        total,
        payment_mode: paymentMode,
        payment_details: paymentMode === 'split' ? paymentDetails : undefined,
        status: 'completed',
        kot_printed: false,
        created_at: new Date().toISOString(),
      };

      await db.orders.add(order);
      await addToSyncQueue(business.id, 'orders', 'insert', order.id, order);

      // Update customer udhaar if applicable
      if (paymentMode === 'udhaar' && customerPhone) {
        const customer = await db.customers
          .where('phone')
          .equals(customerPhone)
          .first();

        if (customer) {
          const newBalance = customer.udhaar_balance + total;
          await db.customers.update(customer.id, { udhaar_balance: newBalance });
          await addToSyncQueue(business.id, 'customers', 'update', customer.id, { udhaar_balance: newBalance });
        } else {
          const newCustomer = {
            id: crypto.randomUUID(),
            business_id: business.id,
            name: customerName || 'Guest',
            phone: customerPhone,
            udhaar_balance: total,
            created_at: new Date().toISOString(),
          };
          await db.customers.add(newCustomer);
          await addToSyncQueue(business.id, 'customers', 'insert', newCustomer.id, newCustomer);
        }
      }

      clearCart();
      onOpenChange(false);
      alert(`Bill #${billNumber} created successfully!`);
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Error creating bill. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handlePrint = async () => {
    try {
      const business = await getCurrentBusiness();
      if (!business) return;

      const order: Order = {
        id: crypto.randomUUID(),
        business_id: business.id,
        bill_number: await getNextBillNumber(business.id),
        customer_name: customerName || undefined,
        customer_phone: customerPhone || undefined,
        table_number: currentTable,
        items: structuredClone(items),
        subtotal,
        cgst,
        sgst,
        igst: 0,
        total,
        payment_mode: paymentMode,
        status: 'completed',
        kot_printed: false,
        created_at: new Date().toISOString(),
      };

      const escpos = generateESCPOS(order, business.name, business.address);
      await printToBluetooth(escpos);
    } catch (error) {
      console.error('Print error:', error);
      alert('Print failed. Make sure Bluetooth printer is connected.');
    }
  };

  const handleWhatsAppShare = async () => {
    const business = await getCurrentBusiness();
    if (!business || !customerPhone) return;

    const message = `*${business.name}*\n\nBill Details:\n${items
      .map((item) => `${item.name} x${item.qty} - ${formatCurrency(item.price * item.qty)}`)
      .join('\n')}\n\nSubtotal: ${formatCurrency(subtotal)}\nCGST: ${formatCurrency(cgst)}\nSGST: ${formatCurrency(sgst)}\n*Total: ${formatCurrency(total)}*`;

    const url = `https://wa.me/${customerPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const handleGenerateQR = async () => {
    try {
      const business = await getCurrentBusiness();
      if (!business) return;

      const upiString = `upi://pay?pa=${business.email || 'merchant@upi'}&pn=${business.name}&am=${(total / 100).toFixed(2)}&cu=INR`;
      const qrDataUrl = await QRCode.toDataURL(upiString);

      const win = window.open();
      if (win) {
        win.document.write(`<img src="${qrDataUrl}" style="width:300px;height:300px;" />`);
      }
    } catch (error) {
      console.error('QR generation error:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Checkout</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Customer Name</Label>
            <Input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Optional"
            />
          </div>

          <div>
            <Label>Customer Phone</Label>
            <Input
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="Optional"
              type="tel"
            />
          </div>

          <Tabs value={paymentMode} onValueChange={(v: any) => setPaymentMode(v)}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="cash">Cash</TabsTrigger>
              <TabsTrigger value="upi">UPI</TabsTrigger>
              <TabsTrigger value="split">Split</TabsTrigger>
              <TabsTrigger value="udhaar">Udhaar</TabsTrigger>
            </TabsList>

            <TabsContent value="cash" className="space-y-2">
              <p className="text-sm text-muted-foreground">Cash payment selected</p>
            </TabsContent>

            <TabsContent value="upi" className="space-y-2">
              <p className="text-sm text-muted-foreground">UPI payment selected</p>
              <Button onClick={handleGenerateQR} variant="outline" className="w-full">
                Generate QR Code
              </Button>
            </TabsContent>

            <TabsContent value="split" className="space-y-4">
              <div>
                <Label>Cash Amount</Label>
                <Input
                  type="number"
                  value={cashAmount}
                  onChange={(e) => setCashAmount(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div>
                <Label>UPI Amount</Label>
                <Input
                  type="number"
                  value={upiAmount}
                  onChange={(e) => setUpiAmount(e.target.value)}
                  placeholder="0"
                />
              </div>
            </TabsContent>

            <TabsContent value="udhaar" className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Credit will be added to customer account
              </p>
            </TabsContent>
          </Tabs>

          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>CGST (2.5%)</span>
              <span>{formatCurrency(cgst)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>SGST (2.5%)</span>
              <span>{formatCurrency(sgst)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handlePrint}
              variant="outline"
              className="flex-1"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            {customerPhone && (
              <Button
                onClick={handleWhatsAppShare}
                variant="outline"
                className="flex-1"
              >
                <Phone className="h-4 w-4 mr-2" />
                WhatsApp
              </Button>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onOpenChange.bind(null, false)} variant="outline">
            Cancel
          </Button>
          <Button
            onClick={handleCheckout}
            disabled={processing || items.length === 0}
            className="bg-[#E8590C] hover:bg-[#E8590C]/90"
          >
            {processing ? 'Processing...' : 'Complete Sale'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
