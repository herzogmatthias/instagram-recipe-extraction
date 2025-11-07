// ===== Recipe (standalone) =====

export interface RecipeData {
  title: string;
  servings?: {
    value: number;
    note?: string;
  };
  prep_time_min?: number;
  cook_time_min?: number;
  total_time_min?: number;
  difficulty?: "easy" | "medium" | "hard" | string;
  cuisine?: string;
  macros_per_serving?: Macros | null;
  confidence?: number;
  ingredients: Ingredient[];
  steps: Step[];
  assumptions?: string[];
}

export interface Macros {
  calories?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  [k: string]: number | undefined;
}

export interface Ingredient {
  id: string;
  name: string;
  quantity: number | string | null;
  unit: string | null;
  preparation?: string | null;
  section?: string | null;
  optional?: boolean;
  chefs_note?: string;
}

export interface Step {
  idx: number;
  text: string;
  used_ingredients: string[]; // references Ingredient.id
  section?: string | null;
  estimated_time_min?: number;
  chefs_note?: string;
}

// ===== Instagram post with embedded recipe =====

export type RecipeStatus =
  | "queued"
  | "scraping"
  | "downloading_media"
  | "uploading_media"
  | "extracting"
  | "ready"
  | "failed";

export interface InstagramRecipePost {
  inputUrl: string;
  id: string;
  type: "Video" | "Image" | "Carousel" | string;
  shortCode: string;
  caption: string;
  hashtags: string[];
  mentions: string[];
  url: string;
  commentsCount: number;
  firstComment?: string | null;
  latestComments: CommentThread[];
  dimensionsHeight?: number | null;
  dimensionsWidth?: number | null;
  displayUrl?: string | null;
  images: string[]; // array of image URLs (if any)
  videoUrl?: string | null;
  alt?: string | null;
  likesCount: number;
  videoViewCount?: number | null;
  videoPlayCount?: number | null;
  timestamp: string; // ISO8601
  childPosts: InstagramRecipePost[]; // empty array or nested posts
  ownerFullName?: string | null;
  ownerUsername: string;
  ownerId: string;
  productType?: "clips" | "feed" | string;
  videoDuration?: number | null; // seconds
  isSponsored?: boolean;
  musicInfo?: MusicInfo;
  isCommentsDisabled?: boolean;
  recipe_data?: RecipeData; // also usable standalone
  status?: RecipeStatus; // processing status
  progress?: number; // 0-100 processing progress
  error?: string; // error message if failed
  createdAt?: string; // ISO8601 timestamp when recipe was added
}

export interface CommentThread {
  id: string;
  text: string;
  ownerUsername: string;
  ownerProfilePicUrl?: string | null;
  timestamp: string; // ISO8601
  repliesCount: number;
  replies: CommentThread[];
  likesCount: number;
  owner: OwnerSummary;
}

export interface OwnerSummary {
  id: string;
  is_verified: boolean;
  profile_pic_url?: string | null;
  username: string;
}

export interface MusicInfo {
  artist_name?: string;
  song_name?: string;
  uses_original_audio?: boolean;
  should_mute_audio?: boolean;
  should_mute_audio_reason?: string;
  audio_id?: string;
}
