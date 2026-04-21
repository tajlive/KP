"use client";

import { motion } from "framer-motion";
import { Send, Star } from "lucide-react";
import { useState } from "react";
import { useTranslations } from "next-intl";

interface ReviewFormProps {
  listingId: string;
  onSubmit: (rating: number, text: string) => Promise<void>;
  onClose: () => void;
}

export default function ReviewForm({
  listingId: _listingId,
  onSubmit,
  onClose: _onClose,
}: ReviewFormProps) {
  const t = useTranslations("marketplace");
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) return;
    setIsSubmitting(true);
    try {
      await onSubmit(rating, reviewText);
      setSubmitted(true);
    } catch {
      // Error handling
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-8"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300, delay: 0.1 }}
          className="text-5xl mb-4"
        >
          ⭐
        </motion.div>
        <h3 className="text-[20px] font-bold text-gray-900 dark:text-white mb-2">
          Takk for anmeldelsen!
        </h3>
        <p className="text-[15px] text-gray-500 dark:text-gray-400">
          Din tilbakemelding hjelper andre brukere
        </p>
      </motion.div>
    );
  }

  return (
    <div>
      {/* Handle */}
      <div className="flex justify-center pt-3 pb-2">
        <div className="w-10 h-1 bg-gray-300 dark:bg-gray-700 rounded-full" />
      </div>

      <div className="px-6 pb-6">
        <h3 className="text-[20px] font-bold text-gray-900 dark:text-white mb-1 text-center">
          Gi din vurdering
        </h3>
        <p className="text-[13px] text-gray-500 dark:text-gray-400 text-center mb-6">
          Del din erfaring med denne strategien
        </p>

        {/* Star rating */}
        <div
          className="flex justify-center gap-2 mb-6"
          role="radiogroup"
          aria-label="Vurdering"
        >
          {[1, 2, 3, 4, 5].map((value) => (
            <motion.button
              key={value}
              whileTap={{ scale: 1.2 }}
              onMouseEnter={() => setHoveredRating(value)}
              onMouseLeave={() => setHoveredRating(0)}
              onClick={() => setRating(value)}
              className="p-1"
              role="radio"
              aria-checked={value === rating}
              aria-label={`${value} stjerner`}
            >
              <Star
                className={`w-10 h-10 transition-colors duration-150 ${
                  value <= (hoveredRating || rating)
                    ? "text-amber-500 fill-amber-500 drop-shadow-[0_2px_4px_rgba(245,158,11,0.3)]"
                    : "text-gray-300 dark:text-gray-600"
                }`}
                aria-hidden="true"
              />
            </motion.button>
          ))}
        </div>

        {/* Rating label */}
        {rating > 0 && (
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center text-[15px] font-medium text-gray-600 dark:text-gray-400 mb-4"
          >
            {["", "Dårlig", "OK", "Bra", "Veldig bra", "Utmerket"][rating]}
          </motion.p>
        )}

        {/* Text input */}
        <label htmlFor="review-text" className="sr-only">
          {t("reviewLabel")}
        </label>
        <textarea
          id="review-text"
          value={reviewText}
          onChange={(e) => setReviewText(e.target.value)}
          placeholder={t("reviewPlaceholder")}
          rows={3}
          className="w-full px-4 py-3 text-[15px]
                     bg-gray-50 dark:bg-gray-900
                     border-2 border-gray-200 dark:border-gray-800
                     rounded-2xl
                     text-gray-900 dark:text-white
                     placeholder:text-gray-400 dark:placeholder:text-gray-500
                     focus:border-blue-500 dark:focus:border-blue-500
                     focus:outline-none
                     resize-none transition-colors"
        />

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={rating === 0 || isSubmitting}
          className="w-full mt-4 min-h-[52px] flex items-center justify-center gap-2
                     bg-linear-to-r from-cyan-500 via-blue-500 to-indigo-500
                     text-white font-semibold text-[17px]
                     rounded-2xl
                     shadow-[0_4px_16px_rgba(59,130,246,0.3)]
                     active:scale-[0.97]
                     transition-all duration-200
                     disabled:opacity-40 disabled:active:scale-100"
        >
          {isSubmitting ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
            />
          ) : (
            <>
              <Send className="w-4 h-4" />
              Send anmeldelse
            </>
          )}
        </button>
      </div>
    </div>
  );
}
