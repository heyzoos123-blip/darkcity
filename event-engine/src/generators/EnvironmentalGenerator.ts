/**
 * Environmental Event Generator
 * Generates weather, time changes, city-wide events
 */

import { v4 as uuidv4 } from 'uuid';
import {
  EnvironmentalEvent,
  EnvironmentalEventType,
  Effect,
  EffectType
} from '../types/events';

export class EnvironmentalGenerator {
  private currentTimeOfDay: number = 12; // 0-23 hours
  private currentWeather: string = 'CLEAR';
  private weatherStates: string[] = ['CLEAR', 'CLOUDY', 'RAIN', 'STORM', 'FOG'];
  
  // Markov chain for weather transitions
  private weatherTransitions: Record<string, Record<string, number>> = {
    CLEAR: { CLEAR: 0.7, CLOUDY: 0.25, FOG: 0.05 },
    CLOUDY: { CLEAR: 0.3, CLOUDY: 0.4, RAIN: 0.25, FOG: 0.05 },
    RAIN: { RAIN: 0.5, CLOUDY: 0.3, STORM: 0.15, CLEAR: 0.05 },
    STORM: { STORM: 0.3, RAIN: 0.5, CLOUDY: 0.2 },
    FOG: { FOG: 0.4, CLEAR: 0.4, CLOUDY: 0.2 }
  };

  /**
   * Generate time of day change event
   */
  async generateTimeChange(): Promise<EnvironmentalEvent> {
    // Advance time by 1 hour
    this.currentTimeOfDay = (this.currentTimeOfDay + 1) % 24;

    const timeLabel = this.getTimeLabel(this.currentTimeOfDay);
    const effects = this.getTimeEffects(this.currentTimeOfDay);

    return {
      id: uuidv4(),
      timestamp: Date.now(),
      type: 'TIME_OF_DAY_CHANGE',
      version: '1.0',
      scope: 'GLOBAL',
      affectedArea: ['*'],
      startTime: Date.now(),
      duration: 600, // 10 minutes = 1 hour game time
      effects,
      description: `${timeLabel} - The city shifts as the clock strikes ${this.currentTimeOfDay}:00`
    };
  }

  /**
   * Generate weather change event
   */
  async generateWeatherChange(): Promise<EnvironmentalEvent> {
    const newWeather = this.transitionWeather();
    const effects = this.getWeatherEffects(newWeather);

    return {
      id: uuidv4(),
      timestamp: Date.now(),
      type: 'WEATHER_CHANGE',
      version: '1.0',
      scope: 'GLOBAL',
      affectedArea: ['*'],
      startTime: Date.now(),
      duration: 1800, // 30 minutes
      effects,
      description: this.getWeatherDescription(newWeather)
    };
  }

  /**
   * Generate city announcement
   */
  async generateCityAnnouncement(): Promise<EnvironmentalEvent> {
    const announcements = [
      {
        desc: 'Mayor announces new infrastructure project in Downtown',
        effects: [this.createEffect('LOCATION_MODIFIER', 'downtown', 0.1, 'Construction noise')]
      },
      {
        desc: 'Police increase patrols in Industrial District',
        effects: [this.createEffect('LOCATION_MODIFIER', 'industrial', -0.2, 'Reduced crime')]
      },
      {
        desc: 'Arts District festival this weekend - expect crowds',
        effects: [this.createEffect('LOCATION_MODIFIER', 'arts', 0.3, 'Festival atmosphere')]
      },
      {
        desc: 'Subway delays reported on all lines',
        effects: [this.createEffect('LOCATION_MODIFIER', '*', 0.5, 'Transit delays')]
      }
    ];

    const announcement = announcements[Math.floor(Math.random() * announcements.length)];

    return {
      id: uuidv4(),
      timestamp: Date.now(),
      type: 'CITY_ANNOUNCEMENT',
      version: '1.0',
      scope: 'GLOBAL',
      affectedArea: ['*'],
      startTime: Date.now(),
      duration: 3600, // 1 hour
      effects: announcement.effects,
      description: announcement.desc
    };
  }

