import { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Camera,
  GraduationCap,
  HeartPulse,
  MessageCircle,
  MessageSquareHeart,
  ShieldAlert,
  Sparkles,
  Stethoscope,
  Volume2,
} from 'lucide-react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { QuickMessagesBoard } from '../components/QuickMessagesBoard';

const DASHBOARD_CARDS = [
  {
    title: 'Sign Translator',
    description:
      'Use your webcam with MediaPipe hand-tracking to capture signs and route landmarks for translation.',
    to: '/translator',
    cta: 'Open Translator',
    tone: 'lavender' as const,
    icon: Camera,
  },
  {
    title: 'Quick Messages',
    description:
      'Tap large, multilingual phrases in English, Hindi, or Punjabi — available offline anytime.',
    to: '/quick-messages',
    cta: 'Open Quick Board',
    tone: 'mint' as const,
    icon: MessageSquareHeart,
  },
  {
    title: 'Two-Way Communication',
    description:
      'Split-screen conversation tool with picture board, text-to-speech, and optional voice input.',
    to: '/communicate',
    cta: 'Start Conversation',
    tone: 'blue' as const,
    icon: MessageCircle,
  },
  {
    title: 'Healthcare Mode',
    description:
      'Quickly express pain, dizziness, breathing difficulty, medicine requests, or call for a doctor.',
    to: '/quick-messages?category=healthcare',
    cta: 'Open Healthcare Phrases',
    tone: 'peach' as const,
    icon: Stethoscope,
  },
  {
    title: 'Emergency Mode',
    description:
      'Instant high-visibility urgent alerts with audible playback and clear full-screen display.',
    to: '/emergency',
    cta: 'Open Emergency Mode',
    tone: 'peach' as const,
    icon: AlertTriangle,
  },
  {
    title: 'Learn Sign Language',
    description:
      'Browse searchable gesture guides by category and practice with an interactive quiz.',
    to: '/learn',
    cta: 'Explore Sign Library',
    tone: 'lavender' as const,
    icon: BookOpen,
  },
];

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Capture Hand Landmarks',
    description:
      'Your camera extracts 21 3D hand keypoints per hand locally in the browser with MediaPipe Tasks Vision.',
    tone: 'lavender' as const,
    icon: Camera,
  },
  {
    step: '02',
    title: 'Classify Sign Gestures',
    description:
      'Landmark sequences are routed to the FastAPI inference pipeline for structured gesture recognition.',
    tone: 'blue' as const,
    icon: Sparkles,
  },
  {
    step: '03',
    title: 'Read & Speak Effortlessly',
    description:
      'Display clear text translations, hear spoken audio output, or use offline Quick Messages & Two-Way tools.',
    tone: 'mint' as const,
    icon: Volume2,
  },
];

const FEATURES = [
  {
    title: 'Real-Time Sign Translator',
    description:
      'Live webcam hand-tracking paired with camera failure recovery, spoken playback, and session history.',
    to: '/translator',
    cta: 'Open Translator',
    tone: 'lavender' as const,
  },
  {
    title: 'Text-to-Sign Sequence Guide',
    description:
      'Type everyday phrases and inspect step-by-step visual hand demonstrations across supported vocabulary.',
    to: '/text-to-sign',
    cta: 'Try Text-to-Sign',
    tone: 'blue' as const,
  },
  {
    title: 'Interactive Sign Learning',
    description:
      'Explore searchable gesture cards by category and test your recall with a friendly quick quiz.',
    to: '/learn',
    cta: 'Learn Signs',
    tone: 'mint' as const,
  },
  {
    title: 'One-Tap Emergency Phrases',
    description:
      'High-visibility urgent phrases that display in large type and speak aloud immediately when seconds matter.',
    to: '/emergency',
    cta: 'View Emergency Tools',
    tone: 'peach' as const,
  },
];

const USE_CASES = [
  {
    title: 'Healthcare',
    description:
      'Help patients and clinicians communicate urgent needs, pain points, and care requests clearly without waiting.',
    icon: HeartPulse,
    accentBg: 'bg-[#FED7AA]',
  },
  {
    title: 'Education',
    description:
      'Support inclusive classrooms with visual gesture guides, interactive quizzes, and two-way conversation tools.',
    icon: GraduationCap,
    accentBg: 'bg-[#BFDBFE]',
  },
  {
    title: 'Daily Life',
    description:
      'Make coffee-shop orders, transit directions, and neighborhood chats warmer and easier — online or offline.',
    icon: MessageSquareHeart,
    accentBg: 'bg-[#A7F3D0]',
  },
];

