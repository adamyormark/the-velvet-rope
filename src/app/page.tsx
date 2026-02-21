'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { usePipeline } from '@/context/PipelineContext';
import { parseCsv } from '@/lib/csv-parser';
import { motion } from 'framer-motion';

export default function HomePage() {
  const router = useRouter();
  const { state, dispatch } = usePipeline();
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const processFile = useCallback(async (file: File) => {
    setError('');
    setLoading(true);
    try {
      const text = await file.text();
      const attendees = parseCsv(text);
      if (attendees.length === 0) {
        setError('No valid attendees found in CSV.');
        setLoading(false);
        return;
      }
      dispatch({ type: 'SET_RAW_ATTENDEES', payload: attendees });
      dispatch({ type: 'SET_STAGE', payload: 'profiles' });
      router.push('/profiles');
    } catch (e) {
      setError('Failed to parse CSV file.');
      setLoading(false);
    }
  }, [dispatch, router]);

  const DEMO_APPLICANT_COUNT = 15;

  const loadSampleData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/sample-crm-data.csv');
      const text = await res.text();
      const attendees = parseCsv(text).slice(0, DEMO_APPLICANT_COUNT);
      dispatch({ type: 'SET_RAW_ATTENDEES', payload: attendees });
      dispatch({ type: 'SET_STAGE', payload: 'profiles' });
      router.push('/profiles');
    } catch {
      setError('Failed to load sample data.');
      setLoading(false);
    }
  }, [dispatch, router]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.csv')) {
      processFile(file);
    } else {
      setError('Please drop a .csv file.');
    }
  }, [processFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] gap-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center"
      >
        <h1 className="text-6xl font-bold gradient-text mb-4 tracking-tight">
          THE VELVET ROPE
        </h1>
        <p className="text-white/40 text-lg max-w-xl mx-auto">
          Your face decides who gets in. AI simulates what happens next.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="w-full max-w-lg"
      >
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`glass-panel p-12 text-center cursor-pointer transition-all ${
            isDragging ? 'border-golden/50 yesness-glow' : ''
          }`}
        >
          <div className="text-4xl mb-4 opacity-40">
            {loading ? '...' : '↑'}
          </div>
          <p className="text-white/60 mb-4">
            {loading ? 'Processing applicants...' : 'Drop your CRM export (.csv) here'}
          </p>
          {!loading && (
            <>
              <label className="inline-block px-6 py-2 bg-golden/20 text-golden rounded-full text-sm cursor-pointer hover:bg-golden/30 transition-colors">
                Choose File
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileInput}
                />
              </label>
              <div className="mt-6 pt-6 border-t border-white/5">
                <button
                  onClick={loadSampleData}
                  className="text-white/30 hover:text-golden/60 text-sm transition-colors"
                >
                  or load {DEMO_APPLICANT_COUNT} sample applicants →
                </button>
              </div>
            </>
          )}
          {error && (
            <p className="mt-4 text-coral text-sm">{error}</p>
          )}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 0.6 }}
        className="flex gap-8 text-center text-white/20 text-xs"
      >
        {['Upload CRM', 'Watch Pitches', 'React Naturally', 'See Who Gets In', 'Simulate the Event'].map((step, i) => (
          <div key={step} className="flex items-center gap-2">
            {i > 0 && <span className="text-white/10">→</span>}
            <span>{step}</span>
          </div>
        ))}
      </motion.div>
    </div>
  );
}
