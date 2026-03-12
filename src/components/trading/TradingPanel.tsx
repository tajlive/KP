"use client"

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { useTrading } from '@/hooks/useTrading';
import { useAnimatedPrice } from '@/hooks/usePrices';
import { formatCurrency, formatPercentage, getValueColor, TRADING_FEE_PERCENT } from '@/lib/trading';
import { ArrowUp, ArrowDown, Wallet, TrendingUp, AlertCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface TradingPanelProps {
  userId: string;
  symbol: string;
  availableBalance: number;
  currentPosition?: { quantity: number; avgBuyPrice: number };
}

export const TradingPanel: React.FC<TradingPanelProps> = ({
  userId,
  symbol,
  availableBalance,
  currentPosition,
}) => {
  const { buy, sell, executingTrade, error } = useTrading(userId);
  const { price, formattedPrice, priceDirection, priceChange24h } = useAnimatedPrice(symbol);
  
  const [activeTab, setActiveTab] = useState<'buy' | 'sell'>('buy');
  const [quantity, setQuantity] = useState('');
  const [percentage, setPercentage] = useState(0);
  const [tradeError, setTradeError] = useState<string | null>(null);

  const totalAmount = parseFloat(quantity || '0') * price;
  const fee = totalAmount * TRADING_FEE_PERCENT;
  const totalCost = totalAmount + fee;

  const maxBuyQuantity = price > 0 ? availableBalance / price : 0;
  const maxSellQuantity = currentPosition?.quantity || 0;

  const handlePercentageChange = (value: number[]) => {
    const percent = value[0];
    setPercentage(percent);
    
    if (activeTab === 'buy') {
      const amount = (availableBalance * percent) / 100;
      const qty = price > 0 ? amount / price : 0;
      setQuantity(qty.toFixed(6));
    } else {
      const qty = (maxSellQuantity * percent) / 100;
      setQuantity(qty.toFixed(6));
    }
  };

  const handleQuantityChange = (value: string) => {
    setQuantity(value);
    const qty = parseFloat(value || '0');
    
    if (activeTab === 'buy' && maxBuyQuantity > 0) {
      setPercentage(Math.min((qty / maxBuyQuantity) * 100, 100));
    } else if (maxSellQuantity > 0) {
      setPercentage(Math.min((qty / maxSellQuantity) * 100, 100));
    }
  };

  const handleTrade = async () => {
    setTradeError(null);
    const qty = parseFloat(quantity);

    if (!qty || qty <= 0) {
      setTradeError('Vennligst angi en gyldig mengde');
      return;
    }

    if (activeTab === 'buy') {
      if (totalCost > availableBalance) {
        setTradeError('Utilstrekkelig saldo');
        return;
      }
      const result = await buy(symbol, qty, price);
      if (!result.success) {
        setTradeError(result.error || 'Kjøp mislyktes');
      } else {
        setQuantity('');
        setPercentage(0);
      }
    } else {
      if (qty > maxSellQuantity) {
        setTradeError('Du eier ikke nok av denne valutaen');
        return;
      }
      const result = await sell(symbol, qty, price);
      if (!result.success) {
        setTradeError(result.error || 'Salg mislyktes');
      } else {
        setQuantity('');
        setPercentage(0);
      }
    }
  };

  const baseAsset = symbol.replace('USDT', '');

  return (
    <Card className="border-white/10 bg-card/50 backdrop-blur-xl">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between">
          <span>Trading</span>
          <div className="flex items-center gap-2">
            <span className={`text-lg font-mono ${getValueColor(priceChange24h)}`}>
              {formattedPrice}
            </span>
            <Badge 
              variant={priceDirection === 'up' ? 'default' : priceDirection === 'down' ? 'destructive' : 'secondary'}
              className="text-xs"
            >
              {priceDirection === 'up' && <ArrowUp className="h-3 w-3 mr-1" />}
              {priceDirection === 'down' && <ArrowDown className="h-3 w-3 mr-1" />}
              {formatPercentage(priceChange24h)}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'buy' | 'sell')}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger 
              value="buy" 
              className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white"
            >
              Kjøp {baseAsset}
            </TabsTrigger>
            <TabsTrigger 
              value="sell"
              className="data-[state=active]:bg-red-500 data-[state=active]:text-white"
            >
              Selg {baseAsset}
            </TabsTrigger>
          </TabsList>

          {(error || tradeError) && (
            <Alert variant="destructive" className="mb-4 border-red-500/20 bg-red-500/10">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{tradeError || error}</AlertDescription>
            </Alert>
          )}

          <TabsContent value="buy" className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                Tilgjengelig
              </span>
              <span className="font-mono">{formatCurrency(availableBalance)}</span>
            </div>

            <div className="space-y-2">
              <Label>Mengde ({baseAsset})</Label>
              <Input
                type="number"
                step="0.000001"
                placeholder="0.00"
                value={quantity}
                onChange={(e) => handleQuantityChange(e.target.value)}
                className="bg-background/50 border-white/10 font-mono"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <Label>Andel av saldo</Label>
                <span className="text-muted-foreground">{percentage.toFixed(0)}%</span>
              </div>
              <Slider
                value={[percentage]}
                onValueChange={handlePercentageChange}
                max={100}
                step={1}
                className="cursor-pointer"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0%</span>
                <span>25%</span>
                <span>50%</span>
                <span>75%</span>
                <span>100%</span>
              </div>
            </div>

            <div className="space-y-2 p-3 rounded-lg bg-background/50">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Pris</span>
                <span className="font-mono">{formatCurrency(price)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Beløp</span>
                <span className="font-mono">{formatCurrency(totalAmount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Gebyr ({(TRADING_FEE_PERCENT * 100).toFixed(1)}%)</span>
                <span className="font-mono">{formatCurrency(fee)}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold pt-2 border-t border-white/10">
                <span>Totalt</span>
                <span className="font-mono">{formatCurrency(totalCost)}</span>
              </div>
            </div>

            <Button
              onClick={handleTrade}
              disabled={executingTrade || !quantity || parseFloat(quantity) <= 0}
              className="w-full bg-emerald-500 hover:bg-emerald-600"
            >
              {executingTrade ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Kjøp {baseAsset}
                </>
              )}
            </Button>
          </TabsContent>

          <TabsContent value="sell" className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                I besittelse
              </span>
              <span className="font-mono">{maxSellQuantity.toFixed(6)} {baseAsset}</span>
            </div>

            {!currentPosition && (
              <Alert className="border-yellow-500/20 bg-yellow-500/10">
                <AlertCircle className="h-4 w-4 text-yellow-500" />
                <AlertDescription className="text-yellow-500">
                  Du har ingen {baseAsset} å selge
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label>Mengde ({baseAsset})</Label>
              <Input
                type="number"
                step="0.000001"
                placeholder="0.00"
                value={quantity}
                onChange={(e) => handleQuantityChange(e.target.value)}
                className="bg-background/50 border-white/10 font-mono"
                disabled={!currentPosition}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <Label>Andel av beholdning</Label>
                <span className="text-muted-foreground">{percentage.toFixed(0)}%</span>
              </div>
              <Slider
                value={[percentage]}
                onValueChange={handlePercentageChange}
                max={100}
                step={1}
                disabled={!currentPosition}
                className="cursor-pointer"
              />
            </div>

            <div className="space-y-2 p-3 rounded-lg bg-background/50">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Pris</span>
                <span className="font-mono">{formatCurrency(price)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Beløp</span>
                <span className="font-mono">{formatCurrency(totalAmount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Gebyr ({(TRADING_FEE_PERCENT * 100).toFixed(1)}%)</span>
                <span className="font-mono">{formatCurrency(fee)}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold pt-2 border-t border-white/10">
                <span>Du mottar</span>
                <span className="font-mono">{formatCurrency(totalAmount - fee)}</span>
              </div>
            </div>

            <Button
              onClick={handleTrade}
              disabled={executingTrade || !quantity || parseFloat(quantity) <= 0 || !currentPosition}
              className="w-full bg-red-500 hover:bg-red-600"
            >
              {executingTrade ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <ArrowDown className="h-4 w-4 mr-2" />
                  Selg {baseAsset}
                </>
              )}
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
