import { NextResponse } from 'next/server';
import { getClaudeClient } from '@/lib/claude';
import type { EnrichedProfile, AttendeePitch } from '@/lib/types';

const TONES = ['confident', 'humble', 'humorous', 'passionate', 'analytical'] as const;

function createFallbackPitches(profiles: EnrichedProfile[]): AttendeePitch[] {
  return profiles.map((p, idx) => ({
    attendeeId: p.id,
    pitchText: `I'm ${p.firstName} ${p.lastName}, ${p.yearsExperience} years in ${p.industry}. My ${p.parsedSkills[0] || 'expertise'} isn't resume fluff — it's battle-tested. Let me in and I'll prove this event needs me.`,
    pitchTone: TONES[idx % TONES.length],
    keyArguments: [
      p.parsedSkills[0] || 'deep expertise',
      p.uniqueValue || `${p.title} at ${p.company}`,
      `${p.yearsExperience} years of expertise`,
    ],
    generatedAt: new Date().toISOString(),
  }));
}

export async function POST(request: Request) {
  let profiles: EnrichedProfile[];

  try {
    ({ profiles } = await request.json() as { profiles: EnrichedProfile[] });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  try {
    const claude = getClaudeClient();
    const pitches: AttendeePitch[] = [];

    // Process in batches of 3
    for (let i = 0; i < profiles.length; i += 3) {
      const batch = profiles.slice(i, i + 3);

      const prompt = batch.map((p, idx) => {
        const tone = TONES[(i + idx) % TONES.length];
        return `Person ${p.id}: ${p.firstName} ${p.lastName}, ${p.title} at ${p.company}. ${p.yearsExperience} years in ${p.industry}. Skills: ${p.parsedSkills.join(', ')}. Bio: ${p.bio}. Personality: ${p.personalityType}. Tone: ${tone}.`;
      }).join('\n\n');

      const response = await claude.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 3000,
        messages: [{
          role: 'user',
          content: `You're generating "desperate pleas to get into the party" for an exclusive AI hackathon event. Each person is begging the bouncer to let them in. The pitches should be 30-40 words MAXIMUM (about 15 seconds when spoken aloud), first person, punchy and dramatic — like someone literally pleading at a velvet rope outside a club. Keep it SHORT and impactful. Be specific to their background.

${prompt}

Return ONLY a JSON array where each element has:
- "attendeeId": their id
- "pitchText": their plea (first person, 30-40 words MAX — this is critical, keep it very short)
- "pitchTone": "${TONES.join('" or "')}"
- "keyArguments": array of 3 short bullet points of their case

No other text, just valid JSON.`,
        }],
      });

      try {
        const text = response.content[0].type === 'text' ? response.content[0].text : '';
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        const results = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

        for (const result of results) {
          pitches.push({
            attendeeId: result.attendeeId,
            pitchText: result.pitchText,
            pitchTone: result.pitchTone || 'passionate',
            keyArguments: result.keyArguments || [],
            generatedAt: new Date().toISOString(),
          });
        }
      } catch {
        // Fallback pitches for this batch
        for (const p of batch) {
          pitches.push({
            attendeeId: p.id,
            pitchText: `I'm ${p.firstName} ${p.lastName}, ${p.yearsExperience} years in ${p.industry}. My ${p.parsedSkills[0] || 'expertise'} isn't resume fluff — it's battle-tested. Let me in and I'll prove this event needs me.`,
            pitchTone: TONES[Math.floor(Math.random() * TONES.length)],
            keyArguments: [p.parsedSkills[0] || 'experience', p.uniqueValue, `${p.yearsExperience} years of expertise`],
            generatedAt: new Date().toISOString(),
          });
        }
      }
    }

    return NextResponse.json({ pitches });
  } catch (error) {
    console.error('Pitch generation error:', error);
    // Return fallback pitches when Claude is unavailable
    return NextResponse.json({ pitches: createFallbackPitches(profiles) });
  }
}
