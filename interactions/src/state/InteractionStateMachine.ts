/**
 * Interaction State Machine
 * Manages the lifecycle: PENDING → ACTIVE → COMPLETED/CANCELLED
 */

import { Interaction, InteractionStatus, StateTransition } from '../types/interaction.types';
import { EventEmitter } from 'events';
import { Logger } from 'winston';

export class InteractionStateMachine extends EventEmitter {
  private transitions: StateTransition[];
  private logger: Logger;

  constructor(logger: Logger) {
    super();
    this.logger = logger;
    this.transitions = this.defineTransitions();
  }

  /**
   * Define all valid state transitions
   */
  private defineTransitions(): StateTransition[] {
    return [
      // Initiation phase
      {
        from: 'PENDING',
        to: 'ACTIVE',
        trigger: 'ACCEPT',
        condition: (interaction) => interaction.targets.length > 0,
      },
      {
        from: 'PENDING',
        to: 'REJECTED',
        trigger: 'REJECT',
      },
      {
        from: 'PENDING',
        to: 'CANCELLED',
        trigger: 'CANCEL',
      },

      // Active phase
      {
        from: 'ACTIVE',
        to: 'PAUSED',
        trigger: 'PAUSE',
      },
      {
        from: 'ACTIVE',
        to: 'COMPLETED',
        trigger: 'COMPLETE',
      },
      {
        from: 'ACTIVE',
        to: 'ABANDONED',
        trigger: 'ABANDON',
      },
      {
        from: 'ACTIVE',
        to: 'CANCELLED',
        trigger: 'CANCEL',
      },

      // Paused phase
      {
        from: 'PAUSED',
        to: 'ACTIVE',
        trigger: 'RESUME',
      },
      {
        from: 'PAUSED',
        to: 'ABANDONED',
        trigger: 'TIMEOUT',
        condition: (interaction) => {
          const pausedDuration = Date.now() - interaction.lastActivityAt.getTime();
          return pausedDuration > 10 * 60 * 1000; // 10 minutes
        },
      },
      {
        from: 'PAUSED',
        to: 'CANCELLED',
        trigger: 'CANCEL',
      },

      // Terminal states (no transitions out)
      // COMPLETED, REJECTED, ABANDONED, CANCELLED are final
    ];
  }

  /**
   * Attempt a state transition
   */
  async transition(
    interaction: Interaction,
    trigger: string,
    metadata?: Record<string, any>
  ): Promise<Interaction> {
    const validTransitions = this.transitions.filter(
      (t) => t.from === interaction.status && t.trigger === trigger
    );

    if (validTransitions.length === 0) {
      throw new Error(
        `Invalid transition: ${interaction.status} + ${trigger}`
      );
    }

    // Find first valid transition (with satisfied condition)
    const transition = validTransitions.find((t) => {
      if (!t.condition) return true;
      return t.condition(interaction);
    });

    if (!transition) {
      throw new Error(
        `Transition condition not met: ${interaction.status} + ${trigger}`
      );
    }

    // Execute pre-transition action
    if (transition.action) {
      await transition.action(interaction);
    }

    // Update interaction
    const oldStatus = interaction.status;
    interaction.status = transition.to;
    interaction.lastActivityAt = new Date();

    if (this.isTerminalState(transition.to)) {
      interaction.endedAt = new Date();
    }

    // Emit event
    this.emit('transition', {
      interactionId: interaction.id,
      from: oldStatus,
      to: transition.to,
      trigger,
      metadata,
    });

    this.logger.info('Interaction state transition', {
      interactionId: interaction.id,
      from: oldStatus,
      to: transition.to,
      trigger,
    });

    return interaction;
  }

  /**
   * Check if state is terminal
   */
  isTerminalState(status: InteractionStatus): boolean {
    return ['COMPLETED', 'REJECTED', 'ABANDONED', 'CANCELLED'].includes(
      status
    );
  }

  /**
   * Check if transition is valid
   */
  canTransition(
    currentStatus: InteractionStatus,
    trigger: string
  ): boolean {
    return this.transitions.some(
      (t) => t.from === currentStatus && t.trigger === trigger
    );
  }

  /**
   * Get available actions for current state
   */
  getAvailableActions(interaction: Interaction): string[] {
    return this.transitions
      .filter((t) => {
        if (t.from !== interaction.status) return false;
        if (!t.condition) return true;
        return t.condition(interaction);
      })
      .map((t) => t.trigger);
  }

  /**
   * Auto-transition for timeouts
   */
  async checkTimeouts(interaction: Interaction): Promise<Interaction | null> {
    const inactivityMs = Date.now() - interaction.lastActivityAt.getTime();

    // Pending timeout: 2 minutes
    if (interaction.status === 'PENDING' && inactivityMs > 2 * 60 * 1000) {
      return this.transition(interaction, 'CANCEL', {
        reason: 'No response timeout',
      });
    }

    // Paused timeout: 10 minutes
    if (interaction.status === 'PAUSED' && inactivityMs > 10 * 60 * 1000) {
      return this.transition(interaction, 'TIMEOUT', {
        reason: 'Paused too long',
      });
    }

    // Active timeout: 30 minutes
    if (interaction.status === 'ACTIVE' && inactivityMs > 30 * 60 * 1000) {
      return this.transition(interaction, 'ABANDON', {
        reason: 'Inactivity timeout',
      });
    }

    return null;
  }
}
