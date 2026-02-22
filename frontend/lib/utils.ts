import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: 'DARKCOIN' | 'DARKFLOBI'): string {
  if (currency === 'DARKFLOBI') {
    return `${amount.toLocaleString()} $DARKFLOBI`;
  }
  return `◈${amount.toLocaleString()}`;
}

export function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString();
}

export function formatTimeDetailed(timestamp: string): string {
  return new Date(timestamp).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function getDistrictColor(districtName: string): string {
  const colors: Record<string, string> = {
    downtown: '#4b0082',     // Deep indigo (royal)
    industrial: '#8b0000',   // Crimson (blood)
    arts: '#9370db',         // Medium purple (mystical)
    residential: '#2f4f4f',  // Dark slate (somber)
    underground: '#800020',  // Burgundy (shadows)
    uptown: '#d4af37',       // Gold (wealthy)
    eastgate: '#4682b4',     // Steel blue (cold)
    midtown: '#663399',      // Rebecca purple (noble)
    westside: '#b8860b',     // Dark goldenrod (aged)
    docks: '#2c4f54',        // Dark cyan (waterfront)
  };
  
  return colors[districtName.toLowerCase()] || '#8b7e6a';
}

export function getEventTypeColor(eventType: string): string {
  const colors: Record<string, string> = {
    WEATHER: '#4682b4',       // Steel blue
    TIME_OF_DAY: '#ffa500',   // Torch amber
    CITY_ANNOUNCEMENT: '#d4af37', // Antique gold
    RANDOM_ENCOUNTER: '#8b0000',  // Deep crimson
    CRIME: '#8b0000',         // Blood red
    OPPORTUNITY: '#d4af37',   // Gold
    DISCOVERY: '#9370db',     // Medium purple
    CONVERSATION: '#663399',  // Rebecca purple
    TRANSACTION: '#b8860b',   // Dark goldenrod
    COLLABORATION: '#2d1b4e', // Dark royal purple
    CONFLICT: '#8b0000',      // Crimson
  };
  
  return colors[eventType] || '#8b7e6a';
}

export function getEventTypeIcon(eventType: string): string {
  const icons: Record<string, string> = {
    WEATHER: '🌧️',
    TIME_OF_DAY: '🌆',
    CITY_ANNOUNCEMENT: '📢',
    RANDOM_ENCOUNTER: '🎲',
    CRIME: '🚨',
    OPPORTUNITY: '💰',
    DISCOVERY: '🔍',
    CONVERSATION: '💬',
    TRANSACTION: '💸',
    COLLABORATION: '🤝',
    CONFLICT: '⚔️',
  };
  
  return icons[eventType] || '📍';
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    IDLE: '#d4af37',      // Antique gold
    MOVING: '#ffa500',    // Amber
    INTERACTING: '#8b0000', // Crimson
    OFFLINE: '#3d2a1f',   // Aged iron
  };
  
  return colors[status] || '#8b7e6a';
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
}

export function getPersonalityDescription(trait: string, value: number): string {
  const descriptions: Record<string, { low: string; high: string }> = {
    openness: {
      low: 'Traditional, practical',
      high: 'Curious, creative',
    },
    conscientiousness: {
      low: 'Spontaneous, flexible',
      high: 'Organized, disciplined',
    },
    extraversion: {
      low: 'Reserved, introspective',
      high: 'Outgoing, energetic',
    },
    agreeableness: {
      low: 'Competitive, skeptical',
      high: 'Cooperative, trusting',
    },
    neuroticism: {
      low: 'Calm, resilient',
      high: 'Sensitive, anxious',
    },
  };
  
  const desc = descriptions[trait.toLowerCase()];
  if (!desc) return '';
  
  return value > 50 ? desc.high : desc.low;
}

export function calculateDistance(
  from: { x: number; y: number },
  to: { x: number; y: number }
): number {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  return Math.sqrt(dx * dx + dy * dy);
}
