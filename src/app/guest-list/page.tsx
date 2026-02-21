'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePipeline } from '@/context/PipelineContext';
import { motion } from 'framer-motion';
import type { GuestListEntry } from '@/lib/types';

export default function GuestListPage() {
  const router = useRouter();
  const { state, dispatch } = usePipeline();
  const [capacity, setCapacity] = useState(Math.ceil(state.enrichedProfiles.length * 0.5));

  useEffect(() => {
    if (state.biometricResults.length === 0) {
      router.push('/');
    }
  }, [state.biometricResults, router]);

  // Build ranked list
  const ranked: GuestListEntry[] = state.enrichedProfiles
    .map((profile) => {
      const result = state.biometricResults.find((r) => r.attendeeId === profile.id);
      return {
        attendee: profile,
        biometricResult: result || {
          attendeeId: profile.id,
          snapshots: [],
          yesnessScore: 50,
          peakPositive: 0,
          peakNegative: 0,
          engagementLevel: 50,
          durationMs: 0,
        },
        rank: 0,
        admitted: false,
      };
    })
    .sort((a, b) => b.biometricResult.yesnessScore - a.biometricResult.yesnessScore)
    .map((entry, idx) => ({
      ...entry,
      rank: idx + 1,
      admitted: idx < capacity,
    }));

  function goToVenue() {
    dispatch({ type: 'SET_GUEST_LIST', payload: ranked });
    dispatch({ type: 'SET_STAGE', payload: 'venue' });
    router.push('/venue');
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text">The List</h1>
          <p className="text-white/40 mt-1">
            {capacity} of {ranked.length} applicants will enter
          </p>
        </div>
        <button
          onClick={goToVenue}
          className="px-6 py-3 bg-golden/20 text-golden rounded-full hover:bg-golden/30 transition-colors text-sm font-medium"
        >
          Configure the Venue →
        </button>
      </div>

      {/* Capacity slider */}
      <div className="glass-panel p-4 flex items-center gap-4">
        <span className="text-white/40 text-sm">Capacity:</span>
        <input
          type="range"
          min={1}
          max={ranked.length}
          value={capacity}
          onChange={(e) => setCapacity(parseInt(e.target.value))}
          className="flex-1 accent-golden"
        />
        <span className="text-golden font-mono text-lg w-12 text-right">{capacity}</span>
      </div>

      {/* Ranked list */}
      <div className="space-y-2">
        {ranked.map((entry, idx) => {
          const isAdmitted = idx < capacity;
          const isCutoff = idx === capacity;
          const score = entry.biometricResult.yesnessScore;
          const scoreColor = score >= 70 ? 'text-park' : score >= 40 ? 'text-golden' : 'text-coral';
          const barColor = score >= 70 ? 'bg-park' : score >= 40 ? 'bg-golden' : 'bg-coral';

          return (
            <div key={entry.attendee.id}>
              {isCutoff && (
                <div className="flex items-center gap-4 py-3">
                  <div className="flex-1 h-px bg-coral/30" />
                  <span className="text-coral text-xs uppercase tracking-wider">velvet rope</span>
                  <div className="flex-1 h-px bg-coral/30" />
                </div>
              )}
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.03 }}
                className={`glass-panel p-4 flex items-center gap-4 ${
                  !isAdmitted ? 'opacity-40' : ''
                }`}
              >
                <span className="text-white/20 font-mono text-sm w-8">#{entry.rank}</span>
                <img
                  src={entry.attendee.avatarUrl}
                  alt={entry.attendee.firstName}
                  className="w-10 h-10 rounded-full bg-charcoal"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {entry.attendee.firstName} {entry.attendee.lastName}
                    </span>
                    <span className="text-white/30 text-sm truncate">
                      {entry.attendee.title} · {entry.attendee.company}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${barColor}`} style={{ width: `${score}%` }} />
                  </div>
                  <span className={`font-mono text-sm w-10 text-right ${scoreColor}`}>
                    {score}%
                  </span>
                  <span className="text-lg">
                    {isAdmitted ? '✓' : '×'}
                  </span>
                </div>
              </motion.div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
