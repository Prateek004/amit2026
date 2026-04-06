'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { db, getCurrentBusiness } from '@/lib/db';

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [businessName, setBusinessName] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleComplete = async () => {
    setLoading(true);
    try {
      const business = await getCurrentBusiness();
      if (business) {
        await db.businesses.update(business.id, {
          name: businessName || business.name,
        });
      }
      router.push('/pos');
    } catch (error) {
      console.error('Onboarding error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-muted/40">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Welcome to HissabWala</CardTitle>
          <p className="text-sm text-muted-foreground">Step {step} of 1</p>
        </CardHeader>
        <CardContent className="space-y-6">
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="businessName">Business Name</Label>
                <Input
                  id="businessName"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Enter your business name"
                />
              </div>

              <div>
                <Label htmlFor="logo">Business Logo (Optional)</Label>
                <Input
                  id="logo"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  You can add GST and other details later in Settings
                </p>
              </div>

              <Button
                onClick={handleComplete}
                disabled={loading}
                className="w-full bg-[#E8590C] hover:bg-[#E8590C]/90"
              >
                {loading ? 'Setting up...' : 'Get Started'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
