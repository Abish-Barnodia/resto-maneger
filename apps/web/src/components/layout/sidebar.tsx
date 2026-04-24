'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  Receipt, 
  UtensilsCrossed, 
  Table as TableIcon, 
  CalendarDays, 
  Store, 
  Package, 
  CreditCard, 
  FileText, 
  Users, 
  LogOut,
  ChevronRight
} from 'lucide-react';

const MENU_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/admin/dashboard' },
  { icon: Receipt, label: 'POS', href: '/admin/pos' },
  { icon: FileText, label: 'Orders', href: '/admin/orders', badge: '15' },
  { icon: UtensilsCrossed, label: 'Kitchen', href: '/admin/kitchen', badge: '15' },
  { icon: TableIcon, label: 'Table', href: '/admin/tables' },
  { icon: CalendarDays, label: 'Reservations', href: '/admin/reservations', badge: '1' },
  { icon: Store, label: 'Offering', href: '/admin/offering' },
  { icon: Package, label: 'Catalog', href: '/admin/catalog' },
  { icon: Receipt, label: 'Billing', href: '/admin/billing' },
  { icon: FileText, label: 'Bills', href: '/admin/bills' },
  { icon: Package, label: 'Inventory', href: '/admin/inventory' },
  { icon: CreditCard, label: 'Payments', href: '/admin/payments', badge: '14' },
  { icon: FileText, label: 'Invoice', href: '/admin/invoices' },
  { icon: Users, label: 'User', href: '/admin/users' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="w-64 bg-background border-r flex flex-col h-screen sticky top-0">
      {/* Brand */}
      <div className="p-6 flex items-center gap-3">
        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-primary-foreground font-bold text-xl shadow-lg shadow-primary/20">
          <UtensilsCrossed size={24} />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">RestroBit</h1>
        </div>
      </div>

      {/* Profile */}
      <div className="px-6 py-4 flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-primary/20">
          <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="User" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold truncate text-foreground">{user?.name || 'Admin User'}</p>
          <p className="text-xs text-muted-foreground capitalize">{user?.role || 'Waiter'}</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 overflow-y-auto space-y-1 py-4 scrollbar-hide">
        {MENU_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link 
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all group relative",
                isActive 
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon size={20} className={cn("transition-colors", isActive ? "text-primary-foreground" : "group-hover:text-primary")} />
              <span className="flex-1 font-medium text-sm">{item.label}</span>
              {item.badge && (
                <span className={cn(
                  "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                  isActive ? "bg-white/20 text-white" : "bg-muted-foreground/20 text-muted-foreground"
                )}>
                  {item.badge}
                </span>
              )}
              {isActive && (
                <div className="absolute left-0 w-1 h-6 bg-white rounded-r-full transform translate-x-[-16px]" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t">
        <button 
          onClick={() => logout()}
          className="w-full flex items-center gap-3 px-4 py-3 text-muted-foreground hover:text-destructive hover:bg-destructive/5 rounded-xl transition-all group"
        >
          <LogOut size={20} />
          <span className="font-medium text-sm">Logout</span>
        </button>
      </div>
    </aside>
  );
}
