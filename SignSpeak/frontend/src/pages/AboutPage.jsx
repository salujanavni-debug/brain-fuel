import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { ArrowRight, RefreshCw } from 'lucide-react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { StatusIndicator } from '../components/StatusIndicator';

const PILLARS = [
  {
    title: 'Human-Centered Accessibility',
    description:
      'Every layout uses generous spacing, calm high-contrast ink on warm cream surfaces, large touch targets, and spoken + visual feedback.',
    tone: 'lavender',
  },
  {
    title: 'Privacy-First Vision Processing',
    description:
      'Raw webcam video stays on your device. MediaPipe Tasks Vision extracts geometric hand landmarks locally before sending keypoints to the backend.',
    tone: 'blue',
  },
  {
    title: 'Open Modular Stack',
    description:
      'Built on React, Tailwind CSS, FastAPI, Pydantic, TensorFlow, OpenCV, and Supabase PostgreSQL so educators and developers can extend it easily.',
    tone: 'mint',
  },
];

export function AboutPage() {
  const { health, loading, error, refetch } = useOutletContext();
  const [aboutImgFailed, setAboutImgFailed] = useState(false);

  return (
    <div className="mx-auto max-w-6xl space-y-14 px-4 py-10 sm:px-6 lg:px-8">
      {/* Mission Section */}
      <section className="grid items-center gap-10 lg:grid-cols-12">
        <div className="space-y-5 lg:col-span-6">
          <p className="text-sm font-bold text-[#6D28D9]">Our Mission &amp; Purpose</p>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#292544] sm:text-4xl [text-wrap:balance]">
            Making everyday communication effortless for Deaf and hard-of-hearing communities.
          </h1>
          <p className="text-base leading-relaxed text-[#292544]/80">
            SignSpeak was created to close communication gaps in clinics, classrooms, workplaces,
            and neighborhood spaces. Rather than replacing human interpreters, SignSpeak provides an
            immediate, approachable bridge for everyday interactions, sign language learning, and
            urgent situations.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Button to="/translator" variant="primary" size="md">
              <span>Try Live Translator</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button to="/learn" variant="outline" size="md">
              <span>Explore Sign Library</span>
            </Button>
          </div>
        </div>

        <div className="lg:col-span-6">
          <div className="overflow-hidden rounded-3xl border border-[#EDE9FE] bg-white p-3 shadow-[0_18px_45px_-20px_rgba(41,37,68,0.18)]">
            {aboutImgFailed ? (
              <div className="aspect-[4/3] w-full rounded-2xl bg-[#EDE9FE]" />
            ) : (
              <img
                src="/src/assets/images/about_mission_community_1794950137458.jpg"
                alt="Two people smiling and conversing warmly using sign language and speech waves"
                referrerPolicy="no-referrer"
                onError={() => setAboutImgFailed(true)}
                className="aspect-[4/3] w-full rounded-2xl object-cover"
              />
            )}
          </div>
        </div>
      </section>

      {/* Core Pillars */}
      <section className="grid gap-6 md:grid-cols-3">
        {PILLARS.map((pillar) => (
          <Card key={pillar.title} tone={pillar.tone}>
            <h2 className="text-lg font-extrabold text-[#292544]">{pillar.title}</h2>
            <p className="mt-2.5 text-sm leading-relaxed text-[#292544]/75">
              {pillar.description}
            </p>
          </Card>
        ))}
      </section>

      {/* Backend Connectivity Card */}
      <Card tone="default">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-[#292544]">Backend API Status (GET /api/health)</h2>
            <p className="mt-1 text-sm text-[#292544]/70">
              {health
                ? `${health.service} v${health.version} · AI pipeline: ${health.subsystems?.ai_pipeline} · Database: ${health.subsystems?.database}`
                : error || 'Checking FastAPI service availability...'}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {loading ? (
              <StatusIndicator state="pending" label="Checking API..." />
            ) : error ? (
              <StatusIndicator state="error" label="Offline" />
            ) : (
              <StatusIndicator state="ok" label="Connected" />
            )}
            <Button variant="secondary" size="sm" onClick={refetch} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
              <span>Refresh</span>
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
