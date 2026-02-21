'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { usePipeline } from '@/context/PipelineContext';
import { motion, AnimatePresence } from 'framer-motion';
import type { FaceExpression, ExpressionSnapshot, BiometricResult } from '@/lib/types';
import {
  calculateYesnessSignal,
  calculateFinalScore,
  getDominantExpression,
} from '@/lib/yesness-calculator';

// Dynamic import for face-api to avoid SSR issues
let faceapi: typeof import('face-api.js') | null = null;

export default function BouncerPage() {
  const router = useRouter();
  const { state, dispatch } = usePipeline();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [webcamReady, setWebcamReady] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [snapshots, setSnapshots] = useState<ExpressionSnapshot[]>([]);
  const [currentExpressions, setCurrentExpressions] = useState<Record<FaceExpression, number> | null>(null);
  const [currentYesness, setCurrentYesness] = useState(50);
  const [pitchWords, setPitchWords] = useState<string[]>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [showVettedOverlay, setShowVettedOverlay] = useState(false);
  const [vettedScore, setVettedScore] = useState(0);
  const detectionInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const profiles = state.enrichedProfiles;
  const pitches = state.pitches;

  useEffect(() => {
    if (profiles.length === 0 || pitches.length === 0) {
      router.push('/');
      return;
    }
    loadFaceApi();
    startWebcam();
    return () => {
      if (detectionInterval.current) clearInterval(detectionInterval.current);
      stopWebcam();
    };
  }, []);

  async function loadFaceApi() {
    try {
      faceapi = await import('face-api.js');
      await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
      await faceapi.nets.faceExpressionNet.loadFromUri('/models');
      setModelsLoaded(true);
    } catch (e) {
      console.error('Failed to load face-api models:', e);
      // Continue without face detection — use random data
      setModelsLoaded(true);
    }
  }

  async function startWebcam() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 320, height: 240 } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setWebcamReady(true);
      }
    } catch {
      console.error('Webcam access denied');
      setWebcamReady(true); // Continue without webcam
    }
  }

  function stopWebcam() {
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
    }
  }

  const startDetectionLoop = useCallback(() => {
    if (detectionInterval.current) clearInterval(detectionInterval.current);
    detectionInterval.current = setInterval(async () => {
      if (!videoRef.current || !faceapi) {
        // Generate synthetic expression data if no face-api
        const synth: Record<FaceExpression, number> = {
          neutral: 0.5 + Math.random() * 0.3,
          happy: Math.random() * 0.4,
          surprised: Math.random() * 0.2,
          sad: Math.random() * 0.1,
          angry: Math.random() * 0.05,
          disgusted: Math.random() * 0.05,
          fearful: Math.random() * 0.05,
        };
        processExpressions(synth);
        return;
      }

      try {
        const detections = await faceapi
          .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
          .withFaceExpressions();

        if (detections) {
          processExpressions(detections.expressions as unknown as Record<FaceExpression, number>);
        }
      } catch {}
    }, 250);
  }, []);

  function processExpressions(expressions: Record<FaceExpression, number>) {
    setCurrentExpressions(expressions);
    const signal = calculateYesnessSignal(expressions);
    const snapshot: ExpressionSnapshot = {
      timestamp: Date.now(),
      expressions,
      dominantExpression: getDominantExpression(expressions),
      yesnessSignal: signal,
    };
    setSnapshots((prev) => {
      const updated = [...prev, snapshot];
      const score = calculateFinalScore(updated);
      setCurrentYesness(score);
      return updated;
    });
  }

  function startPitch(index: number) {
    const pitch = pitches.find((p) => p.attendeeId === profiles[index]?.id);
    if (!pitch) return;

    setIsPlaying(true);
    setSnapshots([]);
    setCurrentYesness(50);
    setCurrentWordIndex(0);

    const words = pitch.pitchText.split(/\s+/);
    setPitchWords(words);

    startDetectionLoop();

    // Use Speech Synthesis with upgraded voice
    const utterance = new SpeechSynthesisUtterance(pitch.pitchText);
    utterance.rate = 0.92;
    utterance.pitch = 1.0 + Math.random() * 0.2;

    // Select a premium voice if available
    const voices = window.speechSynthesis.getVoices();
    const preferredVoices = [
      'Samantha', 'Daniel', 'Karen', 'Moira', 'Alex', 'Tessa',
      'Google UK English Male', 'Google UK English Female',
      'Google US English', 'Microsoft Zira', 'Microsoft David',
    ];
    const premiumVoice = voices.find((v) =>
      preferredVoices.some((name) => v.name.includes(name))
    ) || voices.find((v) => v.lang.startsWith('en') && !v.name.includes('compact'));
    if (premiumVoice) utterance.voice = premiumVoice;

    // Track word progress
    let wordIdx = 0;
    utterance.onboundary = (event) => {
      if (event.name === 'word') {
        wordIdx++;
        setCurrentWordIndex(wordIdx);
      }
    };

    utterance.onend = () => {
      finishPitch(index);
    };

    utterance.onerror = () => {
      // TTS failed, simulate timing
      const duration = words.length * 200;
      let elapsed = 0;
      const wordTimer = setInterval(() => {
        elapsed += 200;
        setCurrentWordIndex(Math.floor((elapsed / duration) * words.length));
        if (elapsed >= duration) {
          clearInterval(wordTimer);
          finishPitch(index);
        }
      }, 200);
    };

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  function finishPitch(index: number) {
    if (detectionInterval.current) clearInterval(detectionInterval.current);
    setIsPlaying(false);

    const score = calculateFinalScore(snapshots);
    const result: BiometricResult = {
      attendeeId: profiles[index].id,
      snapshots: [...snapshots],
      yesnessScore: score,
      peakPositive: Math.max(...snapshots.map((s) => s.yesnessSignal), 0),
      peakNegative: Math.min(...snapshots.map((s) => s.yesnessSignal), 0),
      engagementLevel: snapshots.length > 0
        ? Math.round(snapshots.reduce((sum, s) => sum + Math.abs(s.yesnessSignal), 0) / snapshots.length * 100)
        : 50,
      durationMs: snapshots.length * 250,
    };

    dispatch({ type: 'ADD_BIOMETRIC_RESULT', payload: result });

    // Show vetted overlay before advancing
    setVettedScore(score);
    setShowVettedOverlay(true);

    setTimeout(() => {
      setShowVettedOverlay(false);
      if (index + 1 < profiles.length) {
        setCurrentIndex(index + 1);
      } else {
        setCompleted(true);
      }
    }, 3000);
  }

  function goToGuestList() {
    dispatch({ type: 'SET_STAGE', payload: 'guest-list' });
    router.push('/guest-list');
  }

  // Auto-start pitch when index changes
  useEffect(() => {
    if (webcamReady && modelsLoaded && !isPlaying && currentIndex < profiles.length && !completed) {
      const timer = setTimeout(() => startPitch(currentIndex), 1000);
      return () => clearTimeout(timer);
    }
  }, [currentIndex, webcamReady, modelsLoaded]);

  const currentProfile = profiles[currentIndex];
  const currentPitch = pitches.find((p) => p.attendeeId === currentProfile?.id);

  if (!currentProfile) return null;

  const yesnessColor = currentYesness >= 70 ? 'text-park' : currentYesness >= 40 ? 'text-golden' : 'text-coral';
  const yesnessBarColor = currentYesness >= 70 ? 'bg-park' : currentYesness >= 40 ? 'bg-golden' : 'bg-coral';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => { window.speechSynthesis.cancel(); stopWebcam(); router.push('/pitches'); }}
            className="px-3 py-1.5 bg-white/5 text-white/40 rounded-full hover:bg-white/10 transition-colors text-sm"
          >
            ← Back
          </button>
          <div>
            <h1 className="text-3xl font-bold gradient-text">The Bouncer</h1>
            <p className="text-white/40 mt-1">
              {completed
                ? 'Vetting complete.'
                : `Vetting applicant ${currentIndex + 1} of ${profiles.length}`
              }
            </p>
          </div>
        </div>
        {completed && (
          <button
            onClick={goToGuestList}
            className="px-6 py-3 bg-golden/20 text-golden rounded-full hover:bg-golden/30 transition-colors text-sm font-medium"
          >
            See the Guest List →
          </button>
        )}
      </div>

      {/* Vetted overlay transition */}
      <AnimatePresence>
        {showVettedOverlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-navy/90 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              className="text-center space-y-4"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 300 }}
                className={`text-8xl font-bold tabular-nums ${
                  vettedScore >= 70 ? 'text-park' : vettedScore >= 40 ? 'text-golden' : 'text-coral'
                }`}
              >
                {vettedScore}%
              </motion.div>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-white/60 text-xl"
              >
                {currentProfile.firstName} {currentProfile.lastName}
              </motion.p>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className={`text-2xl font-semibold uppercase tracking-widest ${
                  vettedScore >= 60 ? 'text-park' : 'text-coral'
                }`}
              >
                {vettedScore >= 60 ? 'VETTED' : 'REJECTED'}
              </motion.p>
              <motion.div
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 2.5, ease: 'linear' }}
                className="h-1 bg-golden/40 rounded-full mx-auto max-w-xs"
              />
              {currentIndex + 1 < profiles.length && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.5 }}
                  className="text-white/30 text-sm"
                >
                  Next: {profiles[currentIndex + 1]?.firstName} {profiles[currentIndex + 1]?.lastName}
                </motion.p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {!completed && (
        <div className="grid grid-cols-3 gap-6">
          {/* Left: Avatar + Pitch */}
          <div className="col-span-2 glass-panel p-6 space-y-4">
            <div className="flex items-center gap-4">
              <motion.img
                key={currentProfile.id}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                src={currentProfile.avatarUrl}
                alt={currentProfile.firstName}
                className={`w-20 h-20 rounded-full bg-charcoal ${isPlaying ? 'animate-pulse-glow' : ''}`}
              />
              <div>
                <h2 className="text-xl font-semibold">{currentProfile.firstName} {currentProfile.lastName}</h2>
                <p className="text-white/40">{currentProfile.title} · {currentProfile.company}</p>
                <div className="flex gap-1 mt-1">
                  {currentProfile.parsedSkills.slice(0, 3).map((s) => (
                    <span key={s} className="text-xs px-2 py-0.5 bg-sky/10 text-sky/60 rounded-full">{s}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Pitch text with karaoke highlight */}
            <div className="p-4 bg-white/2 rounded-xl min-h-[120px]">
              {pitchWords.length > 0 ? (
                <p className="text-sm leading-relaxed">
                  {pitchWords.map((word, i) => (
                    <span
                      key={i}
                      className={`${
                        i < currentWordIndex
                          ? 'text-golden'
                          : i === currentWordIndex
                          ? 'text-golden font-semibold'
                          : 'text-white/30'
                      } transition-colors duration-150`}
                    >
                      {word}{' '}
                    </span>
                  ))}
                </p>
              ) : (
                <p className="text-white/20 text-sm italic">Preparing plea...</p>
              )}
            </div>
          </div>

          {/* Right: Webcam + Biometrics */}
          <div className="space-y-4">
            <div className="glass-panel p-3 relative overflow-hidden">
              <video
                ref={videoRef}
                className="w-full rounded-xl scale-x-[-1]"
                muted
                playsInline
              />
              <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />
              {!webcamReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-charcoal rounded-xl">
                  <p className="text-white/30 text-sm">Starting webcam...</p>
                </div>
              )}
            </div>

            {/* Yes-ness gauge */}
            <div className="glass-panel p-4 text-center">
              <p className="text-white/30 text-xs mb-2 uppercase tracking-wider">Yes-ness</p>
              <p className={`text-4xl font-bold tabular-nums ${yesnessColor}`}>
                {currentYesness}%
              </p>
              <div className="w-full h-2 bg-white/5 rounded-full mt-3 overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${yesnessBarColor}`}
                  animate={{ width: `${currentYesness}%` }}
                  transition={{ type: 'spring', stiffness: 100 }}
                />
              </div>
            </div>

            {/* Expression readout */}
            {currentExpressions && (
              <div className="glass-panel p-4 space-y-1.5">
                <p className="text-white/30 text-xs mb-2 uppercase tracking-wider">Expressions</p>
                {(['happy', 'surprised', 'neutral', 'disgusted', 'angry', 'sad'] as FaceExpression[]).map((expr) => {
                  // Amplify non-neutral expressions for demo visibility
                  const raw = currentExpressions[expr] || 0;
                  const displayValue = expr === 'neutral'
                    ? raw
                    : Math.min(1, raw * 3.5);
                  return (
                    <div key={expr} className="flex items-center gap-2 text-xs">
                      <span className="w-16 text-white/40 capitalize">{expr}</span>
                      <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full ${
                            expr === 'happy' || expr === 'surprised' ? 'bg-park' :
                            expr === 'disgusted' || expr === 'angry' ? 'bg-coral' :
                            expr === 'sad' ? 'bg-coral/70' :
                            'bg-sky/40'
                          }`}
                          animate={{ width: `${displayValue * 100}%` }}
                          transition={{ duration: 0.2 }}
                        />
                      </div>
                      <span className="w-8 text-right text-white/20 tabular-nums">
                        {Math.round(displayValue * 100)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Progress bar */}
      <div className="flex gap-1">
        {profiles.map((_, idx) => {
          const result = state.biometricResults.find((r) => r.attendeeId === profiles[idx].id);
          return (
            <div
              key={idx}
              className={`h-1.5 flex-1 rounded-full transition-all ${
                result
                  ? result.yesnessScore >= 60 ? 'bg-park/60' : result.yesnessScore >= 40 ? 'bg-golden/60' : 'bg-coral/60'
                  : idx === currentIndex ? 'bg-golden/30 animate-pulse' : 'bg-white/5'
              }`}
            />
          );
        })}
      </div>

      {completed && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel p-8 text-center"
        >
          <h2 className="text-2xl font-bold gradient-text mb-2">Vetting Complete</h2>
          <p className="text-white/40">
            {state.biometricResults.length} applicants processed.
            Average yes-ness: {Math.round(state.biometricResults.reduce((sum, r) => sum + r.yesnessScore, 0) / state.biometricResults.length)}%
          </p>
        </motion.div>
      )}
    </div>
  );
}
