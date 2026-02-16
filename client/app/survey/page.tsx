"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Brain, Lightbulb, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link  from "next/link"
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { apiUrl } from "@/lib/api";

type ResponseValue =
  | 'analytical'
  | 'practical'
  | 'relational'
  | 'experimental';

type ProfileResult = {
  left_score: number;
  right_score: number;
  dominant_quadrant: 'left' | 'right' | 'balanced';
};

type QuadrantInfo = {
  icon: React.ElementType;
  color: string;
  title: string;
  description: string;
  traits: string[];
  learningStyle: string;
};

type SurveyOption = {
  text: string;
  value: ResponseValue;
}

type SurveyQuestions = {
  id: number;
  text: string;
  options: SurveyOption[];
}

const optionLabels = ['A', 'B', 'C', 'D'];

const surveyQuestions: SurveyQuestions[] = [
  {
    id: 1,
    text: "When solving a complex problem, what's your first instinct?",
    options: [
      { text: "Gather data and analyze the facts systematically", value: "analytical" },
      { text: "Create a detailed plan with clear steps", value: "practical" },
      { text: "Discuss it with others to get different perspectives", value: "relational" },
      { text: "Brainstorm creative solutions and explore possibilities", value: "experimental" }
    ]
  },
  {
    id: 2,
    text: "How do you prefer to learn new information?",
    options: [
      { text: "Through logical explanations with evidence and research", value: "analytical" },
      { text: "Step-by-step tutorials with practical exercises", value: "practical" },
      { text: "Stories and real-world examples from people", value: "relational" },
      { text: "Visual diagrams, metaphors, and big-picture overviews", value: "experimental" }
    ]
  },
  {
    id: 3,
    text: "In a group project, what role do you naturally take?",
    options: [
      { text: "The researcher who analyzes data and validates ideas", value: "analytical" },
      { text: "The organizer who creates timelines and tracks progress", value: "practical" },
      { text: "The communicator who ensures everyone is heard and aligned", value: "relational" },
      { text: "The innovator who generates creative ideas and solutions", value: "experimental" }
    ]
  },
  {
    id: 4,
    text: "What type of content do you find most engaging?",
    options: [
      { text: "Charts, graphs, and statistical breakdowns", value: "analytical" },
      { text: "How-to guides and practical checklists", value: "practical" },
      { text: "Personal stories and emotional narratives", value: "relational" },
      { text: "Conceptual frameworks and creative visualizations", value: "experimental" }
    ]
  },
  {
    id: 5,
    text: "When explaining something to others, you typically...",
    options: [
      { text: "Present facts, numbers, and logical reasoning", value: "analytical" },
      { text: "Give clear, sequential instructions", value: "practical" },
      { text: "Share personal examples and connect emotionally", value: "relational" },
      { text: "Use analogies, metaphors, and creative comparisons", value: "experimental" }
    ]
  },
  {
    id: 6,
    text: "What frustrates you most when learning something new?",
    options: [
      { text: "Vague explanations without supporting evidence", value: "analytical" },
      { text: "Disorganized content with no clear structure", value: "practical" },
      { text: "Impersonal content that doesn't connect to real life", value: "relational" },
      { text: "Repetitive, boring content without any creativity", value: "experimental" }
    ]
  },
  {
    id: 7,
    text: "How do you make important decisions?",
    options: [
      { text: "Weigh the pros and cons using objective criteria", value: "analytical" },
      { text: "Follow a proven process or established guidelines", value: "practical" },
      { text: "Consider how it affects people and relationships", value: "relational" },
      { text: "Trust my intuition and explore unconventional options", value: "experimental" }
    ]
  },
  {
    id: 8,
    text: "Your ideal work environment would be...",
    options: [
      { text: "Quiet, focused, with access to data and resources", value: "analytical" },
      { text: "Organized, structured, with clear expectations", value: "practical" },
      { text: "Collaborative, warm, with strong team connections", value: "relational" },
      { text: "Creative, flexible, with freedom to experiment", value: "experimental" }
    ]
  },
  {
    id: 9,
    text: "When reading a book or article, you prefer...",
    options: [
      { text: "Dense, information-rich content with references", value: "analytical" },
      { text: "Clear, actionable takeaways and summaries", value: "practical" },
      { text: "Engaging narratives with relatable characters", value: "relational" },
      { text: "Thought-provoking ideas that challenge conventions", value: "experimental" }
    ]
  },
  {
    id: 10,
    text: "How do you handle uncertainty or ambiguity?",
    options: [
      { text: "Research until I have enough data to decide", value: "analytical" },
      { text: "Create contingency plans for different scenarios", value: "practical" },
      { text: "Seek advice and support from trusted people", value: "relational" },
      { text: "Embrace it as an opportunity for discovery", value: "experimental" }
    ]
  },
  {
    id: 11,
    text: "What motivates you to learn something new?",
    options: [
      { text: "Understanding how things work at a deep level", value: "analytical" },
      { text: "Gaining practical skills I can apply immediately", value: "practical" },
      { text: "Connecting with others who share the interest", value: "relational" },
      { text: "Exploring new ideas and expanding my horizons", value: "experimental" }
    ]
  },
  {
    id: 12,
    text: "In conversations, you tend to...",
    options: [
      { text: "Focus on facts and logical arguments", value: "analytical" },
      { text: "Keep things practical and solution-oriented", value: "practical" },
      { text: "Pay attention to emotions and body language", value: "relational" },
      { text: "Jump between topics and make creative connections", value: "experimental" }
    ]
  },
  {
    id: 13,
    text: "When watching a documentary, you're most drawn to...",
    options: [
      { text: "Scientific explanations and data visualizations", value: "analytical" },
      { text: "Practical demonstrations and real-world applications", value: "practical" },
      { text: "Human interest stories and emotional journeys", value: "relational" },
      { text: "Innovative concepts and future possibilities", value: "experimental" }
    ]
  },
  {
    id: 14,
    text: "How do you remember information best?",
    options: [
      { text: "By understanding the underlying logic and patterns", value: "analytical" },
      { text: "By practicing and applying it repeatedly", value: "practical" },
      { text: "By connecting it to personal experiences or stories", value: "relational" },
      { text: "By creating mental images and visual associations", value: "experimental" }
    ]
  },
  {
    id: 15,
    text: "What would make a learning video perfect for you?",
    options: [
      { text: "Clear structure, data-backed claims, and technical depth", value: "analytical" },
      { text: "Practical examples, step-by-step guidance, and actionable tips", value: "practical" },
      { text: "Engaging presenter, real stories, and emotional connection", value: "relational" },
      { text: "Creative visuals, big ideas, and inspiring concepts", value: "experimental" }
    ]
  }
];

