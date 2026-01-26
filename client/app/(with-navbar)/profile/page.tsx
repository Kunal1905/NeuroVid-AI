"use client";

import { motion } from "framer-motion";
import {
  Brain,
  Trophy,
  Flame,
  Video,
  Target,
  TrendingUp,
  Award,
  Edit2,
  ChevronRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

export default function ProfileUI() {
  return (
    <div className="min-h-screen pt-24 px-6 bg-gradient-to-br from-[#0B0B1A] via-[#0F1028] to-[#090915] text-white">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* ================= PROFILE HEADER ================= */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-3xl p-8"
        >
          <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
            {/* Avatar */}
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-4xl font-bold">
              K
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold">Kunal Suthar</h1>
                <button className="p-2 rounded-lg hover:bg-white/5 transition">
                  <Edit2 className="w-4 h-4 text-slate-400" />
                </button>
              </div>
              <p className="text-slate-400 mb-3">kunal@example.com</p>

              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/20">
                <Brain className="w-4 h-4 text-violet-400" />
                <span className="text-violet-300 font-medium">
                  Analytical Thinker
                </span>
              </div>
            </div>

            <Button variant="outline" className="border-white/10 text-white">
              Retake Survey
            </Button>
          </div>
        </motion.div>

        {/* ================= STATS GRID ================= */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: "Total XP", value: "4,320", icon: Trophy, color: "yellow" },
            { label: "Level", value: "12", icon: TrendingUp, color: "green" },
            { label: "Streak", value: "8 days", icon: Flame, color: "orange" },
            { label: "Videos", value: "26", icon: Video, color: "violet" },
            { label: "Quizzes", value: "14", icon: Target, color: "blue" },
            { label: "Avg Score", value: "82%", icon: Award, color: "emerald" },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass-card rounded-2xl p-5"
            >
              <div className={`w-10 h-10 rounded-xl bg-${stat.color}-500/20 flex items-center justify-center mb-3`}>
                <stat.icon className={`w-5 h-5 text-${stat.color}-400`} />
              </div>
              <p className="text-sm text-slate-400">{stat.label}</p>
              <p className="text-2xl font-bold">{stat.value}</p>
            </motion.div>
          ))}
        </div>

        {/* ================= BRAIN PROFILE ================= */}
        <div className="grid lg:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-2xl p-6 lg:col-span-1"
          >
            <h3 className="text-lg font-semibold mb-4">Brain Profile</h3>

            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: "Analytical", value: 35, color: "#3B82F6" },
                      { name: "Practical", value: 25, color: "#10B981" },
                      { name: "Relational", value: 20, color: "#F59E0B" },
                      { name: "Experimental", value: 20, color: "#8B5CF6" },
                    ]}
                    dataKey="value"
                    innerRadius={55}
                    outerRadius={80}
                  >
                    {[...Array(4)].map((_, i) => (
                      <Cell key={i} fill={["#3B82F6", "#10B981", "#F59E0B", "#8B5CF6"][i]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
