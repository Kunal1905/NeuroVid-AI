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
  Award,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useAuth, useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { apiUrl } from "@/lib/api";

// Define types for stats and videos 
interface UserStats {
  xp: string;
  level: number;
  streak: string;
  videos: number;
  quizzes: number;
  avgScore: string;
}

interface VideoItem {
  id: string;
  title: string;
  duration: number;
  createdAt: string;
  thumbnail?: string; // Optional URL
  status?: string;
}

export default function Dashboard() {
  const { user } = useUser();
  const { getToken } = useAuth();

  // State for stats and videos
  const [stats, setStats] = useState<UserStats | null>(null);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasTakenSurvey, setHasTakenSurvey] = useState(false);

  // Sync user to backend on mount if user exists
  useEffect(() => {
    if (user) {
      const syncUser = async () => {
        try {
          const token = await getToken();
          if (!token) {
            console.error("No authentication token available");
            return;
          }

          const res = await fetch(apiUrl("/api/users/create"), {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              email: user.primaryEmailAddress?.emailAddress,
            }),
          });


          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            console.error("Sync failed:", res.status, errorData);
            throw new Error(`Failed to sync user: ${res.statusText}`);
          }
        } catch (err) {
          console.error("Error syncing user:", err);
          // No UI feedback for error as per user request
        }
      };

      syncUser();
    }
  }, [user, getToken]); // Dependencies: Run when user or getToken changes

  // Fetch stats and recent videos after user is available
  useEffect(() => {
    if (user) {
      const fetchData = async () => {
        setLoading(true);
        try {
          const token = await getToken();
          if (!token) {
            console.error("No authentication token available");
            return;
          }

          // Fetch stats
          let currentStats: UserStats = {
            xp: "0",
            level: 1,
            streak: "0 days",
            videos: 0,
            quizzes: 0,
            avgScore: "0%",
          };

          try {
            const statsRes = await fetch(apiUrl("/api/users/stats"), {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            });
            if (statsRes.ok) {
              const statsData = await statsRes.json();
              currentStats = { ...currentStats, ...statsData };
            }
          } catch (e) {
            console.log("Stats endpoint not ready yet, using defaults");
          }

          // Fetch recent videos (assume endpoint returns last 3)
          try {
            const videosRes = await fetch(apiUrl("/api/generate/recent?limit=3"), {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            });
            if (videosRes.ok) {
              const videosData: VideoItem[] = await videosRes.json();
              setVideos(videosData);
            }
          } catch (e) {
            console.log("Videos endpoint not ready yet");
          }

          // Fetch Brain Dominance Data
          try {
            const brainRes = await fetch(apiUrl("/api/survey/surveyData"), {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            });
            if (brainRes.ok) {
              const brainData = await brainRes.json();
              if (brainData && brainData.dominantQuadrant) {
                setHasTakenSurvey(true);
              }
            }
          } catch (e) {
            console.error("Error fetching survey data:", e);
          }

          setStats(currentStats);
        } catch (err) {
          console.error("Error fetching data:", err);
        } finally {
          setLoading(false);
        }
      };

      fetchData();
    }
  }, [user, getToken]);

  return (
    <div className="min-h-screen p-6 pt-24">
      <div className="max-w-7xl mx-auto">
        {/* ================= HEADER ================= */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Welcome back, {user?.firstName || "Learner"}!
            </h1>
            <p className="text-slate-400">Your personalized learning dashboard</p>
          </div>

          {!hasTakenSurvey && (
            <div className="flex gap-3">
              <Link href="/survey">
                <Button className="bg-gradient-to-r from-violet-600 to-blue-600">
                  <Plus className="w-4 h-4 mr-2" />
                  Take Survey
                </Button>
              </Link>
            </div>
          )}
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
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="glass-card rounded-2xl p-6 animate-pulse">
                <div className="w-12 h-12 rounded-xl bg-slate-700 mb-4" />
                <div className="h-4 w-2/3 bg-slate-700 rounded mb-1" />
                <div className="h-6 w-1/2 bg-slate-700 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { label: "Total XP", icon: Trophy, bg: "bg-yellow-500/20", color: "text-yellow-400", value: stats?.xp || "0" },
              { label: "Level", icon: Brain, bg: "bg-blue-500/20", color: "text-blue-400", value: stats?.level || 1 },
              { label: "Streak", icon: Flame, bg: "bg-orange-500/20", color: "text-orange-400", value: stats?.streak || "0 days" },
              { label: "Videos", icon: Video, bg: "bg-cyan-500/20", color: "text-cyan-400", value: stats?.videos || 0 },
              { label: "Quizzes", icon: Target, bg: "bg-emerald-500/20", color: "text-emerald-400", value: stats?.quizzes || 0 },
              { label: "Avg Score", icon: Award, bg: "bg-violet-500/20", color: "text-violet-400", value: stats?.avgScore || "0%" },
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
                <p className="text-xl font-bold text-white">{item.value}</p>
              </motion.div>
            ))}
          </div>
        )}

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
                <h3 className="text-lg font-semibold text-white">Recent Videos</h3>
                <Button variant="ghost" size="sm">
                  View All
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>

              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-slate-800/50 animate-pulse">
                      <div className="w-16 h-12 rounded-lg bg-slate-700" />
                      <div className="flex-1">
                        <div className="h-4 w-2/3 bg-slate-700 rounded mb-2" />
                        <div className="flex gap-3">
                          <div className="h-3 w-16 bg-slate-700 rounded" />
                          <div className="h-3 w-12 bg-slate-700 rounded" />
                        </div>
                      </div>
                      <div className="w-4 h-4 bg-slate-700 rounded" />
                    </div>
                  ))}
                </div>
              ) : videos.length === 0 ? (
                <div className="text-slate-400 text-center py-4">No recent videos yet. Generate one!</div>
              ) : (
                <div className="space-y-3">
                  {videos.map((video) => (
                    <Link
                      key={video.id}
                      href={`/VideoResult?sessionId=${video.id}`}
                      className="flex items-center gap-4 p-4 rounded-xl bg-slate-800/50 hover:bg-slate-800 transition"
                    >
                      <div className="w-16 h-12 rounded-lg bg-violet-500/20 flex items-center justify-center overflow-hidden">
                        {video.thumbnail ? (
                          <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" />
                        ) : (
                          <Play className="w-5 h-5 text-violet-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-white mb-1">{video.title}</p>
                        <div className="flex gap-3 text-sm text-slate-400">
                          <span>{video.duration} min</span>
                          <span>{new Date(video.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <ChevronRight className="text-slate-600" />
                    </Link>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
