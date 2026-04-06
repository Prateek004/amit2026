'use client';

import { useState, useEffect } from 'react';
import { Cloud, CloudOff, Loader2 } from 'lucide-react';
import { db } from '@/lib/db';
import { supabase } from '@/lib/supabase';

export function SyncIndicator() {
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine);
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    const checkPendingSync = async () => {
      const pending = await db.sync_queue.filter(item => item.synced === false).count();
      setPendingCount(pending);
    };

    checkPendingSync();
    const interval = setInterval(checkPendingSync, 5000);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (isOnline && pendingCount > 0) {
      syncPendingData();
    }
  }, [isOnline, pendingCount]);

  const syncPendingData = async () => {
    if (isSyncing) return;
    
    setIsSyncing(true);
    try {
      const pending = await db.sync_queue
        .filter(item => item.synced === false)
        .limit(10)
        .toArray();

      for (const item of pending) {
        try {
          if (item.operation === 'insert') {
            await supabase.from(item.table_name).insert(item.payload);
          } else if (item.operation === 'update') {
            await supabase
              .from(item.table_name)
              .update(item.payload)
              .eq('id', item.record_id);
          } else if (item.operation === 'delete') {
            await supabase
              .from(item.table_name)
              .delete()
              .eq('id', item.record_id);
          }

          await db.sync_queue.update(item.id, { synced: true });
        } catch (error) {
          console.error('Sync error for item:', item.id, error);
        }
      }
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  if (!isOnline) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <CloudOff className="h-4 w-4" />
        <span>Offline</span>
        {pendingCount > 0 && <span className="text-xs">({pendingCount} pending)</span>}
      </div>
    );
  }

  if (isSyncing) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Syncing...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm text-green-600">
      <Cloud className="h-4 w-4" />
      <span>Synced</span>
    </div>
  );
}
