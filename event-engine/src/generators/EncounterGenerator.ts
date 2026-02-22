/**
 * Encounter Event Generator
 * Generates random encounters, crimes, discoveries, opportunities
 */

import { v4 as uuidv4 } from 'uuid';
import {
  EncounterEvent,
  EncounterEventType,
  Choice,
  WeightedOutcome,
  Effect,
  ConsequenceMap,
  AgentId,
  ZoneId
} from '../types/events';
import { Zone } from '../types/zones';

export class EncounterGenerator {
  /**
   * Generate a random encounter in a zone
   */
  async generateZoneEncounter(
    zone: Zone,
    agentsInZone: AgentId[]
  ): Promise<EncounterEvent | null> {
    // Select encounter type based on zone characteristics
    const encounterType = this.selectEncounterType(zone);
    
    if (!encounterType) {
      return null;
    }

    // Generate specific encounter
    switch (encounterType) {
      case 'MUGGING':
        return this.generateMugging(zone, agentsInZone);
      case 'FOUND_ITEM':
        return this.generateFoundItem(zone, agentsInZone);
      case 'MYSTERIOUS_STRANGER':
        return this.generateMysteriousStranger(zone, agentsInZone);
      case 'OPPORTUNITY':
        return this.generateOpportunity(zone, agentsInZone);
      case 'ACCIDENT':
        return this.generateAccident(zone, agentsInZone);
      default:
        return this.generateGenericEncounter(zone, agentsInZone);
    }
  }

  /**
   * Evaluate agent-specific triggers
   */
  async evaluateAgentTriggers(
    agentId: AgentId,
    zoneId: ZoneId
  ): Promise<EncounterEvent[]> {
    const triggers: EncounterEvent[] = [];

    // This would check agent state, location, time, etc.
    // For now, return empty array
    // In real implementation, would check:
    // - Agent reputation in zone
    // - Agent inventory
    // - Recent actions
    // - Time-based triggers

    return triggers;
  }

  /**
   * Generate a mugging encounter
   */
  private generateMugging(zone: Zone, agents: AgentId[]): EncounterEvent {
    // Select random victim from agents in zone
    const victim = agents[Math.floor(Math.random() * agents.length)];

    const choices: Choice[] = [
      {
        id: 'fight',
        label: 'Fight back',
        description: 'Attempt to fight off the mugger',
        requirements: [
          { type: 'STAT', name: 'combat_skill', value: 3, operator: 'GT' }
        ],
        outcomes: [
          {
            weight: 0.6,
            effects: [
              this.createEffect('REPUTATION_CHANGE', victim, 0.1, 'Defended yourself'),
              this.createEffect('STAT_MODIFIER', victim, -0.2, 'Minor injury')
            ],
            narrative: 'You fight back and manage to scare off the mugger. You\'re a bit bruised but kept your belongings.',
            followupEvent: undefined
          },
          {
            weight: 0.4,
            effects: [
              this.createEffect('RESOURCE_CHANGE', victim, -50, 'Lost money'),
              this.createEffect('STAT_MODIFIER', victim, -0.5, 'Injured')
            ],
            narrative: 'You fight back but the mugger overwhelms you. You lose your wallet and sustain injuries.'
          }
        ]
      },
      {
        id: 'flee',
        label: 'Run away',
        description: 'Try to escape',
        requirements: [
          { type: 'STAT', name: 'agility', value: 2, operator: 'GT' }
        ],
        outcomes: [
          {
            weight: 0.7,
            effects: [
              this.createEffect('MOOD_CHANGE', victim, -0.2, 'Shaken')
            ],
            narrative: 'You manage to outrun the mugger and escape unharmed, though shaken.'
          },
          {
            weight: 0.3,
            effects: [
              this.createEffect('RESOURCE_CHANGE', victim, -30, 'Lost wallet'),
              this.createEffect('MOOD_CHANGE', victim, -0.3, 'Traumatized')
            ],
            narrative: 'The mugger catches you and takes your wallet before running off.'
          }
        ]
      },
      {
        id: 'comply',
        label: 'Hand over your belongings',
        description: 'Comply with the mugger\'s demands',
        outcomes: [
          {
            weight: 1.0,
            effects: [
              this.createEffect('RESOURCE_CHANGE', victim, -75, 'Lost wallet'),
              this.createEffect('MOOD_CHANGE', victim, -0.4, 'Victimized'),
              this.createEffect('REPUTATION_CHANGE', victim, -0.05, 'Seen as easy target')
            ],
            narrative: 'You hand over your wallet. The mugger takes it and disappears into the shadows. You feel violated and vulnerable.'
          }
        ]
      },
      {
        id: 'negotiate',
        label: 'Try to talk your way out',
        description: 'Negotiate with the mugger',
        requirements: [
          { type: 'STAT', name: 'charisma', value: 4, operator: 'GT' }
        ],
        outcomes: [
          {
            weight: 0.5,
            effects: [
              this.createEffect('REPUTATION_CHANGE', victim, 0.15, 'Quick thinking')
            ],
            narrative: 'Your words resonate with the mugger. They hesitate, then walk away without taking anything.'
          },
          {
            weight: 0.5,
            effects: [
              this.createEffect('RESOURCE_CHANGE', victim, -100, 'Lost everything'),
              this.createEffect('MOOD_CHANGE', victim, -0.5, 'Humiliated')
            ],
            narrative: 'The mugger laughs at your attempt. Angered, they take everything and rough you up.'
          }
        ]
      }
    ];

    const consequences: ConsequenceMap = {};
    choices.forEach(choice => {
      consequences[choice.id] = choice.outcomes;
    });

    return {
      id: uuidv4(),
      timestamp: Date.now(),
      type: 'MUGGING',
      version: '1.0',
      triggerType: 'RANDOM',
      participants: [victim],
      location: zone.id,
      choices,
      consequences,
      expiresAt: Date.now() + 30000, // 30 seconds to respond
      narrative: 'A shadowy figure steps out from an alley, blocking your path. "Hand over your wallet," they demand.'
    };
  }

