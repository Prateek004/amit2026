'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { signOut } from '@/lib/supabase';
import { db, getCurrentBusiness, getCurrentProfile, addToSyncQueue } from '@/lib/db';
import { useAuth } from '@/hooks/useAuth';

export default function SettingsPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [businessData, setBusinessData] = useState({
    name: '',
    gst_number: '',
    address: '',
    phone: '',
    email: '',
  });
  const [userPin, setUserPin] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const business = await getCurrentBusiness();
    if (business) {
      setBusinessData({
        name: business.name || '',
        gst_number: business.gst_number || '',
        address: business.address || '',
        phone: business.phone || '',
        email: business.email || '',
      });
    }
  };

  const handleSaveBusinessInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const business = await getCurrentBusiness();
      if (!business) return;

      await db.businesses.update(business.id, businessData);
      await addToSyncQueue(business.id, 'businesses', 'update', business.id, businessData);

      alert('Settings saved successfully');
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const profile = await getCurrentProfile();
      if (!profile) return;

      await db.profiles.update(profile.id, { pin: userPin });
      const business = await getCurrentBusiness();
      if (business) {
        await addToSyncQueue(business.id, 'profiles', 'update', profile.id, { pin: userPin });
      }

      alert('PIN updated successfully');
      setUserPin('');
    } catch (error) {
      console.error('PIN update error:', error);
      alert('Failed to update PIN');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    if (!confirm('Are you sure you want to logout?')) return;

    try {
      await signOut();
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
      alert('Failed to logout');
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Settings</h1>
        <Button
          onClick={handleLogout}
          variant="destructive"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </div>

      <Tabs defaultValue="business" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="business">Business Info</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="about">About</TabsTrigger>
        </TabsList>

        <TabsContent value="business">
          <Card>
            <CardHeader>
              <CardTitle>Business Information</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveBusinessInfo} className="space-y-4">
                <div>
                  <Label htmlFor="businessName">Business Name</Label>
                  <Input
                    id="businessName"
                    value={businessData.name}
                    onChange={(e) =>
                      setBusinessData({ ...businessData, name: e.target.value })
                    }
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="gstNumber">GST Number (Optional)</Label>
                  <Input
                    id="gstNumber"
                    value={businessData.gst_number}
                    onChange={(e) =>
                      setBusinessData({ ...businessData, gst_number: e.target.value })
                    }
                    placeholder="22AAAAA0000A1Z5"
                  />
                </div>

                <div>
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    value={businessData.address}
                    onChange={(e) =>
                      setBusinessData({ ...businessData, address: e.target.value })
                    }
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={businessData.phone}
                      onChange={(e) =>
                        setBusinessData({ ...businessData, phone: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={businessData.email}
                      onChange={(e) =>
                        setBusinessData({ ...businessData, email: e.target.value })
                      }
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-[#E8590C] hover:bg-[#E8590C]/90"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? 'Saving...' : 'Save Changes'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 mb-6">
                <div>
                  <p className="text-sm text-muted-foreground">Role</p>
                  <p className="font-medium capitalize">{profile?.role || 'User'}</p>
                </div>
              </div>

              {profile?.role === 'owner' && (
                <form onSubmit={handleSavePin} className="space-y-4">
                  <div>
                    <Label htmlFor="pin">Owner PIN (4-6 digits)</Label>
                    <Input
                      id="pin"
                      type="password"
                      inputMode="numeric"
                      value={userPin}
                      onChange={(e) => setUserPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="Enter new PIN"
                      maxLength={6}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Required for voiding bills and sensitive operations
                    </p>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading || userPin.length < 4}
                    className="bg-[#E8590C] hover:bg-[#E8590C]/90"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {loading ? 'Updating...' : 'Update PIN'}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="about">
          <Card>
            <CardHeader>
              <CardTitle>About HissabWala</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Version</p>
                <p className="font-medium">1.0.0</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Description</p>
                <p>
                  HissabWala is an offline-first POS system designed for Indian small
                  businesses. Features include GST billing, inventory management, customer
                  tracking, and comprehensive reports.
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Features</p>
                <ul className="list-disc list-inside text-sm space-y-1 mt-2">
                  <li>Offline-first with automatic sync</li>
                  <li>GST compliant billing</li>
                  <li>Split payment (Cash + UPI)</li>
                  <li>Udhaar (credit) tracking</li>
                  <li>KOT & thermal printing</li>
                  <li>WhatsApp bill sharing</li>
                  <li>Comprehensive reports</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