/* ---------------- LOGIC ---------------- */

function calculateProfile(responses: ResponseValue[]): ProfileResult {
  let left = 0;
  let right = 0;

  responses.forEach((r) => {
    if (r === 'analytical' || r === 'practical') left++;
    else right++;
  });

  const total = left + right;

  const left_score = Math.round((left / total) * 100) || 0;
  const right_score = Math.round((right / total) * 100) || 0;

  let dominant_quadrant: ProfileResult['dominant_quadrant'] = 'balanced';

  if (left_score > right_score + 10) dominant_quadrant = 'left';
  if (right_score > left_score + 10) dominant_quadrant = 'right';

  return { left_score, right_score, dominant_quadrant };
}

/* ---------------- META ---------------- */

const quadrantInfo: Record<
  ProfileResult['dominant_quadrant'],
  QuadrantInfo
> = {
  left: {
    icon: Brain,
    color: '#3B82F6',
    title: 'Left-Brain Thinker',
    description:
      'You excel at logical reasoning, data analysis, and structured planning.',
    traits: ['Logical', 'Organized', 'Analytical', 'Practical'],
    learningStyle:
      'Charts, sequential steps, and practical examples work best for you.',
  },
  right: {
    icon: Lightbulb,
    color: '#8B5CF6',
    title: 'Right-Brain Thinker',
    description:
      'You thrive with creative exploration and emotional connections.',
    traits: ['Creative', 'Intuitive', 'Empathetic', 'Innovative'],
    learningStyle:
      'Visuals, narratives, and exploratory content fuel your learning.',
  },
  balanced: {
    icon: Sparkles,
    color: '#EC4899',
    title: 'Balanced Thinker',
    description:
      'You adapt seamlessly between logic and creativity.',
    traits: ['Adaptable', 'Versatile', 'Flexible', 'Balanced'],
    learningStyle:
      'You benefit from a blend of structured and creative content.',
  },
};

/* ---------------- COMPONENT ---------------- */

