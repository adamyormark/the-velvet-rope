'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { usePipeline } from '@/context/PipelineContext';
import { motion, AnimatePresence } from 'framer-motion';
import type { SimulationResult, SimulationRound } from '@/lib/types';

export default function PartyPage() {
  const router = useRouter();
  const { state, dispatch } = usePipeline();
  const [simulating, setSimulating] = useState(false);
  const [currentRound, setCurrentRound] = useState<SimulationRound | null>(null);
  const [allRounds, setAllRounds] = useState<SimulationRound[]>([]);
  const [result, setResult] = useState<SimulationResult | null>(state.simulationResult);
  const [narrative, setNarrative] = useState<string[]>([]);
  const logRef = useRef<HTMLDivElement>(null);

  const admitted = state.guestList.filter((g) => g.admitted);
  const profiles = admitted.map((g) => g.attendee);

  useEffect(() => {
    if (!state.venueConfig || !state.djConfig || admitted.length === 0) {
      router.push('/');
      return;
    }
    if (!result && !simulating) {
      runSimulation();
    }
  }, []);

  function createFallbackSimulation(): SimulationResult {
    const numRounds = state.djConfig?.rounds || 5;
    const rounds = [];

    // Create groups from profiles
    const groupSize = Math.max(2, Math.ceil(profiles.length / 3));
    const groups: { id: string; memberIds: string[]; topic: string; output: string; cohesion: number }[] = [];
    for (let g = 0; g < Math.ceil(profiles.length / groupSize); g++) {
      const members = profiles.slice(g * groupSize, (g + 1) * groupSize);
      if (members.length > 0) {
        groups.push({
          id: `g${g + 1}`,
          memberIds: members.map((m) => m.id),
          topic: `Exploring ${members[0]?.parsedInterests?.[0] || 'AI applications'} and ${members[1]?.parsedInterests?.[0] || 'innovation'}`,
          output: `A concept combining ${members.map((m) => m.parsedSkills?.[0] || m.industry).join(', ')}`,
          cohesion: 60 + Math.floor(Math.random() * 30),
        });
      }
    }

    for (let r = 0; r < numRounds; r++) {
      rounds.push({
        roundNumber: r + 1,
        narrative: `Round ${r + 1}: The attendees continue to mingle and share ideas. Groups are forming around shared interests and complementary skills. Energy in the room is ${r < 2 ? 'building' : r < 4 ? 'at its peak' : 'settling into productive focus'}.`,
        groups,
        events: [{
          type: 'group_formed' as const,
          description: `New connections forming in round ${r + 1}`,
          involvedAgentIds: profiles.slice(0, 2).map((p) => p.id),
        }],
        agentStates: profiles.map((p, idx) => {
          const groupIdx = Math.floor(idx / groupSize);
          const memberIdx = idx % groupSize;
          return {
            attendeeId: p.id,
            position: {
              x: (groupIdx * 0.3 + 0.1 + memberIdx * 0.05) % 1,
              y: (0.2 + groupIdx * 0.25 + Math.sin(r + idx) * 0.05),
            },
            currentGroupId: groups[groupIdx]?.id || null,
            mood: ['excited', 'curious', 'engaged', 'focused', 'energized'][r % 5],
            energyLevel: 80 - r * 3 + Math.floor(Math.random() * 10),
            satisfaction: 50 + r * 8 + Math.floor(Math.random() * 10),
          };
        }),
      });
    }

    return {
      rounds,
      finalGroups: groups,
      aggregatedOutput: `The event produced ${groups.length} collaborative groups. Attendees explored intersections of ${profiles.slice(0, 3).map((p) => p.industry).join(', ')} and more. Key themes included AI applications, cross-industry collaboration, and innovative approaches to shared challenges.`,
      totalRounds: numRounds,
    };
  }

  async function runSimulation() {
    setSimulating(true);
    try {
      const res = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          admittedAttendees: profiles,
          venueConfig: state.venueConfig,
          djConfig: state.djConfig,
        }),
      });

      const data = await res.json();

      const simData: SimulationResult = data.rounds ? data : createFallbackSimulation();

      // Animate rounds one by one
      for (let i = 0; i < simData.rounds.length; i++) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        setCurrentRound(simData.rounds[i]);
        setAllRounds((prev) => [...prev, simData.rounds[i]]);
        setNarrative((prev) => [...prev, simData.rounds[i].narrative]);
      }

      setResult(simData);
      dispatch({ type: 'SET_SIMULATION_RESULT', payload: simData });
    } catch (e) {
      console.error('Simulation failed:', e);
      // Use fallback simulation
      const fallback = createFallbackSimulation();
      for (let i = 0; i < fallback.rounds.length; i++) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        setCurrentRound(fallback.rounds[i]);
        setAllRounds((prev) => [...prev, fallback.rounds[i]]);
        setNarrative((prev) => [...prev, fallback.rounds[i].narrative]);
      }
      setResult(fallback);
      dispatch({ type: 'SET_SIMULATION_RESULT', payload: fallback });
    }
    setSimulating(false);
  }

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [narrative]);

  function rerunFromVenue() {
    dispatch({ type: 'SET_SIMULATION_RESULT', payload: null as unknown as SimulationResult });
    dispatch({ type: 'SET_STAGE', payload: 'venue' });
    router.push('/venue');
  }

  const getProfile = (id: string) => profiles.find((p) => p.id === id);

  // Cluster colors
  const clusterColors = ['#FF6B35', '#48CAE4', '#52B788', '#FFB088', '#B8D9F0', '#A8D4A2'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text">The Floor</h1>
          <p className="text-white/40 mt-1">
            {simulating
              ? `Simulating round ${allRounds.length + 1} of ${state.djConfig?.rounds || '?'}...`
              : result ? 'Simulation complete' : 'Preparing simulation...'
            }
          </p>
        </div>
        {result && (
          <button
            onClick={rerunFromVenue}
            className="px-4 py-2 bg-white/5 text-white/50 rounded-full hover:bg-white/10 transition-colors text-sm"
          >
            Re-run with different DJ →
          </button>
        )}
      </div>

      <div className="grid grid-cols-5 gap-6">
        {/* Venue visualization - 3 cols */}
        <div className="col-span-3 glass-panel p-6 relative" style={{ minHeight: '500px' }}>
          {/* Agent dots */}
          <AnimatePresence>
            {currentRound?.agentStates.map((agent) => {
              const profile = getProfile(agent.attendeeId);
              const group = currentRound.groups.find((g) => g.memberIds.includes(agent.attendeeId));
              const groupIdx = group ? currentRound.groups.indexOf(group) : -1;
              const color = groupIdx >= 0 ? clusterColors[groupIdx % clusterColors.length] : '#ffffff30';

              return (
                <motion.div
                  key={agent.attendeeId}
                  initial={{ opacity: 0 }}
                  animate={{
                    opacity: 1,
                    left: `${agent.position.x * 85 + 5}%`,
                    top: `${agent.position.y * 85 + 5}%`,
                  }}
                  transition={{ type: 'spring', stiffness: 80, damping: 20 }}
                  className="absolute flex flex-col items-center"
                  style={{ transform: 'translate(-50%, -50%)' }}
                >
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{
                      backgroundColor: color,
                      boxShadow: `0 0 12px ${color}40`,
                    }}
                  />
                  <span className="text-[9px] text-white/40 mt-0.5 whitespace-nowrap">
                    {profile?.firstName}
                  </span>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Group labels */}
          {currentRound?.groups.map((group, idx) => {
            const members = group.memberIds.map((id) =>
              currentRound.agentStates.find((a) => a.attendeeId === id)
            ).filter(Boolean);
            if (members.length === 0) return null;
            const avgX = members.reduce((s, m) => s + (m?.position.x || 0), 0) / members.length;
            const avgY = members.reduce((s, m) => s + (m?.position.y || 0), 0) / members.length;
            const color = clusterColors[idx % clusterColors.length];

            return (
              <motion.div
                key={group.id}
                initial={{ opacity: 0 }}
                animate={{
                  opacity: 0.3,
                  left: `${avgX * 85 + 5}%`,
                  top: `${avgY * 85 + 5}%`,
                }}
                className="absolute pointer-events-none"
                style={{
                  transform: 'translate(-50%, -50%)',
                  width: `${Math.max(members.length * 30, 60)}px`,
                  height: `${Math.max(members.length * 30, 60)}px`,
                  borderRadius: '50%',
                  backgroundColor: `${color}10`,
                  border: `1px solid ${color}20`,
                }}
              />
            );
          })}

          {!currentRound && (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-white/20 animate-pulse">Guests are arriving...</p>
            </div>
          )}
        </div>

        {/* Simulation log - 2 cols */}
        <div className="col-span-2 glass-panel p-6 flex flex-col" style={{ maxHeight: '500px' }}>
          <h3 className="text-sm font-semibold text-golden mb-3">Live Feed</h3>
          <div ref={logRef} className="flex-1 overflow-y-auto space-y-3 text-sm">
            {narrative.map((text, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-white/3 rounded-xl"
              >
                <span className="text-golden/60 text-xs">Round {idx + 1}</span>
                <p className="text-white/60 mt-1">{text}</p>
              </motion.div>
            ))}
            {simulating && (
              <div className="text-white/20 animate-pulse">...</div>
            )}
          </div>

          {/* Group outputs */}
          {currentRound?.groups && currentRound.groups.length > 0 && (
            <div className="mt-4 pt-4 border-t border-white/5 space-y-2">
              <h4 className="text-xs text-white/30 uppercase tracking-wider">Active Groups</h4>
              {currentRound.groups.map((group, idx) => (
                <div key={group.id} className="flex items-start gap-2 text-xs">
                  <div
                    className="w-2 h-2 rounded-full mt-1 shrink-0"
                    style={{ backgroundColor: clusterColors[idx % clusterColors.length] }}
                  />
                  <div>
                    <span className="text-white/50">{group.memberIds.length} people — </span>
                    <span className="text-white/30">{group.topic}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* DJ controls readout */}
      <div className="glass-panel p-4 flex items-center gap-6 text-xs text-white/30">
        <span>DJ: <span className="text-golden">{state.djConfig?.dynamics}</span></span>
        <span>Theme: <span className="text-white/50">{state.djConfig?.theme}</span></span>
        <span>Round: <span className="text-golden">{allRounds.length}/{state.djConfig?.rounds || '?'}</span></span>
        <span>Agents: <span className="text-white/50">{profiles.length}</span></span>
        <span>Groups: <span className="text-white/50">{currentRound?.groups.length || 0}</span></span>
      </div>

      {/* Aggregated output when complete */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel p-6 space-y-4"
        >
          <h3 className="text-lg font-semibold gradient-text">Simulation Output</h3>
          <p className="text-white/60 leading-relaxed">{result.aggregatedOutput}</p>

          {result.finalGroups && result.finalGroups.length > 0 && (
            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/5">
              {result.finalGroups.map((group, idx) => (
                <div key={group.id} className="p-3 bg-white/3 rounded-xl">
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: clusterColors[idx % clusterColors.length] }}
                    />
                    <span className="text-white/50 text-xs">{group.memberIds.length} members</span>
                    <span className="text-white/20 text-xs">· cohesion {group.cohesion}%</span>
                  </div>
                  <p className="text-white/40 text-sm">{group.output}</p>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={rerunFromVenue}
              className="px-4 py-2 bg-golden/20 text-golden rounded-full hover:bg-golden/30 transition-colors text-sm"
            >
              Change the DJ & Re-run
            </button>
            <button
              onClick={() => {
                dispatch({ type: 'SET_SIMULATION_RESULT', payload: null as unknown as SimulationResult });
                dispatch({ type: 'SET_STAGE', payload: 'guest-list' });
                router.push('/guest-list');
              }}
              className="px-4 py-2 bg-white/5 text-white/50 rounded-full hover:bg-white/10 transition-colors text-sm"
            >
              Change Guest List & Re-run
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
