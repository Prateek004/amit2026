'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface PinDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVerify: (pin: string) => Promise<boolean>;
  title?: string;
  description?: string;
}

export function PinDialog({
  open,
  onOpenChange,
  onVerify,
  title = 'Owner PIN Required',
  description = 'Enter owner PIN to proceed',
}: PinDialogProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(false);

  const handleVerify = async () => {
    setError('');
    setVerifying(true);
    try {
      const valid = await onVerify(pin);
      if (valid) {
        setPin('');
        onOpenChange(false);
      } else {
        setError('Invalid PIN');
      }
    } catch (err) {
      setError('Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  const handleClose = () => {
    setPin('');
    setError('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="pin">PIN</Label>
            <Input
              id="pin"
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder="Enter 4-6 digit PIN"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleVerify();
                }
              }}
            />
            {error && <p className="text-sm text-destructive mt-1">{error}</p>}
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleClose} variant="outline">
            Cancel
          </Button>
          <Button
            onClick={handleVerify}
            disabled={verifying || pin.length < 4}
            className="bg-[#E8590C] hover:bg-[#E8590C]/90"
          >
            {verifying ? 'Verifying...' : 'Verify'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
