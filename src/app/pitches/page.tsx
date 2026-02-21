'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePipeline } from '@/context/PipelineContext';
import { motion } from 'framer-motion';

const TONES = ['confident', 'humble', 'humorous', 'passionate', 'analytical'] as const;

export default function PitchesPage() {
  const router = useRouter();
  const { state, dispatch } = usePipeline();
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (state.enrichedProfiles.length === 0) {
      router.push('/');
      return;
    }
    if (state.pitches.length === 0 && !generating) {
      generatePitches();
    }
  }, [state.enrichedProfiles]);

  function createFallbackPitches() {
    return state.enrichedProfiles.map((p, idx) => ({
      attendeeId: p.id,
      pitchText: `I'm ${p.firstName} ${p.lastName}, ${p.yearsExperience} years in ${p.industry}. My ${p.parsedSkills[0] || 'expertise'} isn't resume fluff — it's battle-tested. Let me in and I'll prove this event needs me.`,
      pitchTone: TONES[idx % TONES.length],
      keyArguments: [
        p.parsedSkills[0] || 'deep expertise',
        `${p.yearsExperience} years of ${p.industry} experience`,
        p.uniqueValue || `${p.title} at ${p.company}`,
      ],
      generatedAt: new Date().toISOString(),
    }));
  }

  async function generatePitches() {
    setGenerating(true);
    try {
      const res = await fetch('/api/generate-pitches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profiles: state.enrichedProfiles }),
      });
      const data = await res.json();
      if (data.pitches && data.pitches.length > 0) {
        dispatch({ type: 'SET_PITCHES', payload: data.pitches });
      } else {
        // API returned no pitches — use fallback
        dispatch({ type: 'SET_PITCHES', payload: createFallbackPitches() });
      }
    } catch (e) {
      console.error('Failed to generate pitches:', e);
      dispatch({ type: 'SET_PITCHES', payload: createFallbackPitches() });
    }
    setGenerating(false);
  }

  function goToBouncer() {
    dispatch({ type: 'SET_STAGE', payload: 'bouncer' });
    router.push('/bouncer');
  }

  const getProfile = (attendeeId: string) =>
    state.enrichedProfiles.find((p) => p.id === attendeeId);

  const toneColors: Record<string, string> = {
    confident: 'bg-sky/20 text-sky',
    humble: 'bg-park/20 text-fern',
    humorous: 'bg-golden/20 text-golden',
    passionate: 'bg-coral/20 text-coral',
    analytical: 'bg-haze/20 text-haze',
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/profiles')}
            className="px-3 py-1.5 bg-white/5 text-white/40 rounded-full hover:bg-white/10 transition-colors text-sm"
          >
            ← Back
          </button>
          <div>
            <h1 className="text-3xl font-bold gradient-text">The Plea</h1>
            <p className="text-white/40 mt-1">
              {generating
                ? 'Applicants are preparing their pitches...'
                : `${state.pitches.length} desperate pleas generated`
              }
            </p>
          </div>
        </div>
        {state.pitches.length > 0 && (
          <button
            onClick={goToBouncer}
            className="px-6 py-3 bg-golden/20 text-golden rounded-full hover:bg-golden/30 transition-colors text-sm font-medium"
          >
            Enter the Vetting Chamber →
          </button>
        )}
      </div>

      {generating && (
        <div className="glass-panel p-8 text-center">
          <div className="animate-pulse text-golden text-2xl mb-2">...</div>
          <p className="text-white/40">Claude is writing {state.enrichedProfiles.length} desperate pleas</p>
        </div>
      )}

      <div className="space-y-4">
        {state.pitches.map((pitch, idx) => {
          const profile = getProfile(pitch.attendeeId);
          if (!profile) return null;

          return (
            <motion.div
              key={pitch.attendeeId}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="glass-panel p-6"
            >
              <div className="flex items-start gap-4">
                <img
                  src={profile.avatarUrl}
                  alt={profile.firstName}
                  className="w-14 h-14 rounded-full bg-charcoal shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold">
                      {profile.firstName} {profile.lastName}
                    </h3>
                    <span className="text-white/30 text-sm">
                      {profile.title} · {profile.company}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${toneColors[pitch.pitchTone] || 'bg-white/10 text-white/40'}`}>
                      {pitch.pitchTone}
                    </span>
                  </div>
                  <p className="text-white/60 text-sm leading-relaxed italic">
                    &ldquo;{pitch.pitchText}&rdquo;
                  </p>
                  <div className="flex gap-2 mt-3">
                    {pitch.keyArguments.map((arg, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 bg-white/5 text-white/30 rounded-full">
                        {arg}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
