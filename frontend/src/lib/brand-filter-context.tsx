'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

interface BrandFilterValue {
  outletId: string;
  setOutletId: (id: string) => void;
}

const BrandFilterContext = createContext<BrandFilterValue | null>(null);

export function BrandFilterProvider({ children }: { children: ReactNode }) {
  const [outletId, setOutletId] = useState('all');
  return <BrandFilterContext.Provider value={{ outletId, setOutletId }}>{children}</BrandFilterContext.Provider>;
}

export function useBrandFilter(): BrandFilterValue {
  const ctx = useContext(BrandFilterContext);
  if (!ctx) throw new Error('useBrandFilter must be used within a BrandFilterProvider');
  return ctx;
}
