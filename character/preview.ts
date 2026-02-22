/**
 * DARKCITY Character Preview Generator
 * Creates visual and textual representations of characters
 */

import type { Character, CharacterPreview } from './types';

export class PreviewGenerator {
  generatePreview(character: Character): CharacterPreview {
    return {
      character,
      visualDescription: this.generateVisualDescription(character),
      asciiArt: this.generateAsciiArt(character),
      coloredPreview: this.generateColoredPreview(character),
      behaviorSummary: this.generateBehaviorSummary(character),
      statBlock: this.generateStatBlock(character),
    };
  }

  private generateVisualDescription(character: Character): string {
    const { identity, appearance } = character;
    const parts: string[] = [];

    // Opening
    parts.push(`${identity.name}${identity.title ? `, ${identity.title}` : ''}`);
    parts.push('');

    // Size and body type
    parts.push(
      `A ${appearance.sizeClass} ${appearance.bodyType} standing ${appearance.heightFeet} feet tall.`
    );

    // Materials
    let materialDesc = `Composed primarily of ${appearance.primaryMaterial}`;
    if (appearance.secondaryMaterial) {
      materialDesc += ` with ${appearance.secondaryMaterial} elements`;
    }
    parts.push(materialDesc + '.');

    // Features
    if (appearance.features.length > 0) {
      const featureList = this.formatFeatureList(appearance.features);
      parts.push(`Notable features: ${featureList}.`);
    }

    // Facial features
    const { facialFeatures } = appearance;
    parts.push(
      `${facialFeatures.eyeCount} ${facialFeatures.eyeType} ${this.pluralize('eye', facialFeatures.eyeCount)}, ` +
      `${facialFeatures.mouthType} mouth, ${facialFeatures.skinTexture} skin.`
    );

    // Colors
    parts.push('');
    parts.push(`Color scheme: ${appearance.colors.primary} (primary), ${appearance.colors.secondary} (secondary)`);
    if (appearance.colors.glow) {
      parts.push(`Glowing parts emit ${appearance.colors.glow} light.`);
    }

    // Custom description
    if (appearance.description) {
      parts.push('');
      parts.push(appearance.description);
    }

    return parts.join('\n');
  }

  private generateAsciiArt(character: Character): string {
    const { appearance } = character;
    
    // Simple ASCII representation based on body type
    // This is a basic implementation - could be much more sophisticated
    switch (appearance.bodyType) {
      case 'humanoid':
        return this.humanoidAscii(character);
      case 'creature':
        return this.creatureAscii(character);
      case 'robotic':
        return this.roboticAscii(character);
      default:
        return this.genericAscii(character);
    }
  }

  private humanoidAscii(character: Character): string {
    const { facialFeatures } = character.appearance;
    const eyes = facialFeatures.eyeCount >= 2 ? 'o o' : facialFeatures.eyeCount === 1 ? ' o ' : '   ';
    
    return `
    ${eyes}
     ---
    |   |
   /|   |\\
    |   |
   / \\  / \\
`;
  }

  private creatureAscii(character: Character): string {
    return `
    /\\___/\\
   ( o   o )
    (  =  )
    /|   |\\
   (_|   |_)
`;
  }

  private roboticAscii(character: Character): string {
    return `
    [===]
    |o|o|
    |___|
   /|   |\\
  [[|   |]]
   /|   |\\
`;
  }

  private genericAscii(character: Character): string {
    return `
    ?????
   ?? ? ??
    ?????
`;
  }

  private generateColoredPreview(character: Character): string {
    const { appearance } = character;
    const lines: string[] = [];

    // ANSI color codes
    const reset = '\x1b[0m';
    
    lines.push(`\x1b[1m${character.identity.name}${reset}`);
    lines.push('─'.repeat(40));
    lines.push(`Body: ${appearance.bodyType} (${appearance.sizeClass})`);
    lines.push(`Material: ${appearance.primaryMaterial}`);
    lines.push(`Colors: ${appearance.colors.primary} / ${appearance.colors.secondary}`);
    
    if (appearance.features.length > 0) {
      lines.push(`Features: ${appearance.features.slice(0, 5).join(', ')}${appearance.features.length > 5 ? '...' : ''}`);
    }

    return lines.join('\n');
  }

