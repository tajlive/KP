'use client';

/**
 * Stop Loss / Take Profit Component
 * 
 * Allows users to set conditional orders:
 * - Stop Loss: Limit losses by selling when price drops to trigger
 * - Take Profit: Secure gains by selling when price rises to target
 * - Trailing Stop: Dynamic stop that follows price movements
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Shield, 
  Target, 
  TrendingDown, 
  TrendingUp,
  AlertTriangle,
  Plus,
  Trash2,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ConditionalOrder {
  id: string;
  type: 'stop_loss' | 'take_profit' | 'trailing_stop';
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  trigger_price: number;
  limit_price?: number;
  trailing_percent?: number;
  status: 'pending' | 'triggered' | 'executed' | 'cancelled';
  created_at: string;
}

interface StopLossTakeProfitProps {
  sessionId: string;
  symbol: string;
  currentPrice: number;
  positionQuantity: number;
  locale?: 'no' | 'en';
}

export function StopLossTakeProfit({
  sessionId,
  symbol,
  currentPrice,
  positionQuantity,
  locale = 'no',
}: StopLossTakeProfitProps) {
  const t = locale === 'en' ? 'en' : 'no';
  
  const [orders, setOrders] = useState<ConditionalOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'stop_loss' | 'take_profit'>('stop_loss');
  
  // Form state
  const [triggerPrice, setTriggerPrice] = useState('');
  const [quantity, setQuantity] = useState(positionQuantity.toString());
  const [submitting, setSubmitting] = useState(false);

  // Fetch existing orders
  const fetchOrders = async () => {
    try {
      const response = await fetch(`/api/trading/conditional-order?session_id=${sessionId}`);
      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders || []);
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [sessionId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const price = parseFloat(triggerPrice);
    const qty = parseFloat(quantity);
    
    if (!price || price <= 0) {
      toast.error(t === 'en' ? 'Invalid trigger price' : 'Ugyldig trigger-pris');
      return;
    }
    
    if (!qty || qty <= 0 || qty > positionQuantity) {
      toast.error(t === 'en' ? `Quantity must be between 0 and ${positionQuantity}` : `Antall må være mellom 0 og ${positionQuantity}`);
      return;
    }

    setSubmitting(true);
    
    try {
      const response = await fetch('/api/trading/conditional-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          symbol,
          type: activeTab,
          side: 'sell',
          quantity: qty,
          trigger_price: price,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message);
        setTriggerPrice('');
        fetchOrders();
      } else {
        toast.error(data.error || (t === 'en' ? 'Failed to create order' : 'Kunne ikke opprette ordre'));
      }
    } catch (error) {
      toast.error(t === 'en' ? 'Network error' : 'Nettverksfeil');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (orderId: string) => {
    try {
      const response = await fetch(`/api/trading/conditional-order?order_id=${orderId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success(t === 'en' ? 'Order cancelled' : 'Ordre kansellert');
        fetchOrders();
      } else {
        const data = await response.json();
        toast.error(data.error || (t === 'en' ? 'Failed to cancel' : 'Kunne ikke kansellere'));
      }
    } catch (error) {
      toast.error(t === 'en' ? 'Network error' : 'Nettverksfeil');
    }
  };

  const calculatePnL = (order: ConditionalOrder) => {
    if (order.type === 'stop_loss') {
      const loss = (order.trigger_price - currentPrice) * order.quantity;
      return { value: loss, isLoss: true };
    } else {
      const profit = (order.trigger_price - currentPrice) * order.quantity;
      return { value: profit, isLoss: false };
    }
  };

  const stopLossOrders = orders.filter(o => o.type === 'stop_loss' && o.status === 'pending');
  const takeProfitOrders = orders.filter(o => o.type === 'take_profit' && o.status === 'pending');

  return (
    <Card className="border-slate-800 bg-slate-950/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Shield className="w-4 h-4 text-violet-500" />
          {t === 'en' ? 'Stop Loss / Take Profit' : 'Stop Loss / Take Profit'}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Existing Orders */}
        {(stopLossOrders.length > 0 || takeProfitOrders.length > 0) && (
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-slate-500 uppercase">
              {t === 'en' ? 'Active Orders' : 'Aktive Ordrer'}
            </h4>
            
            {stopLossOrders.map(order => {
              const pnl = calculatePnL(order);
              return (
                <div key={order.id} className="flex items-center justify-between p-2 bg-red-500/5 border border-red-500/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-red-500" />
                    <div>
                      <p className="text-sm font-medium">Stop Loss @ ${order.trigger_price}</p>
                      <p className="text-xs text-slate-500">{order.quantity} {symbol}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn("text-xs", pnl.isLoss ? "text-red-400" : "text-green-400")}>
                      {pnl.isLoss ? '' : '+'}{pnl.value.toFixed(2)} USD
                    </span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6"
                      onClick={() => handleCancel(order.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
            
            {takeProfitOrders.map(order => {
              const pnl = calculatePnL(order);
              return (
                <div key={order.id} className="flex items-center justify-between p-2 bg-green-500/5 border border-green-500/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                    <div>
                      <p className="text-sm font-medium">Take Profit @ ${order.trigger_price}</p>
                      <p className="text-xs text-slate-500">{order.quantity} {symbol}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn("text-xs", pnl.isLoss ? "text-red-400" : "text-green-400")}>
                      {pnl.isLoss ? '' : '+'}{pnl.value.toFixed(2)} USD
                    </span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6"
                      onClick={() => handleCancel(order.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Create New Order */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'stop_loss' | 'take_profit')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="stop_loss" className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400">
                <TrendingDown className="w-3 h-3 mr-1" />
                {t === 'en' ? 'Stop Loss' : 'Stop Loss'}
              </TabsTrigger>
              <TabsTrigger value="take_profit" className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400">
                <TrendingUp className="w-3 h-3 mr-1" />
                {t === 'en' ? 'Take Profit' : 'Take Profit'}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="stop_loss" className="space-y-3 mt-3">
              <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 p-2 rounded">
                <AlertTriangle className="w-4 h-4" />
                {t === 'en' 
                  ? `Sell ${symbol} if price drops to or below trigger price` 
                  : `Selg ${symbol} hvis prisen faller til eller under trigger-pris`}
              </div>
            </TabsContent>
            
            <TabsContent value="take_profit" className="space-y-3 mt-3">
              <div className="flex items-center gap-2 text-xs text-green-400 bg-green-500/10 p-2 rounded">
                <Target className="w-4 h-4" />
                {t === 'en' 
                  ? `Sell ${symbol} if price rises to or above target price` 
                  : `Selg ${symbol} hvis prisen stiger til eller over målpris`}
              </div>
            </TabsContent>
          </Tabs>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">
                {t === 'en' ? 'Trigger Price' : 'Trigger-pris'} ($)
              </Label>
              <Input
                type="number"
                step="0.01"
                placeholder={currentPrice.toFixed(2)}
                value={triggerPrice}
                onChange={(e) => setTriggerPrice(e.target.value)}
                className="h-8"
              />
            </div>
            
            <div className="space-y-1">
              <Label className="text-xs">
                {t === 'en' ? 'Quantity' : 'Antall'}
              </Label>
              <Input
                type="number"
                step="0.0001"
                max={positionQuantity}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="h-8"
              />
            </div>
          </div>

          {/* Estimated PnL Preview */}
          {triggerPrice && quantity && (
            <div className={cn(
              "text-xs p-2 rounded flex justify-between",
              activeTab === 'stop_loss' 
                ? "bg-red-500/10 text-red-400" 
                : "bg-green-500/10 text-green-400"
            )}>
              <span>{t === 'en' ? 'Estimated' : 'Estimert'} {activeTab === 'stop_loss' ? 'Loss' : 'Profit'}:</span>
              <span>
                {(() => {
                  const price = parseFloat(triggerPrice);
                  const qty = parseFloat(quantity);
                  if (!price || !qty) return '-';
                  const diff = (price - currentPrice) * qty;
                  return `${diff >= 0 ? '+' : ''}${diff.toFixed(2)} USD`;
                })()}
              </span>
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full"
            disabled={submitting || !triggerPrice || !quantity}
            variant={activeTab === 'stop_loss' ? 'destructive' : 'default'}
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Plus className="w-4 h-4 mr-2" />
            )}
            {t === 'en' 
              ? `Set ${activeTab === 'stop_loss' ? 'Stop Loss' : 'Take Profit'}` 
              : `Sett ${activeTab === 'stop_loss' ? 'Stop Loss' : 'Take Profit'}`}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default StopLossTakeProfit;
