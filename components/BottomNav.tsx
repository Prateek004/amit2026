'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  ShoppingCart, 
  Package, 
  Users, 
  FileText, 
  Settings 
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/pos', label: 'POS', icon: ShoppingCart },
  { href: '/menu', label: 'Menu', icon: Package },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/reports', label: 'Reports', icon: FileText },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t">
      <div className="grid grid-cols-5 gap-1 p-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center py-2 px-1 text-xs transition-colors',
                isActive
                  ? 'text-[#E8590C] font-semibold'
                  : 'text-muted-foreground'
              )}
            >
              <Icon className={cn('h-5 w-5 mb-1', isActive && 'text-[#E8590C]')} />
              <span className="truncate w-full text-center">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