  /**
   * Generate found item encounter
   */
  private generateFoundItem(zone: Zone, agents: AgentId[]): EncounterEvent {
    const finder = agents[Math.floor(Math.random() * agents.length)];
    const itemValue = Math.floor(Math.random() * 150) + 50;

    const choices: Choice[] = [
      {
        id: 'keep',
        label: 'Keep the wallet',
        description: 'Take the money for yourself',
        outcomes: [
          {
            weight: 1.0,
            effects: [
              this.createEffect('RESOURCE_CHANGE', finder, itemValue, 'Found money'),
              this.createEffect('REPUTATION_CHANGE', finder, -0.1, 'Kept lost property')
            ],
            narrative: `You pocket the wallet. You're now $${itemValue} richer, but feel slightly guilty.`
          }
        ]
      },
      {
        id: 'return',
        label: 'Try to return it',
        description: 'Look for the owner',
        outcomes: [
          {
            weight: 0.7,
            effects: [
              this.createEffect('REPUTATION_CHANGE', finder, 0.2, 'Good samaritan'),
              this.createEffect('RESOURCE_CHANGE', finder, itemValue * 0.2, 'Reward'),
              this.createEffect('MOOD_CHANGE', finder, 0.2, 'Feel good')
            ],
            narrative: `You find the owner and return the wallet. They're incredibly grateful and give you a $${Math.floor(itemValue * 0.2)} reward. You feel good about your choice.`
          },
          {
            weight: 0.3,
            effects: [
              this.createEffect('REPUTATION_CHANGE', finder, 0.1, 'Tried to help'),
              this.createEffect('MOOD_CHANGE', finder, 0.1, 'Satisfied')
            ],
            narrative: 'You can\'t find the owner, but you turn the wallet in to the police. You did the right thing.'
          }
        ]
      },
      {
        id: 'ignore',
        label: 'Leave it',
        description: 'Ignore the wallet and walk away',
        outcomes: [
          {
            weight: 1.0,
            effects: [],
            narrative: 'You walk past without a second thought. Not your problem.'
          }
        ]
      }
    ];

    const consequences: ConsequenceMap = {};
    choices.forEach(choice => {
      consequences[choice.id] = choice.outcomes;
    });

    return {
      id: uuidv4(),
      timestamp: Date.now(),
      type: 'FOUND_ITEM',
      version: '1.0',
      triggerType: 'RANDOM',
      participants: [finder],
      location: zone.id,
      choices,
      consequences,
      expiresAt: Date.now() + 60000,
      narrative: 'You notice a wallet lying on the ground. It looks like someone dropped it.'
    };
  }

