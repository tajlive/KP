"use client"

import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePrices } from '@/hooks/usePrices';
import { TOP_COINS } from '@/lib/binance';
import { formatPrice, formatLargeNumber } from '@/lib/binance';
import { Search, TrendingUp, TrendingDown, Star, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CoinListProps {
  selectedSymbol: string;
  onSelectSymbol: (symbol: string) => void;
  favorites?: string[];
  onToggleFavorite?: (symbol: string) => void;
}

type SortBy = 'price' | 'change' | 'volume';
type FilterTab = 'all' | 'gainers' | 'losers' | 'favorites';

export const CoinList: React.FC<CoinListProps> = ({
  selectedSymbol,
  onSelectSymbol,
  favorites = [],
  onToggleFavorite,
}) => {
  const { prices, isConnected } = usePrices();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('volume');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  const coinList = useMemo(() => {
    let list = TOP_COINS.map((coin) => {
      const priceData = prices[coin.symbol];
      return {
        ...coin,
        price: priceData?.price || 0,
        priceChange24h: priceData?.price_change_percent_24h || 0,
        volume24h: priceData?.volume_24h || 0,
        isFavorite: favorites.includes(coin.symbol),
      };
    });

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      list = list.filter(
        (coin) =>
          coin.name.toLowerCase().includes(query) ||
          coin.symbol.toLowerCase().includes(query) ||
          coin.baseAsset.toLowerCase().includes(query)
      );
    }

    // Filter by tab
    switch (activeTab) {
      case 'gainers':
        list = list.filter((coin) => coin.priceChange24h > 0);
        break;
      case 'losers':
        list = list.filter((coin) => coin.priceChange24h < 0);
        break;
      case 'favorites':
        list = list.filter((coin) => coin.isFavorite);
        break;
    }

    // Sort
    list.sort((a, b) => {
      switch (sortBy) {
        case 'price':
          return b.price - a.price;
        case 'change':
          return Math.abs(b.priceChange24h) - Math.abs(a.priceChange24h);
        case 'volume':
        default:
          return b.volume24h - a.volume24h;
      }
    });

    return list;
  }, [prices, searchQuery, activeTab, sortBy, favorites]);

  return (
    <Card className="border-white/10 bg-card/50 backdrop-blur-xl h-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between mb-4">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Marked
            <Badge 
              variant={isConnected ? 'default' : 'secondary'}
              className={cn(
                "text-xs",
                isConnected && "bg-emerald-500/20 text-emerald-400"
              )}
            >
              {isConnected ? 'Live' : 'Kobler til...'}
            </Badge>
          </CardTitle>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Søk etter valuta..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-background/50 border-white/10"
          />
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as FilterTab)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">Alle</TabsTrigger>
            <TabsTrigger value="gainers" className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Vinnere
            </TabsTrigger>
            <TabsTrigger value="losers" className="flex items-center gap-1">
              <TrendingDown className="h-3 w-3" />
              Taperne
            </TabsTrigger>
            <TabsTrigger value="favorites" className="flex items-center gap-1">
              <Star className="h-3 w-3" />
              Favoritter
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>

      <CardContent className="p-0">
        <div className="border-b border-white/5">
          <div className="grid grid-cols-12 gap-2 px-4 py-2 text-xs text-muted-foreground">
            <div className="col-span-4">Valuta</div>
            <div
              role="button"
              tabIndex={0}
              className="col-span-3 text-right cursor-pointer hover:text-foreground"
              onClick={() => setSortBy('price')}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSortBy('price'); } }}
              aria-label="Sorter på pris"
            >
              Pris {sortBy === 'price' && '•'}
            </div>
            <div
              role="button"
              tabIndex={0}
              className="col-span-3 text-right cursor-pointer hover:text-foreground"
              onClick={() => setSortBy('change')}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSortBy('change'); } }}
              aria-label="Sorter på 24t endring"
            >
              24t {sortBy === 'change' && '•'}
            </div>
            <div
              role="button"
              tabIndex={0}
              className="col-span-2 text-right cursor-pointer hover:text-foreground"
              onClick={() => setSortBy('volume')}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSortBy('volume'); } }}
              aria-label="Sorter på volum"
            >
              Vol {sortBy === 'volume' && '•'}
            </div>
          </div>
        </div>

        <div className="max-h-[400px] overflow-y-auto">
          {coinList.map((coin) => (
            <div
              key={coin.symbol}
              role="button"
              tabIndex={0}
              onClick={() => onSelectSymbol(coin.symbol)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelectSymbol(coin.symbol); } }}
              className={cn(
                "grid grid-cols-12 gap-2 px-4 py-3 cursor-pointer transition-colors hover:bg-white/5 border-b border-white/5",
                selectedSymbol === coin.symbol && "bg-primary/10 hover:bg-primary/10"
              )}
            >
              <div className="col-span-4 flex items-center gap-2">
                {onToggleFavorite && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(coin.symbol);
                    }}
                    className="text-muted-foreground hover:text-yellow-400 transition-colors"
                  >
                    <Star
                      className={cn(
                        "h-4 w-4",
                        coin.isFavorite && "fill-yellow-400 text-yellow-400"
                      )}
                    />
                  </button>
                )}
                <div>
                  <div className="font-medium text-sm">{coin.baseAsset}</div>
                  <div className="text-xs text-muted-foreground">{coin.name}</div>
                </div>
              </div>

              <div className="col-span-3 text-right">
                <div className="font-mono text-sm">
                  {coin.price > 0 ? formatPrice(coin.price) : '-'}
                </div>
              </div>

              <div className="col-span-3 text-right">
                <Badge
                  variant={coin.priceChange24h >= 0 ? 'default' : 'destructive'}
                  className={cn(
                    "text-xs",
                    coin.priceChange24h >= 0 
                      ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30" 
                      : "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                  )}
                >
                  {(coin.priceChange24h ?? 0) >= 0 ? '+' : ''}
                  {(coin.priceChange24h ?? 0).toFixed(2)}%
                </Badge>
              </div>

              <div className="col-span-2 text-right">
                <div className="text-xs text-muted-foreground font-mono">
                  {formatLargeNumber(coin.volume24h)}
                </div>
              </div>
            </div>
          ))}

          {coinList.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Ingen valutaer funnet
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
