"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import { Play, CheckCircle, XCircle } from "lucide-react";
import Navbar from "../Navbar/page";

type QuizQuestion = {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
};

type GenerationData = {
  sessionId: string;
  topic: string;
  details: string;
  category?: string | null;
  language?: string | null;
  duration?: number | null;
  status: string;
  progress: number;
  script?: { title?: string; scenes?: any[] } | null;
  quiz?: { questions?: QuizQuestion[] } | null;
  videoUrl?: string | null;
  thumbnailUrl?: string | null;
};

export default function VideoResult() {
  const { getToken } = useAuth();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("sessionId");

  const [data, setData] = useState<GenerationData | null>(null);
  const [activeTab, setActiveTab] = useState<"script" | "quiz">("script");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<number, number | null>>({});
  const [submitted, setSubmitted] = useState<Record<number, boolean>>({});
  const [currentQuestion, setCurrentQuestion] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      if (!sessionId) {
        setError("Missing sessionId");
        setLoading(false);
        return;
      }
      try {
        const token = await getToken();
        const res = await fetch(
          `http://localhost:3005/api/generate/session/${sessionId}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!res.ok) {
          setError("Failed to load generation");
          setLoading(false);
          return;
        }
        const json = await res.json();
        setData(json);
      } catch {
        setError("Failed to load generation");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [getToken, sessionId]);

  const isDemoVideo = useMemo(() => {
    const url = data?.videoUrl || "";
    return url.startsWith("https://cdn.local/");
  }, [data?.videoUrl]);

  const questions = data?.quiz?.questions || [];

  const handleSelect = (idx: number, opt: number) => {
    setAnswers((prev) => ({ ...prev, [idx]: opt }));
  };

  const handleSubmitAnswer = (idx: number) => {
    setSubmitted((prev) => ({ ...prev, [idx]: true }));
  };

  const handleNextQuestion = () => {
    setCurrentQuestion((prev) => Math.min(prev + 1, questions.length - 1));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        Loading...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-400">
        {error || "Unknown error"}
      </div>
    );
  }

  return (
    <div>
      <Navbar />
    <div className="min-h-screen px-6 pt-20 pb-16 bg-gradient-to-br from-[#0B0B1A] via-[#0F1028] to-[#090915]">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="space-y-3">
          <div className="text-sm text-gray-400 pt-2.5">Dashboard &gt; Learning Session</div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold text-white">{data.topic}</h1>
            <span className="px-3 py-1 rounded-full text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              {data.status === "COMPLETED" ? "Completed" : "Processing"}
            </span>
            <span className="text-xs text-gray-400">
              {data.duration ?? 0} min · {data.language ?? "en"}
            </span>
          </div>
        </div>

        <div className="rounded-3xl border border-violet-500/20 bg-gradient-to-br from-[#141335] via-[#12102a] to-[#0b0b1a] p-6">
          <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-black/30">
            {data.videoUrl && !isDemoVideo ? (
              <video src={data.videoUrl} controls className="w-full aspect-video" />
            ) : (
              <div className="w-full aspect-video flex items-center justify-center bg-gradient-to-br from-[#1b1a3a] to-[#0c0c1a]">
                <div className="text-center text-gray-300">
                  <div className="mx-auto w-14 h-14 rounded-full bg-white/10 flex items-center justify-center">
                    <Play className="w-6 h-6 text-white/70" />
                  </div>
                  <p className="mt-4 text-sm">
                    Video preview only (demo URL). Connect real video hosting to
                    enable playback.
                  </p>
                </div>
              </div>
            )}
            {isDemoVideo && (
              <div className="absolute top-3 right-3 text-xs px-3 py-1 rounded-full bg-violet-500/20 text-violet-200 border border-violet-500/30">
                Script Ready · Video Coming Soon
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            className={`px-6 py-2 rounded-full border ${
              activeTab === "script"
                ? "bg-violet-600/30 text-white border-violet-500/40"
                : "text-gray-300 border-white/10"
            }`}
            onClick={() => setActiveTab("script")}
          >
            Script
          </button>
          <button
            className={`px-6 py-2 rounded-full border ${
              activeTab === "quiz"
                ? "bg-violet-600/30 text-white border-violet-500/40"
                : "text-gray-300 border-white/10"
            }`}
            onClick={() => setActiveTab("quiz")}
          >
            Quiz
          </button>
        </div>

        {activeTab === "script" && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4 text-gray-200">
            <h2 className="text-xl font-semibold text-white">
              {data.script?.title || "Script"}
            </h2>
            <div className="space-y-4">
              {(data.script?.scenes || []).map((scene: any, idx: number) => (
                <div key={idx} className="p-4 rounded-xl bg-black/30 border border-white/10">
                  <div className="text-sm text-violet-300">
                    Scene {scene.sceneNumber ?? idx + 1}
                  </div>
                  <div className="text-white mt-1">{scene.voiceover}</div>
                  {scene.visual && (
                    <div className="text-sm text-gray-400 mt-2">
                      Visual: {scene.visual}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "quiz" && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-6">
            {questions.length === 0 ? (
              <div className="text-gray-400">No quiz generated yet.</div>
            ) : (
              (() => {
                const idx = currentQuestion;
                const q = questions[idx];
                const selected = answers[idx];
                const isSubmitted = submitted[idx];
                const isCorrect = selected === q.correctAnswer;
                return (
                  <div className="p-4 rounded-xl bg-black/30 border border-white/10">
                    <div className="text-sm text-gray-400 mb-2">
                      Question {idx + 1} of {questions.length}
                    </div>
                    <div className="text-white font-medium mb-3">{q.question}</div>
                    <div className="space-y-2">
                      {q.options.map((opt, optIdx) => (
                        <button
                          key={optIdx}
                          className={`w-full text-left px-4 py-2 rounded-lg border ${
                            selected === optIdx
                              ? "border-violet-400 bg-violet-500/10"
                              : "border-white/10 bg-white/5"
                          }`}
                          onClick={() => handleSelect(idx, optIdx)}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      <button
                        className="px-4 py-2 rounded-lg bg-violet-600/70 text-white text-sm"
                        onClick={() => handleSubmitAnswer(idx)}
                        disabled={selected == null}
                      >
                        Submit Answer
                      </button>
                      {isSubmitted && (
                        <div className={`flex items-center gap-2 text-sm ${isCorrect ? "text-green-400" : "text-red-400"}`}>
                          {isCorrect ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                          {isCorrect ? "Correct" : "Incorrect"}
                        </div>
                      )}
                    </div>
                    {isSubmitted && !isCorrect && (
                      <div className="mt-3 text-sm text-gray-300 border-t border-white/10 pt-3">
                        <div className="text-red-300">Correct Answer: {q.options[q.correctAnswer]}</div>
                        {q.explanation && (
                          <div className="text-gray-400 mt-1">
                            Explanation: {q.explanation}
                          </div>
                        )}
                        {!q.explanation && (
                          <div className="text-gray-500 mt-1">
                            You selected the wrong answer. Review the script above for context.
                          </div>
                        )}
                      </div>
                    )}
                    {isSubmitted && idx < questions.length - 1 && (
                      <div className="mt-4">
                        <button
                          className="px-4 py-2 rounded-lg bg-white/10 text-white text-sm border border-white/10"
                          onClick={handleNextQuestion}
                        >
                          Next Question
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()
            )}
          </div>
        )}
      </div>
    </div>
    </div>
  );
}
