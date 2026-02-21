'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePipeline } from '@/context/PipelineContext';
import type { VenueConfig, DjConfig } from '@/lib/types';

export default function VenuePage() {
  const router = useRouter();
  const { state, dispatch } = usePipeline();

  const admittedCount = state.guestList.filter((g) => g.admitted).length;

  const [venue, setVenue] = useState<VenueConfig>(state.venueConfig || {
    name: 'The Loft',
    type: 'hackathon',
    capacity: admittedCount,
    description: 'An intimate rooftop space in Manhattan with panoramic city views.',
  });

  const [dj, setDj] = useState<DjConfig>(state.djConfig || {
    theme: 'AI-Powered Solutions for Real-World Problems',
    goal: 'Generate 5 viable startup ideas that combine the attendees\' diverse expertise into novel AI applications.',
    dynamics: 'collaborative',
    rounds: 5,
    rules: ['Each person must contribute their unique domain expertise', 'Groups should have diverse skill sets'],
    icebreaker: 'What\'s the most broken process you\'ve seen in your industry that AI could fix?',
  });

  const [newRule, setNewRule] = useState('');

  function addRule() {
    if (newRule.trim()) {
      setDj({ ...dj, rules: [...dj.rules, newRule.trim()] });
      setNewRule('');
    }
  }

  function removeRule(idx: number) {
    setDj({ ...dj, rules: dj.rules.filter((_, i) => i !== idx) });
  }

  function startParty() {
    dispatch({ type: 'SET_VENUE_CONFIG', payload: venue });
    dispatch({ type: 'SET_DJ_CONFIG', payload: dj });
    dispatch({ type: 'SET_STAGE', payload: 'party' });
    router.push('/party');
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text">The Venue</h1>
          <p className="text-white/40 mt-1">Configure the space and the DJ</p>
        </div>
        <button
          onClick={startParty}
          className="px-6 py-3 bg-golden/20 text-golden rounded-full hover:bg-golden/30 transition-colors text-sm font-medium"
        >
          Start the Party →
        </button>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Venue config */}
        <div className="glass-panel p-6 space-y-4">
          <h2 className="text-lg font-semibold text-golden">Venue</h2>

          <div>
            <label className="text-white/40 text-xs uppercase tracking-wider">Name</label>
            <input
              type="text"
              value={venue.name}
              onChange={(e) => setVenue({ ...venue, name: e.target.value })}
              className="w-full mt-1 px-3 py-2 bg-white/5 rounded-xl border border-white/10 text-linen focus:outline-none focus:border-golden/30"
            />
          </div>

          <div>
            <label className="text-white/40 text-xs uppercase tracking-wider">Type</label>
            <select
              value={venue.type}
              onChange={(e) => setVenue({ ...venue, type: e.target.value as VenueConfig['type'] })}
              className="w-full mt-1 px-3 py-2 bg-white/5 rounded-xl border border-white/10 text-linen focus:outline-none focus:border-golden/30"
            >
              <option value="hackathon">Hackathon</option>
              <option value="conference">Conference</option>
              <option value="workshop">Workshop</option>
              <option value="networking">Networking</option>
              <option value="roundtable">Roundtable</option>
            </select>
          </div>

          <div>
            <label className="text-white/40 text-xs uppercase tracking-wider">Capacity: {admittedCount}</label>
          </div>

          <div>
            <label className="text-white/40 text-xs uppercase tracking-wider">Description</label>
            <textarea
              value={venue.description}
              onChange={(e) => setVenue({ ...venue, description: e.target.value })}
              rows={3}
              className="w-full mt-1 px-3 py-2 bg-white/5 rounded-xl border border-white/10 text-linen focus:outline-none focus:border-golden/30 resize-none"
            />
          </div>
        </div>

        {/* DJ config */}
        <div className="glass-panel p-6 space-y-4">
          <h2 className="text-lg font-semibold text-golden">The DJ</h2>

          <div>
            <label className="text-white/40 text-xs uppercase tracking-wider">Theme</label>
            <input
              type="text"
              value={dj.theme}
              onChange={(e) => setDj({ ...dj, theme: e.target.value })}
              className="w-full mt-1 px-3 py-2 bg-white/5 rounded-xl border border-white/10 text-linen focus:outline-none focus:border-golden/30"
            />
          </div>

          <div>
            <label className="text-white/40 text-xs uppercase tracking-wider">Goal (what should this event produce?)</label>
            <textarea
              value={dj.goal}
              onChange={(e) => setDj({ ...dj, goal: e.target.value })}
              rows={3}
              className="w-full mt-1 px-3 py-2 bg-white/5 rounded-xl border border-white/10 text-linen focus:outline-none focus:border-golden/30 resize-none"
            />
          </div>

          <div>
            <label className="text-white/40 text-xs uppercase tracking-wider">Dynamics</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {(['collaborative', 'competitive', 'speed-dating', 'open-floor', 'structured'] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setDj({ ...dj, dynamics: d })}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    dj.dynamics === d
                      ? 'bg-golden/20 text-golden border border-golden/30'
                      : 'bg-white/5 text-white/40 hover:bg-white/10'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-white/40 text-xs uppercase tracking-wider">Rounds: {dj.rounds}</label>
            <input
              type="range"
              min={2}
              max={10}
              value={dj.rounds}
              onChange={(e) => setDj({ ...dj, rounds: parseInt(e.target.value) })}
              className="w-full mt-1 accent-golden"
            />
          </div>

          <div>
            <label className="text-white/40 text-xs uppercase tracking-wider">Icebreaker</label>
            <input
              type="text"
              value={dj.icebreaker}
              onChange={(e) => setDj({ ...dj, icebreaker: e.target.value })}
              className="w-full mt-1 px-3 py-2 bg-white/5 rounded-xl border border-white/10 text-linen focus:outline-none focus:border-golden/30"
            />
          </div>

          <div>
            <label className="text-white/40 text-xs uppercase tracking-wider">Rules</label>
            <div className="space-y-1 mt-1">
              {dj.rules.map((rule, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="flex-1 text-sm text-white/50">{rule}</span>
                  <button onClick={() => removeRule(idx)} className="text-white/20 hover:text-coral text-xs">×</button>
                </div>
              ))}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newRule}
                  onChange={(e) => setNewRule(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addRule()}
                  placeholder="Add rule..."
                  className="flex-1 px-3 py-1.5 bg-white/5 rounded-xl border border-white/10 text-linen text-sm focus:outline-none focus:border-golden/30"
                />
                <button onClick={addRule} className="text-golden text-sm hover:text-golden/80">+</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
