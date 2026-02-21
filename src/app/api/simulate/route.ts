import { getClaudeClient } from '@/lib/claude';
import type { EnrichedProfile, VenueConfig, DjConfig } from '@/lib/types';

export async function POST(request: Request) {
  try {
    const { admittedAttendees, venueConfig, djConfig } = await request.json() as {
      admittedAttendees: EnrichedProfile[];
      venueConfig: VenueConfig;
      djConfig: DjConfig;
    };

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

Make positions be numbers between 0 and 1. Group members close together. Be creative and realistic. Include ALL agents in every round's agentStates.`;

    const response = await claude.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 8000,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : null;

    if (!result) {
      return Response.json({ error: 'Failed to parse simulation' }, { status: 500 });
    }

    return Response.json(result);
  } catch (error) {
    console.error('Simulation error:', error);
    return Response.json({ error: 'Simulation failed' }, { status: 500 });
  }
}
