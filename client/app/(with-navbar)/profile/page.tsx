"use client";

import { useEffect, useState } from "react";
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
  Lightbulb,
  Sparkles,
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
import { useAuth, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { apiUrl } from "@/lib/api";

// Types
type Stats = {
  xp: string;
  level: number;
  streak: string;
  videos: number;
  quizzes: number;
  avgScore: string;
};

type SurveyData = {
  leftScore: number;
  rightScore: number;
  dominantQuadrant: 'left' | 'right' | 'balanced';
};

const quadrantInfo = {
  left: {
    icon: Brain,
    color: '#3B82F6',
    title: 'Left-Brain Thinker',
    description: 'You excel at logical reasoning, data analysis, and structured planning.',
    traits: ['Logical', 'Organized', 'Analytical', 'Practical'],
    learningStyle: 'Charts, sequential steps, and practical examples work best for you.',
  },
  right: {
    icon: Lightbulb,
    color: '#8B5CF6',
    title: 'Right-Brain Thinker',
    description: 'You thrive with creative exploration and emotional connections.',
    traits: ['Creative', 'Intuitive', 'Empathetic', 'Innovative'],
    learningStyle: 'Visuals, narratives, and exploratory content fuel your learning.',
  },
  balanced: {
    icon: Sparkles,
    color: '#EC4899',
    title: 'Balanced Thinker',
    description: 'You adapt seamlessly between logic and creativity.',
    traits: ['Adaptable', 'Versatile', 'Flexible', 'Balanced'],
    learningStyle: 'You benefit from a blend of structured and creative content.',
  },
};

export default function ProfileUI() {
  const { user, isLoaded: isUserLoaded } = useUser();
  const { getToken } = useAuth();
  
  const [stats, setStats] = useState<Stats | null>(null);
  const [surveyData, setSurveyData] = useState<SurveyData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = await getToken();
        // Allow unauthenticated for now if testing, but ideally we need token
        
        const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

        // Fetch Stats
        const statsRes = await fetch(apiUrl("/api/users/stats"), { headers });
        if (statsRes.ok) {
            const data = await statsRes.json();
            setStats(data);
        }

        // Fetch Survey
        const surveyRes = await fetch(apiUrl("/api/survey/surveyData"), { headers });
        if (surveyRes.ok) {
            const data = await surveyRes.json();
            setSurveyData(data);
        }

      } catch (error) {
        console.error("Error fetching profile data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (isUserLoaded) {
        fetchData();
    }
  }, [getToken, isUserLoaded]);

  // Default / Loading State
  if (!isUserLoaded) {
      return <div className="min-h-screen pt-24 px-6 bg-[#0B0B1A] text-white flex items-center justify-center">Loading...</div>;
  }

  const dominant = surveyData ? quadrantInfo[surveyData.dominantQuadrant] : null;
  const chartData = surveyData ? [
    { name: "Left-Brain", value: surveyData.leftScore, color: "#3B82F6" },
    { name: "Right-Brain", value: surveyData.rightScore, color: "#8B5CF6" },
  ] : [];

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
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-4xl font-bold overflow-hidden">
               {user?.imageUrl ? (
                 <img src={user.imageUrl} alt={user.fullName || "User"} className="w-full h-full object-cover" />
               ) : (
                 user?.firstName?.[0] || "U"
               )}
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold">{user?.fullName || "User"}</h1>
                {/* <button className="p-2 rounded-lg hover:bg-white/5 transition">
                  <Edit2 className="w-4 h-4 text-slate-400" />
                </button> */}
              </div>
              <p className="text-slate-400 mb-3">{user?.primaryEmailAddress?.emailAddress || "No email"}</p>

              {dominant && (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full" style={{ backgroundColor: `${dominant.color}20` }}>
                  <dominant.icon className="w-4 h-4" style={{ color: dominant.color }} />
                  <span className="font-medium" style={{ color: dominant.color }}>
                    {dominant.title}
                  </span>
                </div>
              )}
            </div>

            <Link href="/survey">
                <Button variant="outline" className="border-white/10 text-white hover:bg-white/10">
                {surveyData ? "Retake Survey" : "Take Survey"}
                </Button>
            </Link>
          </div>
        </motion.div>

        {/* ================= STATS GRID ================= */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: "Total XP", value: stats?.xp || "0", icon: Trophy, color: "yellow" },
            { label: "Level", value: stats?.level || "1", icon: TrendingUp, color: "green" },
            { label: "Streak", value: stats?.streak || "0", icon: Flame, color: "orange" },
            { label: "Videos", value: stats?.videos || "0", icon: Video, color: "violet" },
            { label: "Quizzes", value: stats?.quizzes || "0", icon: Target, color: "blue" },
            { label: "Avg Score", value: stats?.avgScore || "0%", icon: Award, color: "emerald" },
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
        {surveyData && dominant ? (
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
                        data={chartData}
                        dataKey="value"
                        innerRadius={55}
                        outerRadius={80}
                    >
                        {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                    </Pie>
                    <Tooltip 
                        contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                    />
                    </PieChart>
                </ResponsiveContainer>
                </div>
                
                <div className="mt-4 space-y-2">
                    <div className="flex justify-between items-center text-sm">
                        <span className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-[#3B82F6]"></span>
                            Left Brain
                        </span>
                        <span className="font-bold">{surveyData.leftScore}%</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-[#8B5CF6]"></span>
                            Right Brain
                        </span>
                        <span className="font-bold">{surveyData.rightScore}%</span>
                    </div>
                </div>
            </motion.div>

             <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="glass-card rounded-2xl p-6 lg:col-span-2"
            >
                <h3 className="text-lg font-semibold mb-4">Detailed Insights</h3>
                <div className="space-y-6">
                    <div>
                        <h4 className="text-sm text-slate-400 mb-2">Key Traits</h4>
                        <div className="flex flex-wrap gap-2">
                        {dominant.traits.map((trait) => (
                            <span
                            key={trait}
                            className="px-4 py-2 rounded-full text-sm font-medium"
                            style={{
                                background: `${dominant.color}20`,
                                color: dominant.color,
                            }}
                            >
                            {trait}
                            </span>
                        ))}
                        </div>
                    </div>
                    
                    <div>
                        <h4 className="text-sm text-slate-400 mb-2">Learning Style</h4>
                         <p className="text-slate-200">{dominant.learningStyle}</p>
                    </div>

                    <div>
                         <h4 className="text-sm text-slate-400 mb-2">Dominant Quadrant Description</h4>
                         <p className="text-slate-200">{dominant.description}</p>
                    </div>
                </div>
            </motion.div>
            </div>
        ) : (
             <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card rounded-2xl p-8 text-center"
            >
                <h3 className="text-xl font-bold mb-2">No Brain Profile Found</h3>
                <p className="text-slate-400 mb-6">Take the survey to discover your learning style.</p>
                <Link href="/survey">
                    <Button className="bg-violet-600 hover:bg-violet-700">Take Survey Now</Button>
                </Link>
            </motion.div>
        )}
      </div>
    </div>
  );
}
