'use client';

import Link from 'next/link';
import { usePipeline } from '@/context/PipelineContext';
import { STAGE_ORDER, STAGE_LABELS, STAGE_ROUTES } from '@/lib/types';

export default function StageNavigation() {
  const { state } = usePipeline();
  const currentIdx = STAGE_ORDER.indexOf(state.currentStage);

  return (
    <nav className="w-full px-6 py-4">
      <div className="flex items-center justify-between max-w-6xl mx-auto">
        <Link href="/" className="text-lg font-semibold tracking-wider gradient-text">
          THE VELVET ROPE
        </Link>
        <div className="flex items-center gap-1">
          {STAGE_ORDER.map((stage, idx) => {
            const isActive = idx === currentIdx;
            const isPast = idx < currentIdx;
            const isFuture = idx > currentIdx;

            return (
              <div key={stage} className="flex items-center">
                {idx > 0 && (
                  <div
                    className={`w-6 h-px mx-1 ${
                      isPast ? 'bg-golden/60' : 'bg-white/10'
                    }`}
                  />
                )}
                <Link
                  href={isFuture ? '#' : STAGE_ROUTES[stage]}
                  className={`text-xs px-2 py-1 rounded-full transition-all ${
                    isActive
                      ? 'bg-golden/20 text-golden border border-golden/30'
                      : isPast
                      ? 'text-golden/60 hover:text-golden/80'
                      : 'text-white/20 cursor-not-allowed'
                  }`}
                  onClick={(e) => isFuture && e.preventDefault()}
                >
                  {STAGE_LABELS[stage]}
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
