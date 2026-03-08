export type PulseMode = "paper" | "live";
export type ChartTimeframe = "1D" | "7D" | "30D" | "ALL";
export type VisualizationType = "area" | "line" | "candlestick";

export interface PulseEvent {
  id: string;
  time: number; // Unix timestamp
  type: "buy" | "sell" | "stop-loss" | "alert";
  symbol: string;
  price: number;
  amount: number;
  explanation: string;
  courseModuleSlug?: string;
}

export interface PulseChartData {
  time: number;
  value: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
}

export interface usePulseDataResult {
  data: PulseChartData[];
  events: PulseEvent[];
  loading: boolean;
  error: Error | null;
}