export function HomePage() {
  const [heroImgFailed, setHeroImgFailed] = useState(false);
  const [featureImgFailed, setFeatureImgFailed] = useState(false);

  return (
    <div className="space-y-20 pb-8">
      <section className="relative overflow-hidden bg-gradient-to-br from-[#EDE9FE]/70 via-[#FFFCF8] to-[#BFDBFE]/45 py-12 sm:py-16 lg:py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-12 lg:px-8">
          <div className="lg:col-span-6">
            <p className="text-sm font-bold text-[#6D28D9]">
              Inclusive AI &amp; Everyday Communication Assistant
            </p>
            <h1 className="mt-3 text-4xl font-extrabold leading-tight tracking-tight text-[#292544] sm:text-5xl [text-wrap:balance]">
              Communication has no boundaries.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-[#292544]/80 sm:text-lg">
              SignSpeak bridges sign language, quick multilingual phrase boards, two-way spoken and
              typed dialogue, and emergency communication — designed to keep working even when your
              camera or internet fails.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Button to="/translator" variant="primary" size="lg">
                <span>Start Translating</span>
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </Button>
              <Button to="/learn" variant="outline" size="lg">
                <BookOpen className="h-5 w-5" aria-hidden="true" />
                <span>Explore Sign Language</span>
              </Button>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="overflow-hidden rounded-3xl border border-[#EDE9FE] bg-white p-3 shadow-[0_20px_50px_-20px_rgba(41,37,68,0.2)]">
              {heroImgFailed ? (
                <div className="flex aspect-video w-full flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-[#EDE9FE] via-[#BFDBFE]/60 to-[#A7F3D0]/60 p-8 text-center">
                  <ShieldAlert className="h-10 w-10 text-[#6D28D9]" aria-hidden="true" />
                  <p className="mt-3 text-base font-bold text-[#292544]">
                    Expressive Hands · Inclusive Voices
                  </p>
                </div>
              ) : (
                <img
                  src="/src/assets/images/hero_signspeak_hands_1794950137805.jpg"
                  alt="Friendly pastel illustration of hands making expressive sign language gestures"
                  referrerPolicy="no-referrer"
                  onError={() => setHeroImgFailed(true)}
                  className="aspect-video w-full rounded-2xl object-cover"
                />
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Communication Dashboard (6 Required Cards) */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8" aria-labelledby="dashboard-heading">
        <div className="max-w-2xl">
          <p className="text-sm font-bold text-[#6D28D9]">All Modes in One Place</p>
          <h2
            id="dashboard-heading"
            className="mt-2 text-3xl font-extrabold tracking-tight text-[#292544]"
          >
            Communication Dashboard
          </h2>
          <p className="mt-2 text-base text-[#292544]/75">
            Choose the communication mode that fits your moment — whether you have a camera, a
            quiet room, or an offline emergency.
          </p>
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {DASHBOARD_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <Card
                key={card.title}
                tone={card.tone}
                padding="p-6"
                className="flex flex-col justify-between hover:-translate-y-0.5 hover:border-[#A78BFA]"
              >
                <div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#292544] shadow-2xs">
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <h3 className="mt-4 text-xl font-extrabold text-[#292544]">{card.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#292544]/80">
                    {card.description}
                  </p>
                </div>
                <div className="mt-5 pt-2">
                  <Button to={card.to} variant="outline" size="md" className="w-full">
                    <span>{card.cta}</span>
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Smart Quick Communication Board embedded on Main Dashboard */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <QuickMessagesBoard compactHeader />
      </div>

      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-sm font-bold text-[#6D28D9]">Simple Three-Step Flow</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-[#292544]">
            How SignSpeak works
          </h2>
          <p className="mt-3 text-base text-[#292544]/75">
            Designed to keep camera processing private in your browser while preparing structured
            hand keypoints for fast recognition.
          </p>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {HOW_IT_WORKS.map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.step} tone={item.tone}>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-bold text-[#292544]/60">
                    Step {item.step}
                  </span>
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[#292544] shadow-xs">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                </div>
                <h3 className="mt-5 text-xl font-bold text-[#292544]">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#292544]/75">
                  {item.description}
                </p>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <div className="overflow-hidden rounded-3xl border border-[#EDE9FE] bg-white p-3 shadow-[0_18px_40px_-20px_rgba(41,37,68,0.18)]">
              {featureImgFailed ? (
                <div className="flex aspect-[4/3] items-center justify-center rounded-2xl bg-[#EDE9FE]" />
              ) : (
                <img
                  src="/src/assets/images/feature_bridge_hands_1794950138605.jpg"
                  alt="Illustration of a hand with landmark nodes transforming into gentle sound waves"
                  referrerPolicy="no-referrer"
                  onError={() => setFeatureImgFailed(true)}
                  className="aspect-[4/3] w-full rounded-2xl object-cover"
                />
              )}
            </div>
          </div>

          <div className="lg:col-span-7">
            <p className="text-sm font-bold text-[#6D28D9]">Every Tool in One Warm Space</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-[#292544]">
              Built for two-way clarity
            </h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              {FEATURES.map((feature) => (
                <Card key={feature.title} tone={feature.tone} padding="p-5">
                  <h3 className="text-lg font-bold text-[#292544]">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#292544]/75">
                    {feature.description}
                  </p>
                  <div className="mt-4">
                    <Button to={feature.to} variant="outline" size="sm">
                      <span>{feature.cta}</span>
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-sm font-bold text-[#6D28D9]">Real-World Impact</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-[#292544]">
            Designed for healthcare, classrooms, and everyday moments
          </h2>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {USE_CASES.map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.title} tone="default">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl ${item.accentBg} text-[#292544]`}
                >
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </div>
                <h3 className="mt-5 text-xl font-bold text-[#292544]">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#292544]/75">
                  {item.description}
                </p>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
