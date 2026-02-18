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

        {/* ================= SNAPSHOT ================= */}
        {loading ? (
          <div className="grid lg:grid-cols-3 gap-4 mb-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass-card rounded-2xl p-6 animate-pulse">
                <div className="h-5 w-32 bg-slate-700 rounded mb-4" />
                <div className="h-10 w-24 bg-slate-700 rounded mb-4" />
                <div className="h-3 w-full bg-slate-700 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-4 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card rounded-2xl p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-slate-400">Learning Momentum</p>
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <Brain className="w-5 h-5 text-blue-300" />
                </div>
              </div>
              <p className="text-3xl font-semibold text-white mb-2">
                Level {stats?.level || 1}
              </p>
              <p className="text-sm text-slate-400 mb-4">
                {stats?.xp || "0"} total XP earned
              </p>
              <div className="h-2 w-full rounded-full bg-slate-800">
                <div className="h-2 rounded-full bg-blue-500/70 w-2/3" />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="glass-card rounded-2xl p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-slate-400">Activity Streak</p>
                <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
                  <Flame className="w-5 h-5 text-orange-300" />
                </div>
              </div>
              <p className="text-3xl font-semibold text-white mb-2">
                {stats?.streak || "0 days"}
              </p>
              <p className="text-sm text-slate-400 mb-4">
                Keep a daily rhythm to boost recall
              </p>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="w-2 h-2 rounded-full bg-orange-400" />
                Next milestone at 7 days
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass-card rounded-2xl p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-slate-400">Learning Snapshot</p>
                <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
                  <Award className="w-5 h-5 text-violet-300" />
                </div>
              </div>
              <div className="space-y-3 text-sm text-slate-300">
                <div className="flex items-center justify-between">
                  <span>Videos created</span>
                  <span className="text-white font-semibold">{stats?.videos || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Quizzes taken</span>
                  <span className="text-white font-semibold">{stats?.quizzes || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Avg score</span>
                  <span className="text-white font-semibold">{stats?.avgScore || "0%"}</span>
                </div>
              </div>
            </motion.div>
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
