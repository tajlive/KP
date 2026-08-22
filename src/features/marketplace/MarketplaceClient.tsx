"use client";

import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Skeleton } from "@/shared/ui/skeleton";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Crown,
  Filter,
  Shield,
  ShoppingCart,
  Star,
  TrendingUp,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface MarketplaceListing {
  id: string;
  sellerId: string;
  strategyId: string | null;
  title: string;
  description: string | null;
  priceModel: "free" | "subscription" | "one_time";
  priceNok: number;
  backtestSummary: Record<string, unknown>;
  category: string | null;
  status: "draft" | "published" | "archived";
  subscriberCount: number;
  rating: number;
  reviewCount: number;
  createdAt: string;
  updatedAt: string;
  sellerName?: string;
  sellerAvatar?: string | null;
  riskLevel?: "low" | "medium" | "high";
  winRate?: number;
  pnl30d?: number;
}

type SortBy = "performance" | "newest" | "rating" | "price";
type RiskLevel = "all" | "low" | "medium" | "high";

export default function MarketplaceClient() {
  const t = useTranslations("marketplace");
  const { locale } = useParams();
  const router = useRouter();
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortBy>("performance");
  const [riskFilter, setRiskFilter] = useState<RiskLevel>("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [subscribingId, setSubscribingId] = useState<string | null>(null);
  const limit = 20;

  useEffect(() => {
    fetchListings();
  }, [sortBy, riskFilter, page]);

  const fetchListings = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sort: sortBy,
      });

      if (riskFilter !== "all") {
        params.set("risk", riskFilter);
      }

      const response = await fetch(`/api/marketplace/listings?${params}`);
      if (!response.ok) {
        throw new Error("Failed to fetch listings");
      }
      const data = await response.json();
      setListings(data.listings || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error("Error fetching listings:", error);
      toast.error(t("loadError"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubscribe = async (listingId: string) => {
    setSubscribingId(listingId);
    try {
      const response = await fetch("/api/marketplace/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId,
          mode: "paper",
          initialCapital: 100000,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to subscribe");
      }

      const data = await response.json();
      toast.success(t("subscribeSuccess"));

      // Redirect to dashboard after short delay
      setTimeout(() => {
        router.push(`/${locale}/dashboard`);
      }, 1500);
    } catch (error) {
      console.error("Error subscribing:", error);
      toast.error(t("subscribeError"));
    } finally {
      setSubscribingId(null);
    }
  };

  const formatNOK = (value: number) => {
    return new Intl.NumberFormat("no-NO", {
      style: "currency",
      currency: "NOK",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getRiskBadgeColor = (risk?: "low" | "medium" | "high") => {
    switch (risk) {
      case "low":
        return "bg-green-500/10 text-green-400 border-green-500/30";
      case "medium":
        return "bg-yellow-500/10 text-yellow-400 border-yellow-500/30";
      case "high":
        return "bg-red-500/10 text-red-400 border-red-500/30";
      default:
        return "bg-slate-500/10 text-slate-400 border-slate-500/30";
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link href={`/${locale}/dashboard`}>
              <Button variant="ghost" size="icon" className="text-slate-400">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="text-3xl font-black text-white">Strategi Marked</h1>
          </div>
          <p className="text-slate-400">
            Kjøp og selg verifiserte tradingstrategier fra fellesskapet
          </p>
        </div>
        <Link href={`/${locale}/copy-trading/traders/me`}>
          <Button className="bg-purple-600 hover:bg-purple-700">
            <Crown className="w-4 h-4 mr-2" />
            Bli en Creator
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg p-2">
          <Filter className="w-4 h-4 text-slate-400 ml-2" />
          <Select
            value={riskFilter}
            onValueChange={(v) => setRiskFilter(v as RiskLevel)}
          >
            <SelectTrigger className="w-[140px] border-0 bg-transparent text-slate-300 focus:ring-0">
              <SelectValue placeholder={t("riskLevelPlaceholder")} />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800">
              <SelectItem value="all">Alle risikonivåer</SelectItem>
              <SelectItem value="low">Lav risiko</SelectItem>
              <SelectItem value="medium">Middels risiko</SelectItem>
              <SelectItem value="high">Høy risiko</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg p-2">
          <BarChart3 className="w-4 h-4 text-slate-400 ml-2" />
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
            <SelectTrigger className="w-[180px] border-0 bg-transparent text-slate-300 focus:ring-0">
              <SelectValue placeholder={t("sortByPlaceholder")} />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800">
              <SelectItem value="performance">Beste ytelse</SelectItem>
              <SelectItem value="newest">Nyeste først</SelectItem>
              <SelectItem value="rating">Høyest rangert</SelectItem>
              <SelectItem value="price">Laveste pris</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Listings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          // Loading skeletons
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="bg-slate-900 border-slate-800">
              <CardHeader>
                <Skeleton className="h-6 w-3/4 bg-slate-800" />
                <Skeleton className="h-4 w-1/2 bg-slate-800 mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-24 w-full bg-slate-800" />
              </CardContent>
            </Card>
          ))
        ) : listings.length === 0 ? (
          <div className="col-span-full">
            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="p-12 text-center">
                <ShoppingCart className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">Ingen strategier funnet</p>
                <p className="text-slate-500 text-sm mt-1">
                  Prøv å endre filtrene eller kom tilbake senere
                </p>
              </CardContent>
            </Card>
          </div>
        ) : (
          listings.map((listing, index) => (
            <motion.div
              key={listing.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="bg-slate-900 border-slate-800 hover:border-slate-700 transition-all h-full flex flex-col">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                        {listing.sellerAvatar ? (
                          <Image
                            src={listing.sellerAvatar}
                            alt={listing.sellerName || "Seller"}
                            width={40}
                            height={40}
                            className="rounded-full object-cover"
                            unoptimized
                          />
                        ) : (
                          listing.sellerName?.charAt(0).toUpperCase() || "S"
                        )}
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">
                          {listing.sellerName || "Anonym Creator"}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={getRiskBadgeColor(listing.riskLevel)}
                    >
                      {listing.riskLevel === "low"
                        ? "Lav"
                        : listing.riskLevel === "high"
                          ? "Høy"
                          : "Medium"}{" "}
                      risiko
                    </Badge>
                  </div>
                  <CardTitle className="text-white text-lg mt-3">
                    {listing.title}
                  </CardTitle>
                  {listing.description && (
                    <p className="text-slate-400 text-sm line-clamp-2">
                      {listing.description}
                    </p>
                  )}
                </CardHeader>

                <CardContent className="flex-1 flex flex-col">
                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-slate-950/50 rounded-lg p-3">
                      <div className="flex items-center gap-1 text-slate-500 text-xs mb-1">
                        <TrendingUp className="w-3 h-3" />
                        Win Rate
                      </div>
                      <div className="text-white font-bold">
                        {listing.winRate?.toFixed(1) || "--"}%
                      </div>
                    </div>
                    <div className="bg-slate-950/50 rounded-lg p-3">
                      <div className="flex items-center gap-1 text-slate-500 text-xs mb-1">
                        <BarChart3 className="w-3 h-3" />
                        P&L 30d
                      </div>
                      <div
                        className={cn(
                          "font-bold",
                          (listing.pnl30d || 0) >= 0
                            ? "text-green-400"
                            : "text-red-400",
                        )}
                      >
                        {listing.pnl30d
                          ? `${listing.pnl30d >= 0 ? "+" : ""}${formatNOK(listing.pnl30d)}`
                          : "--"}
                      </div>
                    </div>
                  </div>

                  {/* Rating */}
                  {listing.reviewCount > 0 && (
                    <div className="flex items-center gap-2 mb-4">
                      <div className="flex items-center">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={cn(
                              "w-4 h-4",
                              i < Math.floor(listing.rating)
                                ? "text-yellow-400 fill-yellow-400"
                                : "text-slate-600",
                            )}
                          />
                        ))}
                      </div>
                      <span className="text-sm text-slate-400">
                        ({listing.reviewCount} anmeldelser)
                      </span>
                    </div>
                  )}

                  {/* Subscribers */}
                  {listing.subscriberCount > 0 && (
                    <div className="flex items-center gap-2 mb-4 text-sm text-slate-400">
                      <Users className="w-4 h-4" />
                      {listing.subscriberCount} abonnenter
                    </div>
                  )}

                  {/* Spacer */}
                  <div className="flex-1" />

                  {/* Price and Action */}
                  <div className="flex items-center justify-between pt-4 border-t border-slate-800 mt-4">
                    <div>
                      {listing.priceModel === "free" ||
                      listing.priceNok === 0 ? (
                        <span className="text-green-400 font-bold">Gratis</span>
                      ) : (
                        <div>
                          <span className="text-white font-bold text-lg">
                            {formatNOK(listing.priceNok)}
                          </span>
                          <span className="text-slate-500 text-sm">
                            {listing.priceModel === "subscription"
                              ? "/mnd"
                              : " én gang"}
                          </span>
                        </div>
                      )}
                    </div>
                    <Button
                      onClick={() => handleSubscribe(listing.id)}
                      disabled={subscribingId === listing.id}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {subscribingId === listing.id ? (
                        <>
                          <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Laster...
                        </>
                      ) : (
                        <>
                          <Shield className="w-4 h-4 mr-2" />
                          Bruk strategi
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-4">
          <Button
            variant="outline"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || isLoading}
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Forrige
          </Button>
          <span className="text-slate-400">
            Side {page} av {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages || isLoading}
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            Neste
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )}
    </div>
  );
}
