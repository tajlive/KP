"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export default function ClientNotFound() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full text-center"
      >
        <div className="text-9xl font-bold text-[#0052FF] mb-4">404</div>
        <h1 className="text-3xl font-bold text-[#0A0B0D] mb-4">
          Siden ble ikke funnet
        </h1>
        <p className="text-gray-600 mb-8">
          Beklager, vi kunne ikke finne siden du leter etter.
        </p>
        <Link
          href="/"
          className="inline-block px-8 py-3 bg-[#0052FF] text-white rounded-full font-semibold hover:bg-[#0047E0] transition-colors"
        >
          Tilbake til forsiden
        </Link>
      </motion.div>
    </div>
  );
}
