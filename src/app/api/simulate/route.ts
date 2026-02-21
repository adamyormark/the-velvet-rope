import { getClaudeClient } from '@/lib/claude';
import type { EnrichedProfile, VenueConfig, DjConfig, SimulationResult } from '@/lib/types';

function createFallbackSimulation(
  attendees: EnrichedProfile[],
  djConfig: DjConfig,
): SimulationResult {
  const numRounds = djConfig.rounds || 5;
  const groupSize = Math.max(2, Math.ceil(attendees.length / 3));
  const groups: { id: string; memberIds: string[]; topic: string; output: string; cohesion: number }[] = [];

  for (let g = 0; g < Math.ceil(attendees.length / groupSize); g++) {
    const members = attendees.slice(g * groupSize, (g + 1) * groupSize);
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

  const rounds = [];
  for (let r = 0; r < numRounds; r++) {
    rounds.push({
      roundNumber: r + 1,
      narrative: `Round ${r + 1}: The attendees continue to mingle and share ideas. Groups are forming around shared interests and complementary skills. Energy in the room is ${r < 2 ? 'building' : r < 4 ? 'at its peak' : 'settling into productive focus'}.`,
      groups,
      events: [{
        type: 'group_formed' as const,
        description: `New connections forming in round ${r + 1}`,
        involvedAgentIds: attendees.slice(0, 2).map((p) => p.id),
      }],
      agentStates: attendees.map((p, idx) => {
        const groupIdx = Math.floor(idx / groupSize);
        const memberIdx = idx % groupSize;
        return {
          attendeeId: p.id,
          position: {
            x: Math.min(0.95, (groupIdx * 0.3 + 0.1 + memberIdx * 0.05) % 1),
            y: Math.min(0.95, Math.max(0.05, 0.2 + groupIdx * 0.25 + Math.sin(r + idx) * 0.05)),
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
    aggregatedOutput: `The event produced ${groups.length} collaborative groups. Attendees explored intersections of ${attendees.slice(0, 3).map((p) => p.industry).join(', ')} and more. Key themes included AI applications, cross-industry collaboration, and innovative approaches to shared challenges.`,
    totalRounds: numRounds,
  };
}

export async function POST(request: Request) {
  let admittedAttendees: EnrichedProfile[];
  let venueConfig: VenueConfig;
  let djConfig: DjConfig;

  try {
    ({ admittedAttendees, venueConfig, djConfig } = await request.json());
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }

  try {
    const claude = getClaudeClient();

    const agentDescriptions = admittedAttendees.map((a) =>
      `Agent "${a.firstName} ${a.lastName}" (id: ${a.id}): ${a.title} at ${a.company}. Personality: ${a.personalityType}. Skills: ${a.parsedSkills.join(', ')}. Interests: ${a.parsedInterests.join(', ')}. Bio: ${a.profileSummary}`
    ).join('\n');

    const prompt = `You are a social dynamics simulation engine. Simulate an event with these parameters:

VENUE: ${venueConfig.name} (${venueConfig.type}) — ${venueConfig.description}
DJ THEME: ${djConfig.theme}
GOAL: ${djConfig.goal}
DYNAMICS: ${djConfig.dynamics}
ICEBREAKER: ${djConfig.icebreaker}
RULES: ${djConfig.rules.join('; ')}

ATTENDEES (${admittedAttendees.length} agents):
${agentDescriptions}

Simulate ${djConfig.rounds} rounds of interaction. For each round, determine:
1. Who gravitates toward whom based on personality, shared interests, complementary skills
2. What groups form or dissolve
3. What each group discusses and produces toward the goal
4. Key events (breakthroughs, conflicts, unexpected connections)

Output EXACTLY this JSON structure (no other text):
{
  "rounds": [
    {
      "roundNumber": 1,
      "narrative": "Vivid 2-3 sentence description of what happened",
      "groups": [{"id": "g1", "memberIds": ["1","3"], "topic": "what they discussed", "output": "what they produced", "cohesion": 75}],
      "events": [{"type": "group_formed", "description": "...", "involvedAgentIds": ["1","3"]}],
      "agentStates": [{"attendeeId": "1", "position": {"x": 0.3, "y": 0.7}, "currentGroupId": "g1", "mood": "excited", "energyLevel": 85, "satisfaction": 70}]
    }
  ],
  "finalGroups": [...],
  "aggregatedOutput": "Summary of everything produced toward the goal",
  "totalRounds": ${djConfig.rounds}
}

Make positions be numbers between 0 and 1. In round 1, agents should be randomly scattered across the space. Over subsequent rounds, agents should gradually cluster together as groups form. Group members should converge to close positions. Be creative and realistic. Include ALL agents in every round's agentStates.`;

    const response = await claude.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 8000,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : null;

    if (!result || !result.rounds) {
      return Response.json(createFallbackSimulation(admittedAttendees, djConfig));
    }

    return Response.json(result);
  } catch (error) {
    console.error('Simulation error:', error);
    return Response.json(createFallbackSimulation(admittedAttendees, djConfig));
  }
}