export default function BrainDominanceSurveyPage() {
  const router = useRouter();

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [responses, setResponses] = useState<ResponseValue[]>([]);
  const [profile, setProfile] = useState<ProfileResult | null>(null);

  const totalQuestions = surveyQuestions.length;
  const { getToken } = useAuth();

  const handleSurveyComplete = async (calculated: ProfileResult) => {
  const token = await getToken();
  
  const res = await fetch(
    apiUrl("/api/survey/submitSurvey"),
    {
      method: "POST",
      credentials: "include", // This ensures cookies are sent with the request
      headers: {
        "Content-Type": "application/json",
        // Remove the Authorization header - Clerk will use session cookies
      },
      body: JSON.stringify({
        leftScore : calculated.left_score,
        rightScore : calculated.right_score,
        dominantQuadrant : calculated.dominant_quadrant,
      }),
    }
  );

  if (!res.ok) {
    console.error("Failed to submit survey");
    return;
  }

  router.push("/dashboard");
};


   const handleSelect = (value: ResponseValue) => {
    const updated = [...responses];
    updated[currentQuestion] = value;
    setResponses(updated);

    if (currentQuestion < surveyQuestions.length - 1) {
      setCurrentQuestion((q) => q + 1);
    } else {
      const calculated = calculateProfile(updated);
      setProfile(calculated);
      handleSurveyComplete(calculated);
    }
  };

  /* ---------------- RESULT ---------------- */

if (profile) {
  const dominant = quadrantInfo[profile.dominant_quadrant];
  const Icon = dominant.icon;

  const chartData = [
    { name: "Left-Brain", value: profile.left_score, color: "#3B82F6" },
    { name: "Right-Brain", value: profile.right_score, color: "#8B5CF6" },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-4xl"
      >
        {/* -------- Main Card -------- */}
        <div className="glass-card rounded-3xl p-6 sm:p-10">
          {/* Header */}
          <div className="text-center mb-8">
            <div
              className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center"
              style={{ background: `${dominant.color}20` }}
            >
              <Icon className="w-8 h-8" style={{ color: dominant.color }} />
            </div>

            <h1 className="text-3xl sm:text-4xl font-bold text-white">
              {dominant.title}
            </h1>

            <p className="text-slate-400 mt-2 max-w-xl mx-auto">
              {dominant.description}
            </p>
          </div>

          {/* Content */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            {/* Chart */}
            <div className="flex justify-center">
              <div className="w-full max-w-xs sm:max-w-sm aspect-square">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      dataKey="value"
                      innerRadius="60%"
                      outerRadius="90%"
                      paddingAngle={4}
                      label={({ name, percent }) => `${name}: ${percent ? (percent * 100).toFixed(0) : '0'}%`}
                      labelLine={true}
                    >
                      {chartData.map((d, i) => (
                        <Cell key={i} fill={d.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v) => [`${v}%`, "Score"]}
                      contentStyle={{
                        background: "transparent",
                        border: "none",
                        boxShadow: "none",
                        color: "white",
                        fontSize: "14px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Traits */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">
                  Key Traits
                </h3>

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
                <h3 className="text-lg font-semibold text-white mb-2">
                  Best Learning Style
                </h3>
                <p className="text-slate-300 text-sm leading-relaxed">
                  {dominant.learningStyle}
                </p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-10 text-center">
            <div className="inline-block p-1 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600">
              <Link href="/generate">
                <Button size="lg" className="gap-2 bg-background text-foreground hover:bg-accent">
                  Start Learning
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>

            <p className="text-slate-500 text-xs mt-3">
              Your results have been saved to your dashboard
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}


  /* ---------------- QUESTIONS ---------------- */

 const question = surveyQuestions[currentQuestion];
const selected = responses[currentQuestion];

const progress = Math.round(
  ((currentQuestion + 1) / totalQuestions) * 100
);

return (
  <div className="min-h-screen flex items-center justify-center px-4">
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="w-full max-w-2xl"
    >
      {/* -------- Heading -------- */}
      <div className="text-center mb-8">
        <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-violet-600/20 flex items-center justify-center">
          <Brain className="w-6 h-6 text-violet-400" />
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold text-white">
          Brain Dominance Survey
        </h1>

        <p className="text-slate-400 mt-2 text-sm sm:text-base">
          Answer these questions to discover your cognitive profile
        </p>
      </div>

      {/* -------- Card -------- */}
      <div className="glass-card p-6 sm:p-8 rounded-3xl">
        {/* Progress */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-slate-400 mb-2">
            <span>
              Question {currentQuestion + 1} of {totalQuestions}
            </span>
            <span>{progress}%</span>
          </div>

          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-violet-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Question */}
        <h2 className="text-2xl sm:text-3xl font-bold text-white text-center mb-8 leading-snug">
          {question.text}
        </h2>

        {/* Options */}
        <div className="space-y-3">
          {question.options.map((opt, i) => (
            <button
              key={opt.value}
              onClick={() => handleSelect(opt.value)}
              className={cn(
                "w-full p-4 sm:p-5 rounded-xl text-left flex items-center gap-4 transition-all",
                selected === opt.value
                  ? "bg-violet-600/30 border border-violet-500"
                  : "bg-slate-800 hover:bg-slate-700"
              )}
            >
              <span className="w-8 h-8 shrink-0 flex items-center justify-center rounded-full bg-slate-700 text-white font-bold">
                {optionLabels[i]}
              </span>
              <span className="text-slate-200 text-sm sm:text-base">
                {opt.text}
              </span>
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  </div>
);
}
