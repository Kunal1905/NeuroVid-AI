"use client";

import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black text-black dark:text-white">
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-6 py-32">
          <div className="flex flex-col items-center text-center gap-8">
            {/* Logo */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-white text-2xl">
                🧠
              </div>
              <h1 className="text-4xl font-bold tracking-tight">
                NeuroVid AI
              </h1>
            </div>

            {/* Headline */}
            <h2 className="max-w-3xl text-4xl sm:text-5xl font-semibold leading-tight">
              Turn complex ideas into{" "}
              <span className="bg-gradient-to-r from-violet-500 to-blue-500 bg-clip-text text-transparent">
                engaging AI-powered videos
              </span>
            </h2>

            {/* Subheadline */}
            <p className="max-w-2xl text-lg text-zinc-600 dark:text-zinc-400">
              NeuroVid AI helps students, creators, and professionals learn and
              explain topics visually — tailored to how their brain understands best.
            </p>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row gap-4 mt-4">
              <Link href="/sign-in">
                <div className="h-12 px-8 flex items-center justify-center rounded-full bg-black text-white dark:bg-white dark:text-black font-medium hover:opacity-90 transition cursor-pointer">
                  Get Started Free
                </div>
              </Link>
              <Link href="/sign-up">
                <div className="h-12 px-8 flex items-center justify-center rounded-full border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition cursor-pointer">
                  Create Account
                </div>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="border-t border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <h3 className="text-3xl font-semibold text-center mb-16">
            How NeuroVid AI Works
          </h3>

          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                step: "01",
                title: "Share Your Topic",
                desc: "Enter any concept — from exam topics to startup ideas or technical concepts."
              },
              {
                step: "02",
                title: "AI Understands You",
                desc: "NeuroVid adapts content to your cognitive style — analytical, visual, practical, or creative."
              },
              {
                step: "03",
                title: "Watch & Learn",
                desc: "Get a clear, engaging video explanation designed for faster understanding."
              }
            ].map((item) => (
              <div
                key={item.step}
                className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 bg-white dark:bg-zinc-900"
              >
                <span className="text-sm font-medium text-violet-500">
                  {item.step}
                </span>
                <h4 className="mt-2 text-xl font-semibold">{item.title}</h4>
                <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHO IT’S FOR */}
      <section className="bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <h3 className="text-3xl font-semibold text-center mb-16">
            Built for Curious Minds
          </h3>

          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                title: "Students",
                desc: "Understand difficult subjects faster with personalized video explanations."
              },
              {
                title: "Creators",
                desc: "Turn scripts, ideas, or lessons into engaging visual content."
              },
              {
                title: "Professionals",
                desc: "Explain complex concepts clearly — for teams, clients, or learning."
              }
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-2xl p-6 bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-zinc-800"
              >
                <h4 className="text-xl font-semibold">{item.title}</h4>
                <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="border-t border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto max-w-4xl px-6 py-24 text-center">
          <h3 className="text-3xl sm:text-4xl font-semibold mb-4">
            Learn smarter. Explain better. Create faster.
          </h3>
          <p className="text-zinc-600 dark:text-zinc-400 max-w-xl mx-auto mb-8">
            NeuroVid AI adapts to the way *you* think — so learning finally feels natural.
          </p>
          <Link href="/sign-in">
            <div className="inline-flex h-12 px-8 items-center justify-center rounded-full bg-gradient-to-r from-violet-500 to-blue-500 text-white font-medium hover:opacity-90 transition cursor-pointer">
              Start Using NeuroVid AI
            </div>
          </Link>
        </div>
      </section>
    </div>
  );
}