  /**
   * Generate random district event
   */
  async generateRandomDistrictEvent(): Promise<EnvironmentalEvent | null> {
    const districts = ['downtown', 'industrial', 'arts', 'residential', 'uptown'];
    const district = districts[Math.floor(Math.random() * districts.length)];

    const events = [
      {
        type: 'FESTIVAL' as EnvironmentalEventType,
        desc: `Street festival begins in ${district}`,
        effects: [
          this.createEffect('LOCATION_MODIFIER', district, 0.4, 'Festival bonus'),
          this.createEffect('STAT_MODIFIER', district, 0.2, 'Social interaction boost')
        ]
      },
      {
        type: 'INFRASTRUCTURE_EVENT' as EnvironmentalEventType,
        desc: `Power outage reported in ${district}`,
        effects: [
          this.createEffect('LOCATION_MODIFIER', district, -0.5, 'No power'),
          this.createEffect('AVAILABILITY_CHANGE', district, -0.8, 'Services down')
        ]
      },
      {
        type: 'EMERGENCY' as EnvironmentalEventType,
        desc: `Fire breaks out in ${district} building`,
        effects: [
          this.createEffect('LOCATION_MODIFIER', district, 0.8, 'Emergency response'),
          this.createEffect('STAT_MODIFIER', district, -0.3, 'Stress increase')
        ]
      }
    ];

    const event = events[Math.floor(Math.random() * events.length)];

    return {
      id: uuidv4(),
      timestamp: Date.now(),
      type: event.type,
      version: '1.0',
      scope: 'DISTRICT',
      affectedArea: [district],
      startTime: Date.now(),
      duration: 1800, // 30 minutes
      effects: event.effects,
      description: event.desc
    };
  }

  /**
   * Helper: Get time of day label
   */
  private getTimeLabel(hour: number): string {
    if (hour >= 5 && hour < 12) return 'Morning';
    if (hour >= 12 && hour < 17) return 'Afternoon';
    if (hour >= 17 && hour < 21) return 'Evening';
    return 'Night';
  }

  /**
   * Helper: Get effects for time of day
   */
  private getTimeEffects(hour: number): Effect[] {
    const effects: Effect[] = [];

    // Night effects (increased danger, different NPCs)
    if (hour >= 22 || hour < 6) {
      effects.push({
        type: 'LOCATION_MODIFIER',
        target: 'GLOBAL',
        magnitude: 0.3,
        description: 'Increased danger at night'
      });
      effects.push({
        type: 'AVAILABILITY_CHANGE',
        target: 'GLOBAL',
        magnitude: -0.4,
        description: 'Many locations closed'
      });
    }

    // Rush hour effects
    if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) {
      effects.push({
        type: 'LOCATION_MODIFIER',
        target: 'GLOBAL',
        magnitude: 0.5,
        description: 'Rush hour crowds'
      });
    }

    return effects;
  }

  /**
   * Helper: Transition weather using Markov chain
   */
  private transitionWeather(): string {
    const transitions = this.weatherTransitions[this.currentWeather];
    const roll = Math.random();
    
    let cumulative = 0;
    for (const [state, probability] of Object.entries(transitions)) {
      cumulative += probability;
      if (roll < cumulative) {
        this.currentWeather = state;
        return state;
      }
    }

    return this.currentWeather;
  }

  /**
   * Helper: Get weather effects
   */
  private getWeatherEffects(weather: string): Effect[] {
    const effects: Effect[] = [];

    switch (weather) {
      case 'RAIN':
        effects.push(this.createEffect('STAT_MODIFIER', '*', -0.2, 'Movement speed reduced'));
        effects.push(this.createEffect('MOOD_CHANGE', '*', -0.1, 'Gloomy mood'));
        break;
      case 'STORM':
        effects.push(this.createEffect('STAT_MODIFIER', '*', -0.4, 'Severe movement penalty'));
        effects.push(this.createEffect('AVAILABILITY_CHANGE', '*', -0.3, 'Some services closed'));
        effects.push(this.createEffect('MOOD_CHANGE', '*', -0.2, 'Stormy mood'));
        break;
      case 'FOG':
        effects.push(this.createEffect('STAT_MODIFIER', '*', -0.15, 'Reduced visibility'));
        effects.push(this.createEffect('LOCATION_MODIFIER', '*', 0.1, 'Mysterious atmosphere'));
        break;
      case 'CLEAR':
        effects.push(this.createEffect('MOOD_CHANGE', '*', 0.1, 'Pleasant weather'));
        break;
    }

    return effects;
  }

  /**
   * Helper: Get weather description
   */
  private getWeatherDescription(weather: string): string {
    const descriptions: Record<string, string> = {
      CLEAR: 'The skies clear up, revealing a crisp blue expanse',
      CLOUDY: 'Gray clouds roll in over the city',
      RAIN: 'Rain begins to fall, slicking the streets',
      STORM: 'Thunder rumbles as a storm sweeps through the city',
      FOG: 'Thick fog descends, shrouding the streets in mystery'
    };

    return descriptions[weather] || 'The weather changes';
  }

  /**
   * Helper: Create an effect
   */
  private createEffect(
    type: EffectType,
    targetId: string,
    magnitude: number,
    description: string,
    duration?: number
  ): Effect {
    return {
      type,
      target: targetId === '*' ? 'GLOBAL' : 'ZONE',
      targetId: targetId === '*' ? undefined : targetId,
      magnitude,
      duration,
      description
    };
  }

  /**
   * Get current state
   */
  public getCurrentState() {
    return {
      timeOfDay: this.currentTimeOfDay,
      weather: this.currentWeather
    };
  }
}
