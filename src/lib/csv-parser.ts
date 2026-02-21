import Papa from 'papaparse';
import type { RawAttendee } from './types';

export function parseCsv(csvString: string): RawAttendee[] {
  const result = Papa.parse<Record<string, string>>(csvString, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  return result.data.map((row) => ({
    id: row.id || '',
    firstName: row.firstName || '',
    lastName: row.lastName || '',
    email: row.email || '',
    company: row.company || '',
    title: row.title || '',
    industry: row.industry || '',
    yearsExperience: parseInt(row.yearsExperience || '0', 10),
    skills: row.skills || '',
    interests: row.interests || '',
    linkedinUrl: row.linkedinUrl || '',
    bio: row.bio || '',
    connectionStrength: (row.connectionStrength as 'cold' | 'warm' | 'hot') || 'cold',
    lastInteraction: row.lastInteraction || '',
    dealValue: parseInt(row.dealValue || '0', 10),
    eventHistory: row.eventHistory || '',
    personalityType: row.personalityType || '',
    networkSize: parseInt(row.networkSize || '0', 10),
    influenceScore: parseInt(row.influenceScore || '0', 10),
    notes: row.notes || '',
  }));
}
