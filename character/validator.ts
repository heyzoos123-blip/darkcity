/**
 * DARKCITY Character Validation System
 * Ensures character integrity and rule compliance
 */

import type {
  Character,
  ValidationRules,
  SizeClass,
  Material,
  BodyType,
} from './types';

export const DEFAULT_VALIDATION_RULES: ValidationRules = {
  heightRanges: {
    tiny: { min: 0.5, max: 2 },
    small: { min: 2, max: 4 },
    medium: { min: 4, max: 7 },
    large: { min: 7, max: 12 },
    huge: { min: 12, max: 20 },
    colossal: { min: 20, max: 100 },
  },
  
  maxFeatures: 8,
  
  traitRange: { min: 0, max: 100 },
  
  incompatibleMaterials: {
    shadow: ['energy', 'flames'],
    energy: ['shadow', 'void'],
    void: ['energy', 'flesh'],
    flesh: ['living-metal'],
    ice: ['flames'],
  } as Record<Material, Material[]>,
  
  bodyTypeRestrictions: {
    humanoid: {
      bannedFeatures: ['extra-limbs', 'tendrils'],
    },
    robotic: {
      allowedMaterials: ['metal', 'living-metal', 'biomechanical', 'energy'],
      bannedFeatures: ['flesh'],
    },
    ethereal: {
      allowedMaterials: ['shadow', 'energy', 'void', 'smoke'],
    },
    creature: {},
    'hybrid-organic': {},
    'hybrid-mechanical': {},
    eldritch: {},
  } as Record<BodyType, any>,
};

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

export class CharacterValidator {
  constructor(private rules: ValidationRules = DEFAULT_VALIDATION_RULES) {}

  validate(character: Character): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Identity validation
    if (!character.identity.name || character.identity.name.trim().length === 0) {
      errors.push({
        field: 'identity.name',
        message: 'Character name is required',
        severity: 'error',
      });
    }

    if (character.identity.name && character.identity.name.length > 100) {
      errors.push({
        field: 'identity.name',
        message: 'Character name must be 100 characters or less',
        severity: 'error',
      });
    }

    // Appearance validation
    this.validateHeight(character, errors, warnings);
    this.validateMaterials(character, errors, warnings);
    this.validateFeatures(character, errors, warnings);
    this.validateColors(character, errors, warnings);
    this.validateFacialFeatures(character, errors, warnings);

    // Personality validation
    this.validatePersonalityTraits(character, errors, warnings);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private validateHeight(
    character: Character,
    errors: ValidationError[],
    warnings: ValidationError[]
  ): void {
    const { sizeClass, heightFeet } = character.appearance;
    const range = this.rules.heightRanges[sizeClass];

    if (heightFeet < range.min || heightFeet > range.max) {
      errors.push({
        field: 'appearance.heightFeet',
        message: `Height ${heightFeet}ft is outside ${sizeClass} range (${range.min}-${range.max}ft)`,
        severity: 'error',
      });
    }
  }

  private validateMaterials(
    character: Character,
    errors: ValidationError[],
    warnings: ValidationError[]
  ): void {
    const { primaryMaterial, secondaryMaterial, bodyType } = character.appearance;
    
    // Check body type restrictions
    const restrictions = this.rules.bodyTypeRestrictions[bodyType];
    if (restrictions?.allowedMaterials) {
      if (!restrictions.allowedMaterials.includes(primaryMaterial)) {
        errors.push({
          field: 'appearance.primaryMaterial',
          message: `Material ${primaryMaterial} is not compatible with ${bodyType} body type`,
          severity: 'error',
        });
      }
    }

    // Check material compatibility
    if (secondaryMaterial) {
      const incompatible = this.rules.incompatibleMaterials[primaryMaterial] || [];
      if (incompatible.includes(secondaryMaterial)) {
        errors.push({
          field: 'appearance.secondaryMaterial',
          message: `Materials ${primaryMaterial} and ${secondaryMaterial} are incompatible`,
          severity: 'error',
        });
      }
    }
  }

