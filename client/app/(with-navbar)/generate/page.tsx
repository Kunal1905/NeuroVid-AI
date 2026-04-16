"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Video,
  Info,
  Globe,
  Zap,
  Clock,
  Brain,
  Play,
  CheckCircle,
  Loader2,
  LayoutDashboard,
} from "lucide-react";
import { useAuth, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { apiUrl } from "@/lib/api";
import PlanLimitReached from "@/components/PlanLimitReached";
import { AlertTriangle } from "lucide-react";

export default function Generate() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const router = useRouter();

  // Form inputs (unchanged)
  const [topic, setTopic] = useState("");
  const [details, setDetails] = useState("");
  const [category, setCategory] = useState("");
  const [language, setLanguage] = useState("");
  const [duration, setDuration] = useState([2]);

  // Video generation flow (only added what's needed)
  const [showModal, setShowModal] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<
    "idle" | "queued" | "processing" | "completed" | "error"
  >("idle");
  const [llmBusy, setLlmBusy] = useState(false);
  const [usage, setUsage] = useState({ used: 0, limit: 3 });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showPlanLimit, setShowPlanLimit] = useState(false);

  // Brain dominance (unchanged)
  const [brainDominance, setBrainDominance] = useState<string | null>(null);

  useEffect(() => {
    const fetchBrainDominance = async () => {
      try {
        const token = await getToken();
        if (!token) return;

        const res = await fetch(apiUrl("/api/survey/surveyData"), {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          if (data && data.dominantQuadrant) {
            setBrainDominance(data.dominantQuadrant);
          }
        }
      } catch (error) {
        console.error("Error fetching brain dominance:", error);
      }
    };

    fetchBrainDominance();
  }, [getToken]);

  useEffect(() => {
    const fetchUsage = async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const res = await fetch(apiUrl("/api/users/stats"), {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        const used = Number(data.videos || 0);
        setUsage({ used, limit: 3 });
      } catch (error) {
        console.error("Error fetching usage:", error);
      }
    };
    fetchUsage();
  }, [getToken]);

  // Real submit + polling (only changed part)
  const handleSubmit = async () => {
    if (!topic.trim()) return;

    const normalizedTopic = topic.trim();
    const normalizedDetails = details.trim() || `Explain ${topic.trim()} in a clear, beginner-friendly way.`;

    setShowModal(true);
    setIsGenerating(true);
    setStatus("queued");
    setProgress(10);
    setErrorMsg(null);
    try {
      const token = await getToken();
      console.log("[generate] submit payload", {
        topic: normalizedTopic,
        details: normalizedDetails,
        category,
        language,
        duration: duration[0],
      });

      const res = await fetch(apiUrl("/api/generate/submitGeneration"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          topic: normalizedTopic,
          details: normalizedDetails,
          category,
          language,
          duration: duration[0],
        }),
      });
      console.log("[generate] submit response status", res.status);

      if (res.status === 429) {
        const err = await res.json();
        console.log("[generate] submit 429 response", err);
        setShowPlanLimit(true);
        setIsGenerating(false);
        return;
      }

      if (res.status === 403) {
        const err = await res.json();
        console.log("[generate] submit 403 response", err);
        setStatus("error");
        setErrorMsg(
          err?.error === "Brain dominance survey not completed"
            ? "Please complete the brain dominance survey before generating videos."
            : err?.error || "Access denied. Please try again."
        );
        setIsGenerating(false);
        return;
      }

      if (res.status === 400) {
        const err = await res.json();
        console.log("[generate] submit 400 response", err);
        setStatus("error");
        setErrorMsg(err?.error || "Please fill in the required fields and try again.");
        setIsGenerating(false);
        return;
      }

      const data = await res.json();
      console.log("[generate] submit success response", data);

      if (data.sessionId) {
        setSessionId(data.sessionId);
        if (typeof data.used === "number") {
          setUsage({ used: data.used, limit: data.limit || 3 });
        }
        pollStatus(data.sessionId);
      } else {
        console.log("[generate] submit missing sessionId", data);
        setStatus("error");
        setErrorMsg(data?.error || "Failed to start generation. Please try again.");
      }
    } catch (error) {
      console.error("Error submitting generation:", error);
      setStatus("error");
      setErrorMsg("Could not submit generation request. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const pollStatus = async (sid: string) => {
    let pollCount = 0;
    const maxPolls = 120; // 5 minutes max (120 * 2.5s = 300s)
    let consecutiveFailures = 0;
    const maxConsecutiveFailures = 3;

    const interval = setInterval(async () => {
      pollCount++;

      // Timeout after 5 minutes
      if (pollCount > maxPolls) {
        clearInterval(interval);
        setStatus("error");
        setErrorMsg("Generation timed out after 5 minutes. Please try again.");
        return;
      }

      try {
        const token = await getToken();
        const res = await fetch(apiUrl(`/api/generate/status/${sid}`), {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          consecutiveFailures = 0; // Reset failure counter
          const data = await res.json();
          console.log("[generate] status response", data);
          const progressValue = Number(data.progress || 0);
          setProgress(progressValue);
          const updatedAtMs = data.updatedAt ? new Date(data.updatedAt).getTime() : Date.now();
          const now = Date.now();
          const staleSeconds = Math.max(0, Math.floor((now - updatedAtMs) / 1000));
          setLlmBusy(data.status === "GENERATING_SCRIPT" && staleSeconds >= 20);

          if (data.status === "COMPLETED") {
            setVideoUrl(data.videoUrl);
            setStatus("completed");
            setProgress(100);
            clearInterval(interval);
          } else if (data.status === "FAILED") {
            clearInterval(interval);
            setStatus("error");
            setErrorMsg("Video generation failed. Please try again.");
            setLlmBusy(false);
          } else if (data.status && data.status !== "COMPLETED") {
            setStatus("processing");
          }
        } else {
          consecutiveFailures++;
          console.log("[generate] status non-200", res.status);
          if (consecutiveFailures >= maxConsecutiveFailures) {
            clearInterval(interval);
            setStatus("error");
            setErrorMsg("Failed to check generation status. Please try again.");
            setLlmBusy(false);
          }
        }
      } catch (error) {
        console.error("Polling error:", error);
        consecutiveFailures++;
        if (consecutiveFailures >= maxConsecutiveFailures) {
          clearInterval(interval);
          setStatus("error");
          setErrorMsg("Network error. Please check your connection and try again.");
          setLlmBusy(false);
        }
      }
    }, 2500);
  };

  const handleViewVideo = async () => {
    if (!sessionId) {
      setStatus("error");
      return;
    }
    router.push(`/VideoResult?sessionId=${sessionId}`);
  };

  const closeModal = () => {
    setShowModal(false);
    setIsGenerating(false);
    setProgress(0);
    setVideoUrl(null);
    setStatus("idle");
    setErrorMsg(null);
    setLlmBusy(false);
  };

  return (
    <div className="min-h-screen px-6 pt-24 pb-16 bg-gradient-to-br from-[#0B0B1A] via-[#0F1028] to-[#090915]">
      <div className="max-w-6xl mx-auto">
        {/* HEADER */}

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-violet-500/20 to-blue-500/20 flex items-center justify-center">
            <Video className="w-8 h-8 text-violet-400" />
          </div>

          <h1 className="text-3xl font-bold text-foreground mb-2">
            Generate Learning Video
          </h1>

          <p className="text-muted-foreground">
            Create AI-powered educational videos tailored to your learning style
          </p>
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-gray-300">
            Videos this month:{" "}
            <span className={`font-semibold flex items-center gap-1 ${
              usage.used >= usage.limit ? "text-red-400" : "text-violet-300"
            }`}>
              {usage.used} / {usage.limit}
              {usage.used >= usage.limit && (
                <AlertTriangle className="w-4 h-4 text-red-400" />
              )}
            </span>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-4 gap-8">
          {/* LEFT SIDEBAR - Video Duration & Stats */}

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-1"
          >
            <div className="glass-card rounded-2xl p-6 space-y-6 sticky top-32">
              <div className="flex items-center gap-3 mb-4">
                <Clock className="w-5 h-5 text-violet-400" />

                <h3 className="font-semibold text-lg">Video Duration</h3>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Estimated Time</span>

                  <span className="text-violet-400 font-semibold">
                    {duration[0]} min
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Processing</span>

                    <span className="text-violet-400">{duration[0] * 15}s</span>
                  </div>

                  <div className="w-full bg-gray-800 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-violet-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${((duration[0] - 2) / 3) * 100}%` }} // Maps 2-5 range to 0-100%
                    ></div>
                  </div>
                </div>

                <div className="pt-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Complexity</span>

                    <span
                      className={`font-medium ${
                        duration[0] <= 2.5
                          ? "text-green-400"
                          : duration[0] <= 3.5
                            ? "text-yellow-400"
                            : "text-orange-400"
                      }`}
                    >
                      {duration[0] <= 2.5
                        ? "Simple"
                        : duration[0] <= 3.5
                          ? "Medium"
                          : "Complex"}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Resources</span>

                    <span className="text-white">
                      {Math.round(duration[0] * 1.2)} sources
                    </span>
                  </div>
                </div>
              </div>

              {/* Brain Dominance Indicator */}

              <div className="pt-4 border-t border-gray-800">
                <div className="flex items-center gap-3 mb-3">
                  <Brain className="w-5 h-5 text-blue-400" />

                  <h4 className="font-medium">Learning Style</h4>
                </div>

                <div className="space-y-3">
                  {brainDominance ? (
                    <div className="w-full text-left p-3 rounded-lg bg-violet-500/20 text-violet-400 border border-violet-500/30">
                      <div className="font-medium capitalize">
                        {brainDominance} Brain
                      </div>

                      <div className="text-xs opacity-70">
                        Your Personalized Style
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-400">
                      Complete the survey to unlock your personalized learning
                      style.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          {/* MAIN FORM */}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-3"
          >
            <div className="glass-card rounded-3xl p-8 space-y-10">
              {/* TOPIC */}

              <div className="space-y-3">
                <Label className="text-lg">What do you want to learn?</Label>

                <Input
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Quantum Computing, French Revolution, React Basics"
                  className="h-14 text-lg bg-muted/50 border-gray-700 text-white placeholder:text-gray-400"
                />
              </div>

              {/* DETAILS */}

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Label>Additional details</Label>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="w-4 h-4 text-muted-foreground" />
                      </TooltipTrigger>

                      <TooltipContent className="bg-gray-900 border-gray-700 text-white">
                        Add focus areas or examples you want covered
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                <Textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Any specific topics, examples, or depth preferences..."
                  className="min-h-[120px] bg-muted/50 border-gray-700 text-white placeholder:text-gray-400"
                />
              </div>

              {/* CATEGORY & LANGUAGE */}

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label>Category</Label>

                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="bg-muted/50 border-gray-700 text-white">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>

                    <SelectContent className="bg-gray-900 border-gray-700">
                      <SelectItem
                        value="stem"
                        className="focus:bg-violet-500/20 focus:text-violet-300 text-white data-[state=checked]:text-violet-300"
                      >
                        STEM
                      </SelectItem>

                      <SelectItem
                        value="business"
                        className="focus:bg-violet-500/20 focus:text-violet-300 text-white data-[state=checked]:text-violet-300"
                      >
                        Business
                      </SelectItem>

                      <SelectItem
                        value="technology"
                        className="focus:bg-violet-500/20 focus:text-violet-300 text-white data-[state=checked]:text-violet-300"
                      >
                        Technology
                      </SelectItem>

                      <SelectItem
                        value="arts"
                        className="focus:bg-violet-500/20 focus:text-violet-300 text-white data-[state=checked]:text-violet-300"
                      >
                        Arts & Design
                      </SelectItem>

                      <SelectItem
                        value="languages"
                        className="focus:bg-violet-500/20 focus:text-violet-300 text-white data-[state=checked]:text-violet-300"
                      >
                        Languages
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label>Language</Label>

                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger className="bg-muted/50 border-gray-700 text-white">
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>

                    <SelectContent className="bg-gray-900 border-gray-700">
                      <SelectItem
                        value="en"
                        className="focus:bg-violet-500/20 focus:text-violet-300 text-white data-[state=checked]:text-violet-300"
                      >
                        <span className="flex items-center gap-2">English</span>
                      </SelectItem>

                      <SelectItem
                        value="hi"
                        className="focus:bg-violet-500/20 focus:text-violet-300 text-white data-[state=checked]:text-violet-300"
                      >
                        Hindi
                      </SelectItem>

                      <SelectItem
                        value="fr"
                        className="focus:bg-violet-500/20 focus:text-violet-300 text-white data-[state=checked]:text-violet-300"
                      >
                        French
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* DURATION - Updated range to 2-5 minutes */}

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Video duration</Label>

                  <span className="text-violet-400 font-semibold">
                    {duration[0]} minutes
                  </span>
                </div>

                <Slider
                  value={duration}
                  onValueChange={setDuration}
                  min={2}
                  max={5}
                  step={1}
                  className="bg-gray-800/50 border border-gray-600 rounded-full h-3"
                />

                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>2 min</span>

                  <span>5 min</span>
                </div>
              </div>

              {/* BRAIN DOMINANCE BASED CONTENT PRESENTATION */}

              <div className="space-y-4">
                <Label>Learning Approach</Label>

                <div className="grid grid-cols-1 gap-4">
                  {brainDominance === "analytical" && (
                    <div className="rounded-xl border border-gray-700 bg-gray-800/50 p-4">
                      <h4 className="font-medium text-white mb-2">
                        Analytical Approach
                      </h4>

                      <ul className="text-sm text-gray-300 space-y-1">
                        <li className="flex items-start gap-2">
                          <span className="text-violet-400 mt-1">•</span>

                          <span>
                            Detailed explanations with step-by-step breakdowns
                          </span>
                        </li>

                        <li className="flex items-start gap-2">
                          <span className="text-violet-400 mt-1">•</span>

                          <span>
                            Logical progression and systematic organization
                          </span>
                        </li>

                        <li className="flex items-start gap-2">
                          <span className="text-violet-400 mt-1">•</span>

                          <span>
                            Data-driven insights and evidence-based content
                          </span>
                        </li>
                      </ul>
                    </div>
                  )}

                  {brainDominance === "creative" && (
                    <div className="rounded-xl border border-gray-700 bg-gray-800/50 p-4">
                      <h4 className="font-medium text-white mb-2">
                        Creative Approach
                      </h4>

                      <ul className="text-sm text-gray-300 space-y-1">
                        <li className="flex items-start gap-2">
                          <span className="text-violet-400 mt-1">•</span>

                          <span>
                            Narrative storytelling and relatable metaphors
                          </span>
                        </li>

                        <li className="flex items-start gap-2">
                          <span className="text-violet-400 mt-1">•</span>

                          <span>
                            Visual representations and imaginative examples
                          </span>
                        </li>

                        <li className="flex items-start gap-2">
                          <span className="text-violet-400 mt-1">•</span>

                          <span>
                            Pattern recognition and associative learning
                          </span>
                        </li>
                      </ul>
                    </div>
                  )}

                  {brainDominance === "balanced" && (
                    <div className="rounded-xl border border-gray-700 bg-gray-800/50 p-4">
                      <h4 className="font-medium text-white mb-2">
                        Balanced Approach
                      </h4>

                      <ul className="text-sm text-gray-300 space-y-1">
                        <li className="flex items-start gap-2">
                          <span className="text-violet-400 mt-1">•</span>

                          <span>
                            Combination of analytical and creative methods
                          </span>
                        </li>

                        <li className="flex items-start gap-2">
                          <span className="text-violet-400 mt-1">•</span>

                          <span>
                            Structured creativity with logical foundations
                          </span>
                        </li>

                        <li className="flex items-start gap-2">
                          <span className="text-violet-400 mt-1">•</span>

                          <span>
                            Adaptive content that fits various learning needs
                          </span>
                        </li>
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {/* CTA */}

              <Button
                size="lg"
                onClick={handleSubmit}
                disabled={!topic.trim() || isGenerating}
                className="

                  h-14 w-full

                  rounded-2xl

                  text-lg font-medium

                  bg-gradient-to-r from-violet-600 to-blue-600

                  hover:from-violet-500 hover:to-blue-500

                  shadow-[0_10px_40px_-10px_rgba(124,58,237,0.6)]

                  disabled:opacity-50 disabled:cursor-not-allowed

                  transition-all

                "
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5 mr-2" />
                    Generate Video
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* VIDEO GENERATION MODAL */}

      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-900 rounded-3xl p-8 max-w-md w-full border border-gray-700"
            >
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-violet-500/20 to-blue-500/20 flex items-center justify-center">
                  <Play className="w-8 h-8 text-violet-400" />
                </div>

                <h3 className="text-2xl font-bold text-white mb-2">
                  Creating Your Video
                </h3>

                <p className="text-gray-400 mb-6">
                  Processing your content and generating personalized video...
                </p>

                {/* Countdown removed per request */}

                <div className="mb-6">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-400">Progress</span>

                    <span className="text-violet-400 font-medium">
                      {progress}%
                    </span>
                  </div>

                  <div className="w-full bg-gray-800 rounded-full h-3">
                    <motion.div
                      className="bg-gradient-to-r from-violet-500 to-blue-500 h-3 rounded-full"
                      style={{ width: `${progress}%` }}
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.5 }}
                    ></motion.div>
                  </div>
                </div>

                {progress < 100 && status !== "error" ? (
                  <div className="space-y-3">
                    <div className={`flex items-center gap-3 text-sm ${
                      progress >= 20 ? "text-green-400" : "text-gray-300"
                    }`}>
                      {progress >= 20 ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
                      )}
                      <span>
                        {progress >= 20 ? "Topic analyzed" : "Analyzing your topic..."}
                      </span>
                    </div>

                    <div className={`flex items-center gap-3 text-sm ${
                      progress >= 40 ? "text-green-400" : progress < 20 ? "text-gray-500" : "text-gray-300"
                    }`}>
                      {progress >= 40 ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : progress >= 20 ? (
                        <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
                      ) : (
                        <div className="w-4 h-4" />
                      )}
                      <span>
                        {progress >= 40
                          ? "Content outline generated"
                          : llmBusy
                            ? "AI is busy, retrying..."
                            : "Generating content outline..."}
                      </span>
                    </div>

                    <div className={`flex items-center gap-3 text-sm ${
                      progress >= 60 ? "text-green-400" : progress < 40 ? "text-gray-500" : "text-gray-300"
                    }`}>
                      {progress >= 60 ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : progress >= 40 ? (
                        <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
                      ) : (
                        <div className="w-4 h-4" />
                      )}
                      <span>{progress >= 60 ? "Video created" : "Creating slides and visuals..."}</span>
                    </div>

                    {progress >= 90 && progress < 100 && (
                      <div className="flex items-center gap-3 text-sm text-violet-400">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Saving your video...</span>
                      </div>
                    )}
                  </div>
                ) : status === "error" ? (
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-red-500/20 to-orange-500/20 flex items-center justify-center">
                      <svg
                        className="w-8 h-8 text-red-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        />
                      </svg>
                    </div>

                    <h4 className="text-xl font-bold text-white mb-2">
                      {errorMsg?.includes("survey") ? "Survey Required" : "Generation Failed"}
                    </h4>

                    <p className="text-gray-400 text-sm mb-6">
                      {errorMsg ||
                        "Something went wrong while generating your video. This could be due to a temporary issue with our AI service."}
                    </p>

                    <div className="flex gap-3">
                      {errorMsg?.includes("survey") ? (
                        brainDominance ? (
                          <div className="flex-1 rounded-lg border border-violet-500/30 bg-violet-500/10 px-4 py-3 text-left">
                            <div className="text-xs text-violet-300 uppercase tracking-wide">
                              Brain Dominance
                            </div>
                            <div className="mt-1 text-sm font-medium text-violet-200 capitalize">
                              {brainDominance} Brain
                            </div>
                          </div>
                        ) : (
                          <Button
                            className="flex-1 bg-gradient-to-r from-violet-600 to-blue-600"
                            onClick={() => {
                              closeModal();
                              router.push("/survey");
                            }}
                          >
                            <Brain className="w-4 h-4 mr-2" />
                            Complete Survey
                          </Button>
                        )
                      ) : (
                        <>
                          <Button
                            variant="outline"
                            onClick={() => {
                              closeModal();
                              router.push("/dashboard");
                            }}
                            className="flex-1 border-gray-700 text-white hover:bg-gray-800"
                          >
                            <LayoutDashboard className="w-4 h-4 mr-2" />
                            Go to Dashboard
                          </Button>

                          <Button
                            className="flex-1 bg-gradient-to-r from-violet-600 to-blue-600"
                            onClick={() => {
                              closeModal();
                            }}
                          >
                            <Zap className="w-4 h-4 mr-2" />
                            Try Again
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-4" />

                    <p className="text-green-400 font-medium mb-6">
                      Video generation complete!
                    </p>
                    {errorMsg && (
                      <p className="text-red-400 text-sm mb-4">{errorMsg}</p>
                    )}

                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={closeModal}
                        className="flex-1 border-gray-700 text-white hover:bg-gray-800"
                      >
                        Close
                      </Button>

                      <Button
                        className="flex-1 bg-gradient-to-r from-violet-600 to-blue-600"
                        onClick={handleViewVideo}
                        disabled={!videoUrl && status !== "completed"}
                      >
                        View Video
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PLAN LIMIT REACHED MODAL */}
      <AnimatePresence>
        {showPlanLimit && (
          <PlanLimitReached onReset={() => setShowPlanLimit(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
