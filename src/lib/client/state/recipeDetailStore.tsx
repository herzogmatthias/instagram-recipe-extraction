'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import type { InstagramRecipePost } from "@/models/InstagramRecipePost";
import {
  DEFAULT_SERVINGS,
  MIN_SERVINGS,
  MAX_SERVINGS,
} from "@/lib/shared/constants/recipeDetail";

export type UnitSystem = "metric" | "us";
export const UNIT_SYSTEMS: UnitSystem[] = ["metric", "us"];

type RecipeDetailState = {
  servings: number;
  unitSystem: UnitSystem;
  checkedIngredientIds: Set<string>;
  highlightedIngredientIds: Set<string>;
  activeStepIdx: number | null;
  highlightedStepIdx: number | null;
  cookMode: boolean;
};

type RecipeDetailAction =
  | { type: "SET_SERVINGS"; value: number }
  | { type: "INCREMENT_SERVINGS" }
  | { type: "DECREMENT_SERVINGS" }
  | { type: "SET_UNIT_SYSTEM"; value: UnitSystem }
  | { type: "TOGGLE_INGREDIENT"; id: string }
  | { type: "SET_INGREDIENTS"; ids: string[] }
  | { type: "HIGHLIGHT_INGREDIENTS"; ids: string[] }
  | { type: "SET_ACTIVE_STEP"; idx: number | null }
  | { type: "HIGHLIGHT_STEP"; idx: number | null }
  | { type: "SET_COOK_MODE"; value: boolean };

type RecipeDetailContextValue = {
  recipe: InstagramRecipePost;
  servings: number;
  baseServings: number;
  unitSystem: UnitSystem;
  checkedIngredientIds: Set<string>;
  highlightedIngredientIds: Set<string>;
  activeStepIdx: number | null;
  highlightedStepIdx: number | null;
  cookMode: boolean;
  servingsMultiplier: number;
  setServings: (value: number) => void;
  incrementServings: () => void;
  decrementServings: () => void;
  setUnitSystem: (value: UnitSystem) => void;
  toggleIngredient: (id: string) => void;
  setCheckedIngredients: (ids: string[]) => void;
  highlightIngredients: (ids: string[]) => void;
  setActiveStep: (idx: number | null) => void;
  highlightStep: (idx: number | null) => void;
  setCookMode: (value: boolean) => void;
};

const RecipeDetailContext = createContext<RecipeDetailContextValue | undefined>(
  undefined
);

function clampServings(value: number): number {
  if (Number.isNaN(value)) {
    return MIN_SERVINGS;
  }
  return Math.min(Math.max(value, MIN_SERVINGS), MAX_SERVINGS);
}

function reducer(state: RecipeDetailState, action: RecipeDetailAction) {
  switch (action.type) {
    case "SET_SERVINGS":
      return { ...state, servings: clampServings(action.value) };
    case "INCREMENT_SERVINGS":
      return { ...state, servings: clampServings(state.servings + 1) };
    case "DECREMENT_SERVINGS":
      return { ...state, servings: clampServings(state.servings - 1) };
    case "SET_UNIT_SYSTEM":
      return { ...state, unitSystem: action.value };
    case "TOGGLE_INGREDIENT": {
      const next = new Set(state.checkedIngredientIds);
      if (next.has(action.id)) {
        next.delete(action.id);
      } else {
        next.add(action.id);
      }
      return { ...state, checkedIngredientIds: next };
    }
    case "SET_INGREDIENTS":
      return { ...state, checkedIngredientIds: new Set(action.ids) };
    case "HIGHLIGHT_INGREDIENTS":
      return { ...state, highlightedIngredientIds: new Set(action.ids) };
    case "SET_ACTIVE_STEP":
      return { ...state, activeStepIdx: action.idx };
    case "HIGHLIGHT_STEP":
      return { ...state, highlightedStepIdx: action.idx };
    case "SET_COOK_MODE":
      return { ...state, cookMode: action.value };
    default:
      return state;
  }
}

type ProviderProps = {
  recipe: InstagramRecipePost;
  children: ReactNode;
};

export function RecipeDetailProvider({
  recipe,
  children,
}: ProviderProps) {
  const baseServings = clampServings(
    recipe.recipe_data?.servings?.value ?? DEFAULT_SERVINGS
  );

  const [state, dispatch] = useReducer(reducer, {
    servings: baseServings,
    unitSystem: "metric" as UnitSystem,
    checkedIngredientIds: new Set<string>(),
    highlightedIngredientIds: new Set<string>(),
    activeStepIdx: null,
    highlightedStepIdx: null,
    cookMode: false,
  });

  const setServings = useCallback(
    (value: number) => dispatch({ type: "SET_SERVINGS", value }),
    []
  );
  const incrementServings = useCallback(
    () => dispatch({ type: "INCREMENT_SERVINGS" }),
    []
  );
  const decrementServings = useCallback(
    () => dispatch({ type: "DECREMENT_SERVINGS" }),
    []
  );
  const setUnitSystem = useCallback(
    (value: UnitSystem) => dispatch({ type: "SET_UNIT_SYSTEM", value }),
    []
  );
  const toggleIngredient = useCallback(
    (id: string) => dispatch({ type: "TOGGLE_INGREDIENT", id }),
    []
  );
  const setCheckedIngredients = useCallback(
    (ids: string[]) => dispatch({ type: "SET_INGREDIENTS", ids }),
    []
  );
  const highlightIngredients = useCallback(
    (ids: string[]) => dispatch({ type: "HIGHLIGHT_INGREDIENTS", ids }),
    []
  );
  const setActiveStep = useCallback(
    (idx: number | null) => dispatch({ type: "SET_ACTIVE_STEP", idx }),
    []
  );
  const highlightStep = useCallback(
    (idx: number | null) => dispatch({ type: "HIGHLIGHT_STEP", idx }),
    []
  );
  const setCookMode = useCallback(
    (value: boolean) => dispatch({ type: "SET_COOK_MODE", value }),
    []
  );

  const value = useMemo<RecipeDetailContextValue>(() => {
    const multiplier = state.servings / baseServings;

    return {
      recipe,
      servings: state.servings,
      baseServings,
      unitSystem: state.unitSystem,
      checkedIngredientIds: state.checkedIngredientIds,
      highlightedIngredientIds: state.highlightedIngredientIds,
      activeStepIdx: state.activeStepIdx,
      highlightedStepIdx: state.highlightedStepIdx,
      cookMode: state.cookMode,
      servingsMultiplier: Number.isFinite(multiplier) ? multiplier : 1,
      setServings,
      incrementServings,
      decrementServings,
      setUnitSystem,
      toggleIngredient,
      setCheckedIngredients,
      highlightIngredients,
      setActiveStep,
      highlightStep,
      setCookMode,
    };
  }, [
    baseServings,
    recipe,
    state.servings,
    state.unitSystem,
    state.checkedIngredientIds,
    state.highlightedIngredientIds,
    state.activeStepIdx,
    state.highlightedStepIdx,
    state.cookMode,
    setServings,
    incrementServings,
    decrementServings,
    setUnitSystem,
    toggleIngredient,
    setCheckedIngredients,
    highlightIngredients,
    setActiveStep,
    highlightStep,
    setCookMode,
  ]);

  return (
    <RecipeDetailContext.Provider value={value}>
      {children}
    </RecipeDetailContext.Provider>
  );
}

export function useRecipeDetail(): RecipeDetailContextValue {
  const context = useContext(RecipeDetailContext);
  if (!context) {
    throw new Error(
      "useRecipeDetail must be used within a RecipeDetailProvider"
    );
  }
  return context;
}
