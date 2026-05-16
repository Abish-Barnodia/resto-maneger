'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { Sidebar } from './sidebar';
import { useAuth } from '@/hooks/use-auth';
import { CalendarDays, Clock, Bell, ChevronDown } from 'lucide-react';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';

function DateTimeFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const dateInputRef = React.useRef<HTMLInputElement>(null);
  const timeInputRef = React.useRef<HTMLInputElement>(null);
  
  const [mounted, setMounted] = useState(false);
  const [currentDate, setCurrentDate] = useState('');
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    setMounted(true);
    // Initialize with current or URL params
    const now = new Date();
    const urlDate = searchParams.get('date');
    const urlTime = searchParams.get('time');
    
    if (urlDate) {
      setCurrentDate(urlDate);
    } else {
      setCurrentDate(now.toISOString().split('T')[0]);
    }
    
    if (urlTime) {
      setCurrentTime(urlTime);
    } else {
      setCurrentTime(now.toTimeString().slice(0, 5));
    }
  }, [searchParams]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCurrentDate(val);
    const params = new URLSearchParams(searchParams.toString());
    params.set('date', val);
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCurrentTime(val);
    const params = new URLSearchParams(searchParams.toString());
    params.set('time', val);
    router.push(`${pathname}?${params.toString()}`);
  };

  if (!mounted) {
    return (
      <>
        <div className="flex items-center gap-1.5 text-sm text-gray-500">
          <CalendarDays size={14} className="text-gray-400" />
          <span className="w-24 h-4 bg-gray-100 rounded animate-pulse" />
        </div>
        <div className="w-px h-5 bg-gray-200 mx-2" />
        <div className="flex items-center gap-1.5 text-sm text-gray-500">
          <Clock size={14} className="text-gray-400" />
          <span className="w-16 h-4 bg-gray-100 rounded animate-pulse" />
        </div>
      </>
    );
  }

  // Format for display
  let displayDate = '';
  try {
    displayDate = new Date(currentDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { displayDate = currentDate; }
  
  let displayTime = currentTime;
  try {
    const [h, m] = currentTime.split(':');
    const d = new Date();
    d.setHours(parseInt(h, 10));
    d.setMinutes(parseInt(m, 10));
    displayTime = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase();
  } catch { displayTime = currentTime; }

  return (
    <>
      <div 
        onClick={() => dateInputRef.current?.showPicker()}
        className="relative flex items-center gap-1.5 text-sm text-gray-500 cursor-pointer hover:text-gray-800 transition-colors"
      >
        <CalendarDays size={14} className="text-gray-400" />
        <span>{displayDate}</span>
        <input 
          ref={dateInputRef}
          type="date" 
          value={currentDate}
          onChange={handleDateChange}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
        />
      </div>
      <div className="w-px h-5 bg-gray-200 mx-2" />
      <div 
        onClick={() => timeInputRef.current?.showPicker()}
        className="relative flex items-center gap-1.5 text-sm text-gray-500 cursor-pointer hover:text-gray-800 transition-colors"
      >
        <Clock size={14} className="text-gray-400" />
        <span>{displayTime}</span>
        <input 
          ref={timeInputRef}
          type="time" 
          value={currentTime}
          onChange={handleTimeChange}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
        />
      </div>
    </>
  );
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  return (
    <div className="flex min-h-screen bg-muted/30 print:hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        {/* ── Top Header Bar ── */}
        <header className="h-14 border-b border-gray-200 bg-white flex items-center justify-end px-6 gap-4 shrink-0 shadow-sm">
          <Suspense fallback={
            <div className="flex items-center gap-4">
              <span className="w-24 h-4 bg-gray-100 rounded animate-pulse" />
              <span className="w-16 h-4 bg-gray-100 rounded animate-pulse" />
            </div>
          }>
            <DateTimeFilter />
          </Suspense>

          {/* Notification bell */}
          <div className="w-px h-5 bg-gray-200 mx-1" />
          <button className="relative text-gray-400 hover:text-gray-600 transition-colors p-1.5 rounded-lg hover:bg-gray-50">
            <Bell size={18} />
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
              3
            </span>
          </button>

          {/* User profile */}
          <div className="w-px h-5 bg-gray-200 mx-1" />
          <div className="flex items-center gap-2.5 cursor-pointer hover:bg-gray-50 rounded-lg px-2 py-1 transition-colors">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-primary/20">
              <img
                src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"
                alt="User"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="hidden md:block text-right leading-tight">
              <p className="text-sm font-bold text-gray-800">{user?.name || 'Admin User'}</p>
              <p className="text-[10px] text-gray-400 capitalize">{user?.role || 'Admin'}</p>
            </div>
            <ChevronDown size={14} className="text-gray-400" />
          </div>
        </header>

        {/* ── Main Content ── */}
        <main className="flex-1 p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
