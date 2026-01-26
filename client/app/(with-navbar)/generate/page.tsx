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
  Loader2
} from "lucide-react";
import { useAuth } from "@clerk/nextjs";

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

export default function Generate() {
  const { getToken } = useAuth();
  
  // State for form inputs
  const [topic, setTopic] = useState("");
  const [details, setDetails] = useState("");
  const [category, setCategory] = useState("");
  const [language, setLanguage] = useState("");
  const [duration, setDuration] = useState([2]); // Changed to 2 minutes as default (range 2-5)
  
  // State for video generation flow
  const [showModal, setShowModal] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Brain dominance state
  const [brainDominance, setBrainDominance] = useState("analytical"); // analytical, creative, or balanced

  // Handle form submission and trigger video generation
  const handleSubmit = async () => {
    if (!topic.trim()) return;
    
    // Show modal and start generation process
    setShowModal(true);
    setIsGenerating(true);
    setProgress(0);
    
    try {
      // Get auth token
      const token = await getToken();
      
      // Call backend API to submit generation request
      const res = await fetch("http://localhost:3005/api/generate/submitGeneration", {
        method: "POST",
        credentials: "include", // This ensures cookies are sent with the request
        headers: {
          "Content-Type": "application/json",
          // No Authorization header needed - Clerk uses session cookies
        },
        body: JSON.stringify({
          topic,
          details,
          category,
          language,
          duration: duration[0], // Extract the single value from the array
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        console.error("Failed to submit generation:", errorData);
        return;
      }

      const data = await res.json();
      console.log("Generation submitted successfully:", data);

      // Simulate progress for visual effect
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setIsGenerating(false);
            return 100;
          }
          return prev + 10;
        });
      }, 500);
    } catch (error) {
      console.error("Error submitting generation:", error);
      setIsGenerating(false);
    }
  };

  // Close modal and reset
  const closeModal = () => {
    setShowModal(false);
    setIsGenerating(false);
    setProgress(0);
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
                    <span className={`font-medium ${
                      duration[0] <= 2.5 ? 'text-green-400' : 
                      duration[0] <= 3.5 ? 'text-yellow-400' : 'text-orange-400'
                    }`}>
                      {duration[0] <= 2.5 ? 'Simple' : duration[0] <= 3.5 ? 'Medium' : 'Complex'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Resources</span>
                    <span className="text-white">{Math.round(duration[0] * 1.2)} sources</span>
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
                  {[
                    { value: "analytical", label: "Analytical", desc: "Logic & Structure" },
                    { value: "creative", label: "Creative", desc: "Stories & Metaphors" },
                    { value: "balanced", label: "Balanced", desc: "Both Approaches" }
                  ].map((style) => (
                    <button
                      key={style.value}
                      onClick={() => setBrainDominance(style.value)}
                      className={`w-full text-left p-3 rounded-lg transition-colors ${
                        brainDominance === style.value
                          ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
                          : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50'
                      }`}
                    >
                      <div className="font-medium">{style.label}</div>
                      <div className="text-xs opacity-70">{style.desc}</div>
                    </button>
                  ))}
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
                        <span className="flex items-center gap-2">
                          <Globe className="w-4 h-4" /> English
                        </span>
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
                  <span className="text-violet-400 font-semibold">{duration[0]} minutes</span>
                </div>
                <Slider 
                  value={duration} 
                  onValueChange={setDuration}
                  min={2} 
                  max={5} 
                  step={1} 
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
                      <h4 className="font-medium text-white mb-2">Analytical Approach</h4>
                      <ul className="text-sm text-gray-300 space-y-1">
                        <li className="flex items-start gap-2">
                          <span className="text-violet-400 mt-1">•</span>
                          <span>Detailed explanations with step-by-step breakdowns</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-violet-400 mt-1">•</span>
                          <span>Logical progression and systematic organization</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-violet-400 mt-1">•</span>
                          <span>Data-driven insights and evidence-based content</span>
                        </li>
                      </ul>
                    </div>
                  )}
                  
                  {brainDominance === "creative" && (
                    <div className="rounded-xl border border-gray-700 bg-gray-800/50 p-4">
                      <h4 className="font-medium text-white mb-2">Creative Approach</h4>
                      <ul className="text-sm text-gray-300 space-y-1">
                        <li className="flex items-start gap-2">
                          <span className="text-violet-400 mt-1">•</span>
                          <span>Narrative storytelling and relatable metaphors</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-violet-400 mt-1">•</span>
                          <span>Visual representations and imaginative examples</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-violet-400 mt-1">•</span>
                          <span>Pattern recognition and associative learning</span>
                        </li>
                      </ul>
                    </div>
                  )}
                  
                  {brainDominance === "balanced" && (
                    <div className="rounded-xl border border-gray-700 bg-gray-800/50 p-4">
                      <h4 className="font-medium text-white mb-2">Balanced Approach</h4>
                      <ul className="text-sm text-gray-300 space-y-1">
                        <li className="flex items-start gap-2">
                          <span className="text-violet-400 mt-1">•</span>
                          <span>Combination of analytical and creative methods</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-violet-400 mt-1">•</span>
                          <span>Structured creativity with logical foundations</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-violet-400 mt-1">•</span>
                          <span>Adaptive content that fits various learning needs</span>
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
                
                <div className="mb-6">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-400">Progress</span>
                    <span className="text-violet-400 font-medium">{progress}%</span>
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
                
                {progress < 100 ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-sm text-gray-300">
                      <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
                      <span>Analyzing your topic...</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-300">
                      <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
                      <span>Generating content outline...</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-300">
                      <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
                      <span>Creating slides and visuals...</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-4" />
                    <p className="text-green-400 font-medium mb-6">
                      Video generation complete!
                    </p>
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
                        onClick={closeModal}
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
    </div>
  );
}
