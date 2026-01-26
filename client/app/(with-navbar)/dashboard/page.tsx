"use client";

import { motion } from "framer-motion";
import {
  Brain,
  Video,
  Trophy,
  Flame,
  Target,
  ChevronRight,
  Play,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";


export default function Dashboard() {
  return (
    <div className="min-h-screen p-6 pt-24 ">
      <div className="max-w-7xl mx-auto">
        {/* ================= HEADER ================= */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Welcome back, Learner!
            </h1>
            <p className="text-slate-400">
              Your personalized learning dashboard
            </p>
          </div>

          <div className="flex gap-3">
            <Link href="/survey">
            <Button className="bg-gradient-to-r from-violet-600 to-blue-600">
              <Plus className="w-4 h-4 mr-2" />
              Take Survey
            </Button>
            </Link>
          </div>
          <div className="flex gap-3">
            <Link href="/generate">
            <Button className="bg-gradient-to-r from-violet-600 to-blue-600">
              <Plus className="w-4 h-4 mr-2" />
              New Video
            </Button>
            </Link>
          </div>
        </div>

        {/* ================= STATS GRID ================= */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Brain Profile", icon: Brain, bg: "bg-blue-500/20", color: "text-blue-400" },
            { label: "Current Streak", icon: Flame, bg: "bg-orange-500/20", color: "text-orange-400" },
            { label: "Videos Completed", icon: Video, bg: "bg-cyan-500/20", color: "text-cyan-400" },
            { label: "Total XP", icon: Trophy, bg: "bg-yellow-500/20", color: "text-yellow-400" },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass-card rounded-2xl p-6"
            >
              <div
                className={`w-12 h-12 rounded-xl ${item.bg} flex items-center justify-center mb-4`}
              >
                <item.icon className={`w-6 h-6 ${item.color}`} />
              </div>
              <p className="text-sm text-slate-400 mb-1">{item.label}</p>
              <p className="text-xl font-bold text-white"></p>
            </motion.div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* ================= MAIN ================= */}
          <div className="lg:col-span-2 space-y-6">

            {/* Recent Videos */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card rounded-2xl p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white">
                  Recent Videos
                </h3>
                <Button variant="ghost" size="sm">
                  View All
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>

              <div className="space-y-3">
                {[1, 2, 3].map((i) => (

                  <div
                    key={i}
                    className="flex items-center gap-4 p-4 rounded-xl bg-slate-800/50 hover:bg-slate-800 transition"
                  >
                    <div className="w-16 h-12 rounded-lg bg-violet-500/20 flex items-center justify-center">
                      <Play className="w-5 h-5 text-violet-400" />
                    </div>
                    <div className="flex-1">
                      <div className="h-4 w-2/3 bg-slate-700 rounded mb-2" />
                      <div className="flex gap-3">
                        <div className="h-3 w-16 bg-slate-700 rounded" />
                        <div className="h-3 w-12 bg-slate-700 rounded" />
                      </div>
                    </div>
                    <ChevronRight className="text-slate-600" />
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
