"use client";

import { Button } from "@/shared/ui/button";
import { ArrowRight, CheckCircle, Mail, MapPin, MessageSquare, Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

export default function ClientKontakt() {
  const t = useTranslations("contact");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    
    if (!formData.name.trim()) {
      newErrors.name = t("form.nameRequired");
    }
    
    if (!formData.email.trim()) {
      newErrors.email = t("form.emailRequired");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t("form.emailInvalid");
    }
    
    if (!formData.message.trim()) {
      newErrors.message = t("form.messageRequired");
    } else if (formData.message.length < 10) {
      newErrors.message = t("form.messageMinLength");
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setIsSubmitting(false);
    setIsSubmitted(true);
    setFormData({ name: "", email: "", message: "" });
  };

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
            {isSubmitted ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">
                  {t("form.successTitle")}
                </h3>
                <p className="text-slate-600 mb-6">
                  {t("form.successDesc")}
                </p>
                <Button
                  onClick={() => setIsSubmitted(false)}
                  variant="outline"
                  className="rounded-full"
                >
                  {t("form.sendNew")}
                </Button>
              </div>
            ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-semibold text-slate-700 mb-2">
                  {t("form.name")}
                </label>
                <input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className={`w-full px-4 py-3 bg-slate-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all font-medium ${
                    errors.name ? 'border-red-500' : 'border-slate-200'
                  }`}
                  placeholder={t("form.namePlaceholder")}
                  aria-invalid={!!errors.name}
                />
                {errors.name && (
                  <p className="text-red-500 text-sm mt-1">{errors.name}</p>
                )}
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-2">
                  {t("form.email")}
                </label>
                <input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className={`w-full px-4 py-3 bg-slate-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all font-medium ${
                    errors.email ? 'border-red-500' : 'border-slate-200'
                  }`}
                  placeholder={t("form.emailPlaceholder")}
                  aria-invalid={!!errors.email}
                />
                {errors.email && (
                  <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                )}
              </div>
              <div>
                <label htmlFor="message" className="block text-sm font-semibold text-slate-700 mb-2">
                  {t("form.message")}
                </label>
                <textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) =>
                    setFormData({ ...formData, message: e.target.value })
                  }
                  rows={5}
                  className={`w-full px-4 py-3 bg-slate-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all font-medium resize-none ${
                    errors.message ? 'border-red-500' : 'border-slate-200'
                  }`}
                  placeholder={t("form.messagePlaceholder")}
                  aria-invalid={!!errors.message}
                />
                {errors.message && (
                  <p className="text-red-500 text-sm mt-1">{errors.message}</p>
                )}
              </div>
              <Button
                type="submit"
                size="lg"
                disabled={isSubmitting}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 rounded-xl shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? t("form.sending") : t("form.submit")}
              </Button>
            </form>
            )}
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
                  <Button 
                    variant="outline" 
                    className="rounded-full"
                    onClick={() => window.open('mailto:support@klarpakke.no', '_blank')}
                  >
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
                <h3 className="font-bold text-slate-900">{t("info.location")}</h3>
                <p className="text-slate-500 text-sm">{t("info.headquarters")}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
