#!/usr/bin/env node
/**
 * Memory Export CLI
 * Export agent memories in various formats
 */

import { writeFileSync } from 'fs';
import { MemorySystem } from '../index';

async function main() {
  const args = process.argv.slice(2);
  
  const agentId = args.find(arg => arg.startsWith('--agent='))?.split('=')[1];
  const format = args.find(arg => arg.startsWith('--format='))?.split('=')[1] || 'json';
  const output = args.find(arg => arg.startsWith('--output='))?.split('=')[1];
  
  if (!agentId) {
    console.error('Usage: tsx export.ts --agent=<uuid> [--format=json|markdown] [--output=<file>]');
    process.exit(1);
  }

  console.log('📤 DARKCITY Memory Export');
  console.log('=========================');
  console.log(`Agent: ${agentId.slice(0, 8)}`);
  console.log(`Format: ${format}\n`);

  const memorySystem = new MemorySystem();

  try {
    // Get memory stats
    const stats = await memorySystem.getMemoryStats(agentId);
    
    console.log('Memory Statistics:');
    console.log(`  Total experiences: ${stats.totalExperiences}`);
    console.log(`  Significant: ${stats.significantExperiences}`);
    console.log(`  Days consolidated: ${stats.consolidatedDays}`);
    console.log(`  Last activity: ${stats.lastActivity?.toLocaleString() || 'Never'}\n`);

    console.log('Experiences by type:');
    for (const [type, count] of Object.entries(stats.experiencesByType)) {
      console.log(`  ${type}: ${count}`);
    }
    console.log();

    // Get all experiences
    console.log('Fetching experiences...');
    const experiences = await memorySystem.experience.getExperiencesByAgent(agentId, 10000);
    
    // Export based on format
    let exportData: string;
    
    if (format === 'markdown') {
      exportData = exportToMarkdown(agentId, experiences, stats);
    } else {
      exportData = JSON.stringify({
        agentId,
        exportedAt: new Date().toISOString(),
        stats,
        experiences: experiences.map(exp => ({
          id: exp.id,
          timestamp: exp.timestamp,
          type: exp.type,
          description: exp.event.description,
          location: exp.event.location,
          participants: exp.event.participants,
          perception: exp.perception,
          consequences: exp.consequences,
          tags: exp.tags,
        })),
      }, null, 2);
    }

    if (output) {
      writeFileSync(output, exportData);
      console.log(`✅ Exported to ${output}`);
    } else {
      console.log('\n' + exportData);
    }

  } catch (error) {
    console.error('\n❌ Export failed:', error);
    process.exit(1);
  } finally {
    await memorySystem.close();
  }
}

function exportToMarkdown(agentId: string, experiences: any[], stats: any): string {
  const lines = [
    `# Agent Memory Export`,
    ``,
    `**Agent ID:** ${agentId}`,
    `**Exported:** ${new Date().toLocaleString()}`,
    ``,
    `## Statistics`,
    ``,
    `- Total Experiences: ${stats.totalExperiences}`,
    `- Significant Events: ${stats.significantExperiences}`,
    `- Days Active: ${stats.consolidatedDays}`,
    `- Last Activity: ${stats.lastActivity?.toLocaleString() || 'Never'}`,
    ``,
    `### Experiences by Type`,
    ``,
  ];

  for (const [type, count] of Object.entries(stats.experiencesByType)) {
    lines.push(`- ${type}: ${count}`);
  }

  lines.push(``, `## Timeline`, ``);

  // Group by date
  const byDate = new Map<string, any[]>();
  for (const exp of experiences) {
    const date = new Date(exp.timestamp).toDateString();
    if (!byDate.has(date)) {
      byDate.set(date, []);
    }
    byDate.get(date)!.push(exp);
  }

  // Sort dates
  const sortedDates = Array.from(byDate.keys()).sort((a, b) => 
    new Date(b).getTime() - new Date(a).getTime()
  );

  for (const date of sortedDates) {
    lines.push(`### ${date}`, ``);
    
    const dayExperiences = byDate.get(date)!;
    for (const exp of dayExperiences) {
      const time = new Date(exp.timestamp).toLocaleTimeString();
      const emotion = describeEmotion(exp.perception);
      const significance = '⭐'.repeat(Math.ceil(exp.perception.significance * 5));
      
      lines.push(`**${time}** - ${exp.event.description}`);
      lines.push(`- Type: ${exp.type}`);
      lines.push(`- Emotion: ${emotion}`);
      lines.push(`- Significance: ${significance}`);
      
      if (exp.event.participants.length > 0) {
        lines.push(`- Participants: ${exp.event.participants.length} agents`);
      }
      
      if (exp.tags.length > 0) {
        lines.push(`- Tags: ${exp.tags.join(', ')}`);
      }
      
      lines.push(``);
    }
  }

  return lines.join('\n');
}

function describeEmotion(perception: any): string {
  const { emotional_valence, emotional_arousal } = perception;
  
  if (emotional_arousal > 0.7) {
    return emotional_valence > 0.5 ? '😄 Excited' : '😰 Distressed';
  } else if (emotional_arousal > 0.3) {
    return emotional_valence > 0.5 ? '😊 Pleased' : '😟 Concerned';
  } else {
    return emotional_valence > 0.5 ? '😌 Content' : '😔 Melancholy';
  }
}

main().catch(console.error);
