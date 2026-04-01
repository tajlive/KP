'use client';

import Calculator from './Calculator';

interface CompoundCalculatorProps {
  language?: 'no' | 'en';
}

export default function CompoundCalculator({ language = 'no' }: CompoundCalculatorProps) {
  return <Calculator />;
}
