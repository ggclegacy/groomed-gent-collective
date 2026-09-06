'use client';
import { createContext, useContext } from 'react';
import type { GentlemanMemory } from '@/lib/gentleman/model';
export type GentlemanStore = {
  memory: GentlemanMemory;
  update: (m: GentlemanMemory) => void;
  ask: (q: string) => void;
  revision: number | null;
  dirty: boolean;
};
export const GentlemanContext = createContext<GentlemanStore | null>(null);
export function useGentleman() {
  const context = useContext(GentlemanContext);
  if (!context) throw new Error('Gentleman provider missing');
  return context;
}
