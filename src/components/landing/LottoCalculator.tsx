"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Calculator, Info, XCircle, TrendingUp, PiggyBank, Ticket } from "lucide-react";

interface CalculationResult {
  lottoReturn: number;
  savingsReturn: number;
  investingReturn: number;
  lottoProb: string;
}

export function LottoCalculator() {
  const [amount, setAmount] = useState<number>(100);
  const [years, setYears] = useState<number>(10);
  const [showResults, setShowResults] = useState(false);

  // Norwegian lotto odds: approximately 1 in 5 million for top prize
  // Average return on lotto: ~50% (you lose 50% on average)
  const calculateReturns = (): CalculationResult => {
    // Lotto: 50% RTP (Return to Player)
    const lottoReturn = amount * 0.5 * years * 52; // Weekly lotto
    
    // Bank savings: ~3% annual interest
    const savingsRate = 0.03;
    const savingsReturn = amount * (Math.pow(1 + savingsRate, years) - 1) / savingsRate * 52;
    
    // Investing (historical stock market avg): ~7% annual
    const investingRate = 0.07;
    const investingReturn = amount * (Math.pow(1 + investingRate, years) - 1) / investingRate * 52;
    
    return {
      lottoReturn: Math.round(lottoReturn),
      savingsReturn: Math.round(savingsReturn),
      investingReturn: Math.round(investingReturn),
      lottoProb: "1:5 000 000",
    };
  };

  const results = calculateReturns();
  const totalInvested = amount * years * 52;

  const formatNOK = (val: number) => 
    val.toLocaleString('nb-NO', { style: 'currency', currency: 'NOK', maximumFractionDigits: 0 });

  return (
    <section className="py-16 bg-gradient-to-b from-slate-900 to-slate-800">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/20 text-orange-300 rounded-full text-sm font-semibold mb-4">
            <Calculator className="w-4 h-4" />
            Hva gjør du med 100-lappen?
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Oddsen, banken, eller investering?
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Se forskjellen på å bruke 100 kr i uken på lotto, spare i banken, 
            eller investere i krypto med Klarpakke.
          </p>
        </div>

        {/* Calculator inputs */}
        <div className="bg-slate-800/50 rounded-2xl p-6 mb-8 border border-white/10">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Ukentlig beløp
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">kr</span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-10 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min={10}
                  max={10000}
                  step={10}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Tidshorisont (år)
              </label>
              <input
                type="range"
                value={years}
                onChange={(e) => setYears(Number(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer mt-4 accent-blue-500"
                min={1}
                max={30}
              />
              <div className="text-center text-white font-medium mt-2">{years} år</div>
            </div>
          </div>

          <button
            onClick={() => setShowResults(!showResults)}
            className="w-full mt-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
          >
            {showResults ? "Skjul resultater" : "Se resultatene"}
          </button>
        </div>

        {/* Results */}
        {showResults && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Total invested */}
            <div className="text-center mb-6">
              <span className="text-slate-400">Totalt satt inn: </span>
              <span className="text-white font-bold">{formatNOK(totalInvested)}</span>
            </div>

            {/* Lotto */}
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-5">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Ticket className="w-6 h-6 text-red-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-white font-bold">Lotto / Oddsen</h3>
                    <span className="text-red-400 text-sm font-medium">RTP: 50%</span>
                  </div>
                  <p className="text-slate-400 text-sm mb-3">
                    Sjansen for toppremie: {results.lottoProb}. I snitt taper du halvparten.
                  </p>
                  <div className="flex items-center gap-2">
                    <XCircle className="w-5 h-5 text-red-500" />
                    <span className="text-red-400 font-bold">
                      Forventet verdi: {formatNOK(results.lottoReturn)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bank savings */}
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-5">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-yellow-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <PiggyBank className="w-6 h-6 text-yellow-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-white font-bold">Banksparing</h3>
                    <span className="text-yellow-400 text-sm font-medium">~3% rente</span>
                  </div>
                  <p className="text-slate-400 text-sm mb-3">
                    Trygt, men inflasjonen spiser opp mesteparten av gevinsten.
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-yellow-400 font-bold">
                      Verdi etter {years} år: {formatNOK(results.savingsReturn)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Investing */}
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-5">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-6 h-6 text-green-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-white font-bold">Investere med Klarpakke</h3>
                    <span className="text-green-400 text-sm font-medium">~7% historisk</span>
                  </div>
                  <p className="text-slate-400 text-sm mb-3">
                    Lær å investere med paper trading først. Historisk avkastning 
                    (ikke garanti for fremtidig avkastning).
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-green-400 font-bold">
                      Verdi etter {years} år: {formatNOK(results.investingReturn)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Disclaimer */}
            <div className="flex items-start gap-2 text-xs text-slate-500 mt-4">
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p>
                Beregningene er estimater basert på historiske data. Lotto har 50% RTP 
                (Return to Player), bankrente er satt til 3%, og investeringsavkastning 
                er basert på historisk gjennomsnitt på 7%. Krypto-investeringer kan 
                svinge kraftig, og du kan tape hele investeringen.
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </section>
  );
}
