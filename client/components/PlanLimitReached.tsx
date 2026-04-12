"use client";

import { motion } from "framer-motion";
import { Lock, ArrowRight, LayoutDashboard } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface PlanLimitReachedProps {
  onReset: () => void;
}

export default function PlanLimitReached({ onReset }: PlanLimitReachedProps) {
  const router = useRouter();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-8 max-w-md w-full border border-gray-700 shadow-2xl"
      >
        <div className="text-center">
          {/* Lock Icon */}
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-red-500/20 to-orange-500/20 flex items-center justify-center border border-red-500/30">
            <Lock className="w-10 h-10 text-red-400" />
          </div>

          {/* Heading */}
          <h3 className="text-2xl font-bold text-white mb-3">
            You've Reached Your Free Limit
          </h3>

          {/* Subtext */}
          <p className="text-gray-400 mb-8 leading-relaxed">
            You've used all 3 of your free video generations. Upgrade your plan
            to keep learning with unlimited videos.
          </p>

          {/* CTA Buttons */}
          <div className="space-y-3">
            <Button
              size="lg"
              onClick={() => router.push("/subscription")}
              className="w-full h-14 text-lg font-medium bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 shadow-[0_10px_40px_-10px_rgba(124,58,237,0.6)]"
            >
              Upgrade Plan
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>

            <Button
              variant="outline"
              size="lg"
              onClick={() => router.push("/dashboard")}
              className="w-full h-12 border-gray-700 text-white hover:bg-gray-800"
            >
              <LayoutDashboard className="w-4 h-4 mr-2" />
              Go to Dashboard
            </Button>
          </div>

          {/* Secondary Action */}
          <button
            onClick={onReset}
            className="mt-6 text-sm text-gray-500 hover:text-gray-400 transition-colors"
          >
            Back to generation form
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
