'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { formatCurrency } from '@/lib/utils';
import { db, Addon, Product } from '@/lib/db';

interface AddOnModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  onConfirm: (addons: Addon[], portion?: 'half' | 'full') => void;
}

export function AddOnModal({ open, onOpenChange, product, onConfirm }: AddOnModalProps) {
  const [addons, setAddons] = useState<Addon[]>([]);
  const [selectedAddons, setSelectedAddons] = useState<Set<string>>(new Set());
  const [selectedPortion, setSelectedPortion] = useState<'half' | 'full'>('full');

  useEffect(() => {
    if (product && open) {
      loadAddons();
      setSelectedAddons(new Set());
      setSelectedPortion('full');
    }
  }, [product, open]);

  const loadAddons = async () => {
    if (!product) return;
    const productAddons = await db.addons
      .where('product_id')
      .equals(product.id)
      .toArray();
    setAddons(productAddons);
  };

  const toggleAddon = (addonId: string) => {
    const newSelected = new Set(selectedAddons);
    if (newSelected.has(addonId)) {
      newSelected.delete(addonId);
    } else {
      newSelected.add(addonId);
    }
    setSelectedAddons(newSelected);
  };

  const handleConfirm = () => {
    const selected = addons.filter((a) => selectedAddons.has(a.id));
    onConfirm(selected, product?.has_portions ? selectedPortion : undefined);
    onOpenChange(false);
  };

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{product.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {product.has_portions && product.portions && (
            <div>
              <Label className="mb-2 block">Select Portion</Label>
              <div className="flex gap-2">
                {product.portions.half !== undefined && (
                  <Button
                    variant={selectedPortion === 'half' ? 'default' : 'outline'}
                    onClick={() => setSelectedPortion('half')}
                    className="flex-1"
                  >
                    Half - {formatCurrency(product.portions.half)}
                  </Button>
                )}
                {product.portions.full !== undefined && (
                  <Button
                    variant={selectedPortion === 'full' ? 'default' : 'outline'}
                    onClick={() => setSelectedPortion('full')}
                    className="flex-1"
                  >
                    Full - {formatCurrency(product.portions.full)}
                  </Button>
                )}
              </div>
            </div>
          )}

          {addons.length > 0 && (
            <div>
              <Label className="mb-2 block">Add-ons</Label>
              <div className="space-y-2">
                {addons.map((addon) => (
                  <div key={addon.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={addon.id}
                      checked={selectedAddons.has(addon.id)}
                      onCheckedChange={() => toggleAddon(addon.id)}
                    />
                    <Label
                      htmlFor={addon.id}
                      className="flex-1 cursor-pointer flex justify-between"
                    >
                      <span>{addon.name}</span>
                      <span className="text-muted-foreground">
                        +{formatCurrency(addon.price)}
                      </span>
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} variant="outline">
            Cancel
          </Button>
          <Button onClick={handleConfirm} className="bg-[#E8590C] hover:bg-[#E8590C]/90">
            Add to Cart
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
