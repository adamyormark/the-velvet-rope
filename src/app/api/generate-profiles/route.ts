import { NextResponse } from 'next/server';
import { getClaudeClient } from '@/lib/claude';
import { getAvatarUrl } from '@/lib/avatar';
import type { RawAttendee, EnrichedProfile } from '@/lib/types';

export async function POST(request: Request) {
  try {
    const { attendees } = await request.json() as { attendees: RawAttendee[] };
    const claude = getClaudeClient();

    // Process in batches of 5
    const batchSize = 5;
    const enriched: EnrichedProfile[] = [];

    for (let i = 0; i < attendees.length; i += batchSize) {
      const batch = attendees.slice(i, i + batchSize);
      const batchData = batch.map((a) => ({
        id: a.id,
        name: `${a.firstName} ${a.lastName}`,
        title: a.title,
        company: a.company,
        industry: a.industry,
        yearsExperience: a.yearsExperience,
        skills: a.skills,
        interests: a.interests,
        bio: a.bio,
        influenceScore: a.influenceScore,
      }));

      const response = await claude.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: `For each person below, generate a JSON array where each element has:
- "id": their id
- "profileSummary": a punchy 1-2 sentence summary of who they are and why they matter (be vivid)
- "uniqueValue": one sentence on what makes them uniquely valuable at an AI hackathon
- "potentialContributions": array of 3 specific things they could contribute

People:
${JSON.stringify(batchData)}

Return ONLY valid JSON array, no other text.`,
        }],
      });

      try {
        const text = response.content[0].type === 'text' ? response.content[0].text : '';
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        const results = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

        for (const attendee of batch) {
          const result = results.find((r: { id: string }) => r.id === attendee.id) || {};
          enriched.push({
            ...attendee,
            parsedSkills: attendee.skills.split(';').map((s) => s.trim()).filter(Boolean),
            parsedInterests: attendee.interests.split(';').map((s) => s.trim()).filter(Boolean),
            parsedEventHistory: attendee.eventHistory.split(';').map((s) => s.trim()).filter(Boolean),
            avatarUrl: getAvatarUrl(attendee.email),
            profileSummary: result.profileSummary || attendee.bio,
            uniqueValue: result.uniqueValue || `${attendee.title} at ${attendee.company}`,
            potentialContributions: result.potentialContributions || [],
          });
        }
      } catch {
        // Fallback: use raw data
        for (const attendee of batch) {
          enriched.push({
            ...attendee,
            parsedSkills: attendee.skills.split(';').map((s) => s.trim()).filter(Boolean),
            parsedInterests: attendee.interests.split(';').map((s) => s.trim()).filter(Boolean),
            parsedEventHistory: attendee.eventHistory.split(';').map((s) => s.trim()).filter(Boolean),
            avatarUrl: getAvatarUrl(attendee.email),
            profileSummary: attendee.bio,
            uniqueValue: `${attendee.title} at ${attendee.company}`,
            potentialContributions: [],
          });
        }
      }
    }

    return NextResponse.json({ enrichedProfiles: enriched });
  } catch (error) {
    console.error('Profile enrichment error:', error);
    return NextResponse.json({ error: 'Failed to enrich profiles' }, { status: 500 });
  }
}
