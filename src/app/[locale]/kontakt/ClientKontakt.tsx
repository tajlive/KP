"use client";

import { Button } from "@/components/ui/button";
import { ArrowRight, Mail, MapPin, MessageSquare, Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

export default function ClientKontakt() {
  const t = useTranslations("contact");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 pt-24 pb-16 text-center px-4">
        <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
          {t("title")}
        </h1>
        <p className="text-xl text-slate-600 max-w-2xl mx-auto">
          {t("subtitle")}
        </p>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 gap-12 items-start">
          {/* Contact Form */}
          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
              <Send className="text-blue-600 h-6 w-6" />
              {t("form.title")}
            </h2>
            <form className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  {t("form.name")}
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all font-medium"
                  placeholder={t("form.namePlaceholder")}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  {t("form.email")}
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all font-medium"
                  placeholder={t("form.emailPlaceholder")}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  {t("form.message")}
                </label>
                <textarea
                  value={formData.message}
                  onChange={(e) =>
                    setFormData({ ...formData, message: e.target.value })
                  }
                  rows={5}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all font-medium resize-none"
                  placeholder={t("form.messagePlaceholder")}
                />
              </div>
              <Button
                size="lg"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 rounded-xl shadow-lg shadow-blue-600/20"
              >
                {t("form.submit")}
              </Button>
            </form>
          </div>

          {/* Contact Info Side */}
          <div className="space-y-6">
            {/* Direct Support */}
            <div className="bg-blue-600 p-8 rounded-3xl text-white shadow-xl shadow-blue-600/20 relative overflow-hidden">
              <div className="relative z-10">
                <Mail className="w-10 h-10 mb-6 text-blue-200" />
                <h3 className="text-2xl font-bold mb-2">
                  {t("info.emailTitle")}
                </h3>
                <p className="text-blue-100 mb-6">{t("info.emailResponse")}</p>
                <a
                  href="mailto:support@klarpakke.no"
                  className="inline-flex items-center gap-2 font-bold text-lg hover:underline"
                >
                  support@klarpakke.no <ArrowRight className="w-5 h-5" />
                </a>
              </div>
              {/* Decoration */}
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
            </div>

            {/* Chat Box */}
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-green-600 shrink-0">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-lg mb-1">
                    {t("info.chatTitle")}
                  </h3>
                  <p className="text-slate-600 mb-4">{t("info.chatHours")}</p>
                  <Button variant="outline" className="rounded-full">
                    {t("info.startChat")}
                  </Button>
                </div>
              </div>
            </div>

            {/* Location (Optional extra) */}
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-600 shrink-0">
                <MapPin className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Oslo, Norge</h3>
                <p className="text-slate-500 text-sm">Hovedkontor</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
