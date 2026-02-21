'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePipeline } from '@/context/PipelineContext';
import { getAvatarUrl } from '@/lib/avatar';
import { motion } from 'framer-motion';
import type { EnrichedProfile } from '@/lib/types';

export default function ProfilesPage() {
  const router = useRouter();
  const { state, dispatch } = usePipeline();
  const [loading, setLoading] = useState(false);
  const [enriching, setEnriching] = useState(false);

  useEffect(() => {
    if (state.rawAttendees.length === 0) {
      router.push('/');
    }
  }, [state.rawAttendees, router]);

  // Auto-enrich if not already done
  useEffect(() => {
    if (state.rawAttendees.length > 0 && state.enrichedProfiles.length === 0 && !enriching) {
      enrichProfiles();
    }
  }, [state.rawAttendees]);

  function createFallbackProfiles(attendees: typeof state.rawAttendees): EnrichedProfile[] {
    return attendees.map((a) => ({
      ...a,
      parsedSkills: a.skills.split(';').map((s) => s.trim()).filter(Boolean),
      parsedInterests: a.interests.split(';').map((s) => s.trim()).filter(Boolean),
      parsedEventHistory: a.eventHistory.split(';').map((s) => s.trim()).filter(Boolean),
      avatarUrl: getAvatarUrl(a.email),
      profileSummary: a.bio,
      uniqueValue: `${a.title} at ${a.company} with ${a.yearsExperience} years in ${a.industry}`,
      potentialContributions: a.skills.split(';').slice(0, 3).map((s) => s.trim()),
    }));
  }

  async function enrichProfiles() {
    setEnriching(true);
    try {
      const res = await fetch('/api/generate-profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attendees: state.rawAttendees }),
      });
      const data = await res.json();
      if (data.enrichedProfiles && data.enrichedProfiles.length > 0) {
        dispatch({ type: 'SET_ENRICHED_PROFILES', payload: data.enrichedProfiles });
      } else {
        // API returned no profiles (e.g. missing API key) — use fallback
        dispatch({ type: 'SET_ENRICHED_PROFILES', payload: createFallbackProfiles(state.rawAttendees) });
      }
    } catch (e) {
      console.error('Failed to enrich profiles:', e);
      // Fallback: create basic enriched profiles without Claude
      dispatch({ type: 'SET_ENRICHED_PROFILES', payload: createFallbackProfiles(state.rawAttendees) });
    }
    setEnriching(false);
  }

  const profiles = state.enrichedProfiles.length > 0
    ? state.enrichedProfiles
    : [];

  function goToPitches() {
    dispatch({ type: 'SET_STAGE', payload: 'pitches' });
    router.push('/pitches');
  }

  if (state.rawAttendees.length === 0) return null;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/')}
            className="px-3 py-1.5 bg-white/5 text-white/40 rounded-full hover:bg-white/10 transition-colors text-sm"
          >
            ← Back
          </button>
          <div>
            <h1 className="text-3xl font-bold gradient-text">Dossiers</h1>
            <p className="text-white/40 mt-1">
              {enriching
                ? 'Building profiles with AI...'
                : `${profiles.length} applicants in the queue`
              }
            </p>
          </div>
        </div>
        {profiles.length > 0 && (
          <button
            onClick={goToPitches}
            className="px-6 py-3 bg-golden/20 text-golden rounded-full hover:bg-golden/30 transition-colors text-sm font-medium"
          >
            Generate Pitches →
          </button>
        )}
      </div>

      {enriching && (
        <div className="glass-panel p-8 text-center">
          <div className="animate-pulse text-golden text-2xl mb-2">...</div>
          <p className="text-white/40">Claude is reading through {state.rawAttendees.length} applications</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {profiles.map((profile, idx) => (
          <motion.div
            key={profile.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="glass-panel p-5 space-y-3"
          >
            <div className="flex items-center gap-3">
              <img
                src={profile.avatarUrl}
                alt={`${profile.firstName} ${profile.lastName}`}
                className="w-12 h-12 rounded-full bg-charcoal"
              />
              <div>
                <h3 className="font-semibold text-linen">
                  {profile.firstName} {profile.lastName}
                </h3>
                <p className="text-white/40 text-sm">
                  {profile.title} · {profile.company}
                </p>
              </div>
              <div className="ml-auto">
                <span className={`text-xs px-2 py-1 rounded-full ${
                  profile.connectionStrength === 'hot' ? 'bg-coral/20 text-coral' :
                  profile.connectionStrength === 'warm' ? 'bg-golden/20 text-golden' :
                  'bg-white/5 text-white/30'
                }`}>
                  {profile.connectionStrength}
                </span>
              </div>
            </div>
            <p className="text-white/50 text-sm leading-relaxed line-clamp-2">
              {profile.profileSummary}
            </p>
            <div className="flex flex-wrap gap-1">
              {profile.parsedSkills.slice(0, 4).map((skill) => (
                <span key={skill} className="text-xs px-2 py-0.5 bg-sky/10 text-sky/70 rounded-full">
                  {skill}
                </span>
              ))}
            </div>
            <div className="flex items-center justify-between text-xs text-white/25">
              <span>{profile.industry}</span>
              <span>{profile.yearsExperience}y exp</span>
              <span>influence: {profile.influenceScore}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
