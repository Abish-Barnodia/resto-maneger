'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface FilterContextValue {
  filterDate: string;
  filterTime: string;
  setFilterDate: (v: string) => void;
  setFilterTime: (v: string) => void;
}

const FilterContext = createContext<FilterContextValue>({
  filterDate: '',
  filterTime: '',
  setFilterDate: () => {},
  setFilterTime: () => {},
});

export function FilterProvider({ children }: { children: React.ReactNode }) {
  const [filterDate, setFilterDate] = useState('');
  const [filterTime, setFilterTime] = useState('');

  useEffect(() => {
    // Only set default if not already set (e.g. from a previous mount if we move this up, 
    // but here it's about preventing it from resetting on every render if the parent re-renders)
    // Actually, the issue is likely that it's called on every mount of FilterProvider.
    // DashboardLayout has FilterProvider inside it.
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().slice(0, 5);
    
    setFilterDate(prev => prev || dateStr);
    setFilterTime(prev => prev || timeStr);
  }, []);

  return (
    <FilterContext.Provider value={{ filterDate, filterTime, setFilterDate, setFilterTime }}>
      {children}
    </FilterContext.Provider>
  );
}

export function useFilter() {
  return useContext(FilterContext);
}
