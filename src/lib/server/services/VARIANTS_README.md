# Recipe Variants API

## Overview

Recipe variants are stored as subcollections under each recipe document in Firestore:

```
recipes/{recipeId}/variants/{variantId}
```

## Functions

### `createVariant(input: CreateVariantInput): Promise<RecipeVariantDocument>`

Creates a new recipe variant.

**Parameters:**

- `input.recipeId` (required): The parent recipe ID
- `input.name` (required): Variant name (e.g., "Vegan Version", "Spicier")
- `input.recipe_data` (required): Full recipe_data object with ingredients, steps, macros
- `input.isOriginal` (optional): Mark as the original variant (default: false)

**Example:**

```typescript
const variant = await createVariant({
  recipeId: "3698377999985802234",
  name: "Vegan Version",
  recipe_data: {
    ingredients: [...],
    steps: [...],
    macros: {...},
    // ... other recipe data
  }
});
```

### `listVariants(recipeId: string): Promise<RecipeVariantDocument[]>`

Fetches all variants for a recipe, ordered by creation date (oldest first).

**Example:**

```typescript
const variants = await listVariants("3698377999985802234");
// Returns: [{ id, recipeId, name, isOriginal, recipe_data, createdAt, updatedAt }, ...]
```

### `deleteVariant(recipeId: string, variantId: string): Promise<void>`

Deletes a variant. **Prevents deletion of the original variant** (`isOriginal: true`).

**Throws:**

- Error if attempting to delete the original variant
- Error if variant not found

**Example:**

```typescript
await deleteVariant("3698377999985802234", "variant-123");
```

### `updateVariantName(recipeId: string, variantId: string, name: string): Promise<RecipeVariantDocument>`

Updates a variant's name.

**Example:**

```typescript
const updated = await updateVariantName(
  "3698377999985802234",
  "variant-123",
  "Extra Spicy Version"
);
```

## Data Types

### `RecipeVariantDocument`

```typescript
{
  id: string;                                    // Auto-generated variant ID
  recipeId: string;                              // Parent recipe ID
  name: string;                                  // Variant name
  isOriginal: boolean;                           // True for the original recipe variant
  recipe_data: InstagramRecipePost["recipe_data"]; // Full recipe data
  createdAt?: string;                            // ISO timestamp
  updatedAt?: string;                            // ISO timestamp
}
```

### `CreateVariantInput`

```typescript
{
  recipeId: string;                              // Required
  name: string;                                  // Required
  recipe_data: InstagramRecipePost["recipe_data"]; // Required
  isOriginal?: boolean;                          // Optional, defaults to false
}
```

## Integration with VariantSwitcherCard

To wire the Firestore functions into the variant switcher UI:

1. Create API routes in `src/app/api/recipes/[id]/variants/route.ts`:

   ```typescript
   // GET /api/recipes/[id]/variants - list all variants
   // POST /api/recipes/[id]/variants - create variant
   ```

2. Create API route for individual variants in `src/app/api/recipes/[id]/variants/[variantId]/route.ts`:

   ```typescript
   // PATCH /api/recipes/[id]/variants/[variantId] - rename variant
   // DELETE /api/recipes/[id]/variants/[variantId] - delete variant
   ```

3. Update `VariantSwitcherCard.tsx` to fetch/mutate using these endpoints

## Security Notes

- The `deleteVariant` function includes a guard to prevent deletion of the original variant
- Consider adding Firestore security rules to enforce:
  - Only authenticated users can create/modify variants
  - Users can only modify their own recipe variants
  - Original variant cannot be deleted (enforce `isOriginal` check)

## Example Security Rules

```
match /recipes/{recipeId}/variants/{variantId} {
  allow read: if true; // Public read
  allow create: if request.auth != null;
  allow update, delete: if request.auth != null
    && (!resource.data.isOriginal || request.method != 'delete');
}
```