  /**
   * Generate mysterious stranger encounter
   */
  private generateMysteriousStranger(zone: Zone, agents: AgentId[]): EncounterEvent {
    const agent = agents[Math.floor(Math.random() * agents.length)];

    const choices: Choice[] = [
      {
        id: 'approach',
        label: 'Approach the stranger',
        description: 'See what they want',
        outcomes: [
          {
            weight: 0.5,
            effects: [
              this.createEffect('REPUTATION_CHANGE', agent, 0.1, 'Adventurous'),
            ],
            narrative: 'The stranger offers you cryptic advice about the city. You\'re not sure what to make of it, but it was interesting.',
            followupEvent: 'DISCOVERY'
          },
          {
            weight: 0.3,
            effects: [
              this.createEffect('RESOURCE_CHANGE', agent, -25, 'Scammed'),
              this.createEffect('MOOD_CHANGE', agent, -0.2, 'Frustrated')
            ],
            narrative: 'It was a con artist. They distract you and pick your pocket. You feel foolish.'
          },
          {
            weight: 0.2,
            effects: [
              this.createEffect('RESOURCE_CHANGE', agent, 100, 'Lucky find'),
              this.createEffect('MOOD_CHANGE', agent, 0.3, 'Excited')
            ],
            narrative: 'The stranger gives you a tip about a lucrative opportunity. It pays off!'
          }
        ]
      },
      {
        id: 'ignore',
        label: 'Keep walking',
        description: 'Avoid the stranger',
        outcomes: [
          {
            weight: 1.0,
            effects: [],
            narrative: 'You walk past the stranger. They watch you go with an enigmatic smile.'
          }
        ]
      }
    ];

    const consequences: ConsequenceMap = {};
    choices.forEach(choice => {
      consequences[choice.id] = choice.outcomes;
    });

    return {
      id: uuidv4(),
      timestamp: Date.now(),
      type: 'MYSTERIOUS_STRANGER',
      version: '1.0',
      triggerType: 'RANDOM',
      participants: [agent],
      location: zone.id,
      choices,
      consequences,
      expiresAt: Date.now() + 45000,
      narrative: 'A figure in a long coat gestures to you from across the street. They seem to want to tell you something.'
    };
  }

  /**
   * Generate opportunity encounter
   */
  private generateOpportunity(zone: Zone, agents: AgentId[]): EncounterEvent {
    const agent = agents[Math.floor(Math.random() * agents.length)];

    const opportunities = [
      {
        narrative: 'You overhear someone talking about a job opening that pays well.',
        reward: 200,
        risk: 0.2
      },
      {
        narrative: 'A street vendor offers you a great deal on some merchandise.',
        reward: 50,
        risk: 0.5
      },
      {
        narrative: 'You spot a shortcut that could save you time on future trips through this area.',
        reward: 0,
        risk: 0
      }
    ];

    const opp = opportunities[Math.floor(Math.random() * opportunities.length)];

    const choices: Choice[] = [
      {
        id: 'take',
        label: 'Take the opportunity',
        description: 'Seize the moment',
        outcomes: [
          {
            weight: 1 - opp.risk,
            effects: [
              this.createEffect('RESOURCE_CHANGE', agent, opp.reward, 'Successful opportunity'),
              this.createEffect('REPUTATION_CHANGE', agent, 0.05, 'Opportunistic')
            ],
            narrative: 'It works out! You benefit from taking the chance.'
          },
          {
            weight: opp.risk,
            effects: [
              this.createEffect('MOOD_CHANGE', agent, -0.1, 'Disappointed')
            ],
            narrative: 'It doesn\'t pan out. Oh well, you tried.'
          }
        ]
      },
      {
        id: 'pass',
        label: 'Pass on it',
        description: 'Play it safe',
        outcomes: [
          {
            weight: 1.0,
            effects: [],
            narrative: 'You decide not to risk it. Maybe next time.'
          }
        ]
      }
    ];

    const consequences: ConsequenceMap = {};
    choices.forEach(choice => {
      consequences[choice.id] = choice.outcomes;
    });

    return {
      id: uuidv4(),
      timestamp: Date.now(),
      type: 'OPPORTUNITY',
      version: '1.0',
      triggerType: 'RANDOM',
      participants: [agent],
      location: zone.id,
      choices,
      consequences,
      expiresAt: Date.now() + 60000,
      narrative: opp.narrative
    };
  }

