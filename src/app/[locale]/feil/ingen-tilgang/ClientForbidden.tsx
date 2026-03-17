"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { SURFACE, BRAND } from "@/lib/design/tokens";

export default function ClientForbidden() {
  return (
    <div className={`min-h-screen ${SURFACE.BG_LIGHT} flex items-center justify-center px-4`}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full text-center"
      >
        <div className="text-9xl font-bold text-red-500 mb-4 tabular-nums">403</div>
        <h1 className="text-3xl font-bold text-[#0A0B0D] mb-4">
          Ingen tilgang
        </h1>
        <p className="text-gray-600 mb-8">
          Du har ikke tillatelse til å se denne siden.
        </p>
        <Link
          href="/"
          className={`inline-block px-8 py-3 ${BRAND.primary} rounded-full font-semibold transition-colors`}
        >
          Tilbake til forsiden
        </Link>
      </motion.div>
    </div>
  );
}
