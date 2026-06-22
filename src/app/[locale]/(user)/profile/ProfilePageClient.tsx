"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { ProfileTab } from "@/features/account/profile/ProfileTab";
import { WalletTab } from "@/features/account/profile/WalletTab";
import { SettingsTab } from "@/features/account/profile/SettingsTab";
import { NotificationsTab } from "@/features/account/profile/NotificationsTab";
import { User, Wallet, Settings, Bell } from "lucide-react";

type TabValue = "profile" | "wallet" | "settings" | "notifications";

interface ProfilePageClientProps {
  initialTab?: string;
}


export function ProfilePageClient({ initialTab }: ProfilePageClientProps) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("profile");
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabValue>(
    (initialTab as TabValue) || "profile"
  );

  const TAB_CONFIG: { value: TabValue; label: string; icon: React.ReactNode }[] = [
    { value: "profile", label: t("tabs.profile"), icon: <User className="w-4 h-4" /> },
    { value: "wallet", label: t("tabs.wallet"), icon: <Wallet className="w-4 h-4" /> },
    { value: "settings", label: t("tabs.settings"), icon: <Settings className="w-4 h-4" /> },
    { value: "notifications", label: t("tabs.notifications"), icon: <Bell className="w-4 h-4" /> },
  ];

  const handleTabChange = (value: string) => {
    const tab = value as TabValue;
    setActiveTab(tab);
    
    // Update URL with tab parameter without reloading
    const params = new URLSearchParams(searchParams?.toString() || "");
    params.set("tab", tab);
    router.replace(`/${locale}/profile?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="min-h-screen bg-kp-bg-primary py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-kp-text-primary">{t("title")}</h1>
          <p className="text-kp-text-muted text-sm mt-1">
            {t("subtitle")}
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-kp-bg-secondary mb-6">
            {TAB_CONFIG.map(({ value, label, icon }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="flex items-center gap-2 data-[state=active]:bg-kp-bg-tertiary data-[state=active]:text-kp-text-primary"
              >
                {icon}
                <span className="hidden sm:inline">{label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="profile" className="mt-0">
            <div className="bg-kp-bg-secondary border border-kp-border rounded-2xl p-6">
              <ProfileTab />
            </div>
          </TabsContent>

          <TabsContent value="wallet" className="mt-0">
            <div className="bg-kp-bg-secondary border border-kp-border rounded-2xl p-6">
              <WalletTab />
            </div>
          </TabsContent>

          <TabsContent value="settings" className="mt-0">
            <div className="bg-kp-bg-secondary border border-kp-border rounded-2xl p-6">
              <SettingsTab />
            </div>
          </TabsContent>

          <TabsContent value="notifications" className="mt-0">
            <div className="bg-kp-bg-secondary border border-kp-border rounded-2xl p-6">
              <NotificationsTab />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