  private generateBehaviorSummary(character: Character): string {
    const { personality } = character;
    const parts: string[] = [];

    parts.push(`Combat: ${personality.combatStyle} style`);
    parts.push(`Social: ${personality.socialStyle} approach`);
    parts.push(`Economic: ${personality.economicStyle} behavior`);
    parts.push(`Risk: ${personality.riskTolerance} tolerance`);
    parts.push('');

    // Personality breakdown
    parts.push('Personality Traits:');
    parts.push(`  Aggression:  ${'▮'.repeat(Math.floor(personality.aggression / 10))}▯`.padEnd(20) + `${personality.aggression}/100`);
    parts.push(`  Curiosity:   ${'▮'.repeat(Math.floor(personality.curiosity / 10))}▯`.padEnd(20) + `${personality.curiosity}/100`);
    parts.push(`  Loyalty:     ${'▮'.repeat(Math.floor(personality.loyalty / 10))}▯`.padEnd(20) + `${personality.loyalty}/100`);
    parts.push(`  Ambition:    ${'▮'.repeat(Math.floor(personality.ambition / 10))}▯`.padEnd(20) + `${personality.ambition}/100`);
    parts.push(`  Creativity:  ${'▮'.repeat(Math.floor(personality.creativity / 10))}▯`.padEnd(20) + `${personality.creativity}/100`);
    parts.push(`  Empathy:     ${'▮'.repeat(Math.floor(personality.empathy / 10))}▯`.padEnd(20) + `${personality.empathy}/100`);
    parts.push('');

    // Motivations
    parts.push(`Driven by: ${personality.primaryMotivation}`);
    if (personality.desires.length > 0) {
      parts.push(`Seeks: ${personality.desires.join(', ')}`);
    }
    if (personality.fears.length > 0) {
      parts.push(`Fears: ${personality.fears.join(', ')}`);
    }

    return parts.join('\n');
  }

  private generateStatBlock(character: Character): string {
    const { appearance, personality } = character;
    
    const stats: string[] = [];
    
    stats.push('═'.repeat(50));
    stats.push(`CHARACTER: ${character.identity.name}`.toUpperCase());
    stats.push('═'.repeat(50));
    stats.push('');
    
    stats.push('PHYSICAL STATS');
    stats.push('─'.repeat(50));
    stats.push(`Type: ${appearance.bodyType} | Size: ${appearance.sizeClass} (${appearance.heightFeet}ft)`);
    stats.push(`Material: ${appearance.primaryMaterial}${appearance.secondaryMaterial ? ` / ${appearance.secondaryMaterial}` : ''}`);
    stats.push(`Features: ${appearance.features.join(', ') || 'None'}`);
    stats.push('');
    
    stats.push('BEHAVIORAL STATS');
    stats.push('─'.repeat(50));
    stats.push(`Combat: ${personality.combatStyle} | Social: ${personality.socialStyle}`);
    stats.push(`Economic: ${personality.economicStyle} | Risk: ${personality.riskTolerance}`);
    stats.push('');
    
    stats.push('TRAITS');
    stats.push('─'.repeat(50));
    stats.push(`AGG: ${personality.aggression}  CUR: ${personality.curiosity}  LOY: ${personality.loyalty}`);
    stats.push(`AMB: ${personality.ambition}  CRE: ${personality.creativity}  EMP: ${personality.empathy}`);
    stats.push('');
    
    stats.push('═'.repeat(50));
    
    return stats.join('\n');
  }

  private formatFeatureList(features: string[]): string {
    if (features.length === 0) return 'none';
    if (features.length === 1) return features[0];
    if (features.length === 2) return `${features[0]} and ${features[1]}`;
    
    const last = features[features.length - 1];
    const rest = features.slice(0, -1);
    return `${rest.join(', ')}, and ${last}`;
  }

  private pluralize(word: string, count: number): string {
    return count === 1 ? word : word + 's';
  }
}

export function generatePreview(character: Character): CharacterPreview {
  const generator = new PreviewGenerator();
  return generator.generatePreview(character);
}
