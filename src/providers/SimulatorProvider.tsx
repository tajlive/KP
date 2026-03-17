"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { SimulatorEngine } from "@/lib/simulator/engine";

const engine = typeof window !== 'undefined' ? new SimulatorEngine() : null;

const defaultState = {
  prices: { BTC: 50000 },
  balance: 100000,
  positions: [],
  history: []
};

const SimulatorContext = createContext<unknown>({ engine, state: defaultState });

export function SimulatorProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState(() => engine?.getState() ?? defaultState);

  useEffect(() => {
    if (!engine) return;
    const interval = setInterval(() => {
      const price = 50000 + Math.sin(Date.now() / 2000) * 300;
      engine.setPrice("BTC", price);
      setState(engine.getState());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <SimulatorContext.Provider value={{ engine, state }}>
      {children}
    </SimulatorContext.Provider>
  );
}

export function useSimulator() {
  return useContext(SimulatorContext);
}