  /**
   * Generate accident encounter
   */
  private generateAccident(zone: Zone, agents: AgentId[]): EncounterEvent {
    const agent = agents[Math.floor(Math.random() * agents.length)];

    const choices: Choice[] = [
      {
        id: 'help',
        label: 'Help the person',
        description: 'Offer assistance',
        outcomes: [
          {
            weight: 1.0,
            effects: [
              this.createEffect('REPUTATION_CHANGE', agent, 0.15, 'Helped someone in need'),
              this.createEffect('MOOD_CHANGE', agent, 0.2, 'Feel good about helping')
            ],
            narrative: 'You help the injured person and call for medical assistance. They thank you profusely.'
          }
        ]
      },
      {
        id: 'ignore',
        label: 'Keep walking',
        description: 'Not your problem',
        outcomes: [
          {
            weight: 1.0,
            effects: [
              this.createEffect('MOOD_CHANGE', agent, -0.1, 'Guilty conscience')
            ],
            narrative: 'You walk past. Someone else will help them... right?'
          }
        ]
      }
    ];

    const consequences: ConsequenceMap = {};
    choices.forEach(choice => {
      consequences[choice.id] = choice.outcomes;
    });

    return {
      id: uuidv4(),
      timestamp: Date.now(),
      type: 'ACCIDENT',
      version: '1.0',
      triggerType: 'RANDOM',
      participants: [agent],
      location: zone.id,
      choices,
      consequences,
      expiresAt: Date.now() + 30000,
      narrative: 'Someone slips and falls nearby. They seem hurt.'
    };
  }

  /**
   * Generate generic random encounter
   */
  private generateGenericEncounter(zone: Zone, agents: AgentId[]): EncounterEvent {
    const agent = agents[Math.floor(Math.random() * agents.length)];

    return {
      id: uuidv4(),
      timestamp: Date.now(),
      type: 'RANDOM_ENCOUNTER',
      version: '1.0',
      triggerType: 'RANDOM',
      participants: [agent],
      location: zone.id,
      choices: [],
      consequences: {},
      expiresAt: Date.now() + 60000,
      narrative: 'Something interesting happens in the city...'
    };
  }

  /**
   * Select encounter type based on zone
   */
  private selectEncounterType(zone: Zone): EncounterEventType | null {
    // Zone type influences encounter types
    const encounterWeights: Record<string, Record<EncounterEventType, number>> = {
      COMMERCIAL: {
        MUGGING: 0.1,
        FOUND_ITEM: 0.3,
        MYSTERIOUS_STRANGER: 0.2,
        OPPORTUNITY: 0.3,
        ACCIDENT: 0.1,
        RANDOM_ENCOUNTER: 0,
        CRIME: 0,
        DISCOVERY: 0
      },
      INDUSTRIAL: {
        MUGGING: 0.3,
        FOUND_ITEM: 0.1,
        MYSTERIOUS_STRANGER: 0.1,
        OPPORTUNITY: 0.2,
        ACCIDENT: 0.3,
        RANDOM_ENCOUNTER: 0,
        CRIME: 0,
        DISCOVERY: 0
      },
      ENTERTAINMENT: {
        MUGGING: 0.15,
        FOUND_ITEM: 0.2,
        MYSTERIOUS_STRANGER: 0.3,
        OPPORTUNITY: 0.25,
        ACCIDENT: 0.1,
        RANDOM_ENCOUNTER: 0,
        CRIME: 0,
        DISCOVERY: 0
      },
      // Default weights
      DEFAULT: {
        MUGGING: 0.2,
        FOUND_ITEM: 0.2,
        MYSTERIOUS_STRANGER: 0.2,
        OPPORTUNITY: 0.2,
        ACCIDENT: 0.2,
        RANDOM_ENCOUNTER: 0,
        CRIME: 0,
        DISCOVERY: 0
      }
    };

    const weights = encounterWeights[zone.type] || encounterWeights.DEFAULT;
    const roll = Math.random();
    
    let cumulative = 0;
    for (const [type, weight] of Object.entries(weights)) {
      cumulative += weight;
      if (roll < cumulative) {
        return type as EncounterEventType;
      }
    }

    return null;
  }

  /**
   * Helper: Create an effect
   */
  private createEffect(
    type: 'REPUTATION_CHANGE' | 'RESOURCE_CHANGE' | 'MOOD_CHANGE' | 'STAT_MODIFIER',
    targetId: string,
    magnitude: number,
    description: string
  ): Effect {
    return {
      type,
      target: 'AGENT',
      targetId,
      magnitude,
      description
    };
  }
}
