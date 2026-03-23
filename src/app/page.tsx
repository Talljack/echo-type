import { ArrowRight, Headphones, MessageCircle, Mic, PenTool } from 'lucide-react';
import Link from 'next/link';

export default function LandingPage() {
  const features = [
    {
      icon: Headphones,
      title: 'Listen',
      desc: 'Listen to English articles, phrases, sentences, and words with adjustable speed and interactive transcripts.',
      color: 'bg-blue-500',
    },
    {
      icon: Mic,
      title: 'Speak & Read',
      desc: 'Read aloud with real-time speech recognition and get color-coded pronunciation feedback.',
      color: 'bg-green-500',
    },
    {
      icon: PenTool,
      title: 'Write',
      desc: 'Practice typing English with real-time error correction, WPM tracking, and spaced repetition.',
      color: 'bg-purple-500',
    },
    {
      icon: MessageCircle,
      title: 'AI Tutor',
      desc: 'Chat with an AI English tutor that knows your learning context and helps you improve.',
      color: 'bg-indigo-500',
    },
  ];
  return (
    <div className="min-h-screen bg-[#EEF2FF]">
      <nav className="flex items-center justify-between px-8 py-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">E</span>
          </div>
          <span className="text-xl font-bold text-indigo-900 font-[var(--font-poppins)]">EchoType</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="px-5 py-2.5 text-indigo-600 font-medium hover:bg-indigo-50 rounded-lg transition-colors duration-200 cursor-pointer"
          >
            Sign In
          </Link>
          <Link
            href="/dashboard"
            className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors duration-200 cursor-pointer"
          >
            Start Learning
          </Link>
        </div>
      </nav>

      <section className="max-w-4xl mx-auto text-center px-8 pt-20 pb-16">
        <h1 className="text-5xl md:text-6xl font-bold text-indigo-900 font-[var(--font-poppins)] leading-tight">
          Master English Through
          <br />
          <span className="text-indigo-600">Immersive Practice</span>
        </h1>
        <p className="mt-6 text-lg text-indigo-600 max-w-2xl mx-auto">
          Listen, speak, read, and write — four pillars of language mastery, all in one platform. Import your own
          content and practice with AI-powered feedback.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link
            href="/dashboard"
            className="px-8 py-3 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 transition-colors duration-200 flex items-center gap-2 cursor-pointer"
          >
            Get Started Free
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-8 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="bg-white/70 backdrop-blur-xl rounded-2xl p-8 border border-indigo-100 hover:shadow-lg transition-all duration-200"
            >
              <div className={`w-12 h-12 rounded-xl ${feature.color} flex items-center justify-center mb-4`}>
                <feature.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-indigo-900 font-[var(--font-poppins)] mb-2">{feature.title}</h3>
              <p className="text-indigo-600">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-indigo-100 py-8 text-center text-sm text-indigo-400">
        <p>EchoType — Learn English by doing. Built with Next.js, Vercel AI SDK, and Web Speech API.</p>
      </footer>
    </div>
  );
}
