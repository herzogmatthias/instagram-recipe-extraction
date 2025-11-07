import type { Ingredient } from "@/models/InstagramRecipePost";
import type { UnitSystem } from "@/lib/state/recipeDetailStore";

type ConversionRule = {
  metricUnit: string;
  usUnit: string;
  toMetric: (value: number) => number;
  toUs: (value: number) => number;
};

const UNIT_ALIASES: Record<string, string> = {
  gram: "g",
  grams: "g",
  g: "g",
  kilogram: "kg",
  kilograms: "kg",
  kg: "kg",
  milliliter: "ml",
  milliliters: "ml",
  ml: "ml",
  liter: "l",
  liters: "l",
  l: "l",
  ounce: "oz",
  ounces: "oz",
  oz: "oz",
  pound: "lb",
  pounds: "lb",
  lb: "lb",
  lbs: "lb",
  teaspoon: "tsp",
  teaspoons: "tsp",
  tsp: "tsp",
  tablespoon: "tbsp",
  tablespoons: "tbsp",
  tbsp: "tbsp",
  cup: "cup",
  cups: "cup",
};

const CONVERSIONS: Record<string, ConversionRule> = {
  g: {
    metricUnit: "g",
    usUnit: "oz",
    toMetric: (value) => value,
    toUs: (value) => value * 0.035274,
  },
  kg: {
    metricUnit: "g",
    usUnit: "lb",
    toMetric: (value) => value * 1000,
    toUs: (value) => value * 2.20462,
  },
  ml: {
    metricUnit: "ml",
    usUnit: "fl oz",
    toMetric: (value) => value,
    toUs: (value) => value * 0.033814,
  },
  l: {
    metricUnit: "ml",
    usUnit: "qt",
    toMetric: (value) => value * 1000,
    toUs: (value) => value * 1.05669,
  },
  oz: {
    metricUnit: "g",
    usUnit: "oz",
    toMetric: (value) => value * 28.3495,
    toUs: (value) => value,
  },
  lb: {
    metricUnit: "g",
    usUnit: "lb",
    toMetric: (value) => value * 453.592,
    toUs: (value) => value,
  },
  tbsp: {
    metricUnit: "tbsp",
    usUnit: "tbsp",
    toMetric: (value) => value,
    toUs: (value) => value,
  },
  tsp: {
    metricUnit: "tsp",
    usUnit: "tsp",
    toMetric: (value) => value,
    toUs: (value) => value,
  },
  cup: {
    metricUnit: "cup",
    usUnit: "cup",
    toMetric: (value) => value,
    toUs: (value) => value,
  },
};

export type DisplayIngredient = {
  id: string;
  primaryText: string;
  secondaryText?: string;
  optional?: boolean;
  chefsNote?: string;
  ingredient: Ingredient;
};

export function buildDisplayIngredient(
  ingredient: Ingredient,
  multiplier: number,
  unitSystem: UnitSystem
): DisplayIngredient {
  const quantityText = formatQuantity(ingredient, multiplier, unitSystem);

  const primaryText = [quantityText, ingredient.name]
    .filter(Boolean)
    .join(" ")
    .trim();

  const secondary: string[] = [];
  if (ingredient.preparation) {
    secondary.push(ingredient.preparation);
  }
  if (ingredient.optional) {
    secondary.push("optional");
  }

  return {
    id: ingredient.id,
    primaryText: primaryText || ingredient.name,
    secondaryText: secondary.join(" • ") || undefined,
    optional: ingredient.optional,
    chefsNote: ingredient.chefs_note,
    ingredient,
  };
}

function formatQuantity(
  ingredient: Ingredient,
  multiplier: number,
  unitSystem: UnitSystem
): string | null {
  const parsedQuantity = parseQuantity(ingredient.quantity);

  if (parsedQuantity === null) {
    return ingredient.unit ? ingredient.unit.trim() : null;
  }

  const scaled = parsedQuantity * multiplier;
  const normalizedUnit = normalizeUnit(ingredient.unit);

  if (normalizedUnit && CONVERSIONS[normalizedUnit]) {
    const rule = CONVERSIONS[normalizedUnit];
    const convertedValue =
      unitSystem === "metric"
        ? rule.toMetric(scaled)
        : rule.toUs(scaled);
    const unitLabel =
      unitSystem === "metric" ? rule.metricUnit : rule.usUnit;
    return `${formatNumber(convertedValue)} ${unitLabel}`;
  }

  const formatted = formatNumber(scaled);
  const unitLabel = ingredient.unit?.trim();
  return unitLabel ? `${formatted} ${unitLabel}` : formatted;
}

function normalizeUnit(unit?: string | null): string | null {
  if (!unit) {
    return null;
  }
  const trimmed = unit.trim().toLowerCase();
  return UNIT_ALIASES[trimmed] ?? trimmed;
}

function parseQuantity(quantity: Ingredient["quantity"]): number | null {
  if (quantity === null || quantity === undefined) {
    return null;
  }
  if (typeof quantity === "number") {
    return quantity;
  }

  const text = quantity.trim();

  if (text.includes(" ")) {
    // handle mixed numbers like "1 1/2"
    const [wholePart, fractionPart] = text.split(" ");
    const whole = Number(wholePart);
    const fraction = parseFraction(fractionPart);
    if (!Number.isNaN(whole) && fraction !== null) {
      return whole + fraction;
    }
  }

  const fraction = parseFraction(text);
  if (fraction !== null) {
    return fraction;
  }

  const parsed = Number(text);
  return Number.isNaN(parsed) ? null : parsed;
}

function parseFraction(value: string | undefined): number | null {
  if (!value || !value.includes("/")) {
    return null;
  }
  const [numerator, denominator] = value
    .split("/")
    .map((part) => Number(part));
  if (
    Number.isNaN(numerator) ||
    Number.isNaN(denominator) ||
    denominator === 0
  ) {
    return null;
  }
  return numerator / denominator;
}

function formatNumber(value: number): string {
  if (Number.isInteger(value)) {
    return value.toString();
  }
  if (value < 1) {
    return value.toFixed(2).replace(/\.?0+$/, "");
  }
  if (value < 10) {
    return value.toFixed(1).replace(/\.0$/, "");
  }
  return value.toFixed(0);
}
