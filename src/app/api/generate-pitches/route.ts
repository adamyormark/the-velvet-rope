import { NextResponse } from 'next/server';
import { getClaudeClient } from '@/lib/claude';
import type { EnrichedProfile, AttendeePitch } from '@/lib/types';

const TONES = ['confident', 'humble', 'humorous', 'passionate', 'analytical'] as const;

export async function POST(request: Request) {
  try {
    const { profiles } = await request.json() as { profiles: EnrichedProfile[] };
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
          content: `You're generating "desperate pleas to get into the party" for an exclusive AI hackathon event. Each person is begging the bouncer to let them in. The pitches should be 100-150 words, first person, dramatic and entertaining — like someone literally pleading at a velvet rope outside a club. Be specific to their background. Some should be funny, some desperate, some smooth.

${prompt}

Return ONLY a JSON array where each element has:
- "attendeeId": their id
- "pitchText": their plea (first person, 100-150 words)
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
        // Fallback pitches
        for (const p of batch) {
          pitches.push({
            attendeeId: p.id,
            pitchText: `Look, I know you've got a list, but hear me out. I'm ${p.firstName} ${p.lastName}, and I've spent ${p.yearsExperience} years in ${p.industry}. I built ${p.company} from the ground up. My skills in ${p.parsedSkills.slice(0, 2).join(' and ')} aren't just resume padding — they're battle scars. Let me in and I promise this event won't be the same without me. I didn't come all this way to stand outside.`,
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
    return NextResponse.json({ error: 'Failed to generate pitches' }, { status: 500 });
  }
}