  private validateFeatures(
    character: Character,
    errors: ValidationError[],
    warnings: ValidationError[]
  ): void {
    const { features, bodyType } = character.appearance;

    if (features.length > this.rules.maxFeatures) {
      errors.push({
        field: 'appearance.features',
        message: `Too many features (${features.length}). Maximum is ${this.rules.maxFeatures}`,
        severity: 'error',
      });
    }

    // Check body type restrictions
    const restrictions = this.rules.bodyTypeRestrictions[bodyType];
    if (restrictions?.bannedFeatures) {
      const banned = features.filter(f => restrictions.bannedFeatures?.includes(f));
      if (banned.length > 0) {
        errors.push({
          field: 'appearance.features',
          message: `Features ${banned.join(', ')} are not allowed for ${bodyType} body type`,
          severity: 'error',
        });
      }
    }

    // Check for duplicate features
    const uniqueFeatures = new Set(features);
    if (uniqueFeatures.size !== features.length) {
      warnings.push({
        field: 'appearance.features',
        message: 'Duplicate features detected',
        severity: 'warning',
      });
    }
  }

  private validateColors(
    character: Character,
    errors: ValidationError[],
    warnings: ValidationError[]
  ): void {
    const colors = character.appearance.colors;
    const hexPattern = /^#[0-9A-Fa-f]{6}$/;

    const colorFields = ['primary', 'secondary', 'eyes', 'glow', 'energy'];
    for (const field of colorFields) {
      const color = colors[field as keyof typeof colors];
      if (color && !hexPattern.test(color)) {
        errors.push({
          field: `appearance.colors.${field}`,
          message: `Invalid hex color format: ${color}`,
          severity: 'error',
        });
      }
    }
  }

  private validateFacialFeatures(
    character: Character,
    errors: ValidationError[],
    warnings: ValidationError[]
  ): void {
    const { facialFeatures } = character.appearance;

    if (facialFeatures.eyeCount < 0 || facialFeatures.eyeCount > 8) {
      errors.push({
        field: 'appearance.facialFeatures.eyeCount',
        message: 'Eye count must be between 0 and 8',
        severity: 'error',
      });
    }

    if (facialFeatures.eyeCount === 0 && facialFeatures.eyeType !== 'void') {
      warnings.push({
        field: 'appearance.facialFeatures.eyeType',
        message: 'Character has 0 eyes but non-void eye type',
        severity: 'warning',
      });
    }
  }

  private validatePersonalityTraits(
    character: Character,
    errors: ValidationError[],
    warnings: ValidationError[]
  ): void {
    const traits = character.personality;
    const { min, max } = this.rules.traitRange;

    const numericTraits = [
      'aggression',
      'curiosity',
      'loyalty',
      'ambition',
      'creativity',
      'empathy',
    ] as const;

    for (const trait of numericTraits) {
      const value = traits[trait];
      if (value < min || value > max) {
        errors.push({
          field: `personality.${trait}`,
          message: `${trait} must be between ${min} and ${max} (got ${value})`,
          severity: 'error',
        });
      }
    }

    // Logical consistency checks
    if (traits.combatStyle === 'support' && traits.aggression > 70) {
      warnings.push({
        field: 'personality',
        message: 'Support combat style with high aggression may be inconsistent',
        severity: 'warning',
      });
    }

    if (traits.socialStyle === 'friendly' && traits.empathy < 30) {
      warnings.push({
        field: 'personality',
        message: 'Friendly social style with low empathy may be inconsistent',
        severity: 'warning',
      });
    }

    if (traits.riskTolerance === 'reckless' && traits.combatStyle === 'defensive') {
      warnings.push({
        field: 'personality',
        message: 'Reckless risk tolerance with defensive combat style may be inconsistent',
        severity: 'warning',
      });
    }
  }
}

export function validateCharacter(character: Character): ValidationResult {
  const validator = new CharacterValidator();
  return validator.validate(character);
}
