// src/concepts/Requesting/passthrough.ts
import "jsr:@std/dotenv/load";

const BASE = Deno.env.get("REQUESTING_BASE_URL") ?? "/api";
const R = (concept: string, action: string) => `${BASE}/${concept}/${action}`;

/**
 * INCLUSIONS
 * Public, read-only queries only. No mutating actions or internal validation queries here.
 */
export const inclusions: Record<string, string> = {
  // --- Store (queries that exist) ---
  [R("Store", "_listAllStores")]:
    "Public read; list all stores with non-sensitive details.",
  [R("Store", "_getStoreDetails")]:
    "Public read; fetch a store's non-sensitive details by ID.",
  [R("Store", "_getStoresByName")]: "Public read; search stores by name.",
  [R("Store", "_getStoresByAddress")]: "Public read; search stores by address.",

  // --- Tagging (queries that exist) ---
  [R("Tagging", "_getStoresByTag")]:
    "Public read; find stores that have a given tag.",
  [R("Tagging", "_getTagsForStore")]:
    "Public read; fetch tags attached to a store.",

  // --- Review (queries that exist) ---
  [R("Review", "_getReviewByIdFull")]:
    "Public read; full review details by review ID.",
  [R("Review", "_getReviewsForStoreFull")]:
    "Public read; full review details for a store.",
  [R("Review", "_getReviewsByUserFull")]:
    "Public read; full review details created by a user.",

  // --- Rating (query that exists) ---
  [R("Rating", "_getRating")]: "Public read; aggregated rating for a store.",

  // --- User (safe, non-sensitive profile read) ---
  [R("User", "_getUserDetails")]:
    "Public read; non-sensitive user profile details by user ID.",
};

/**
 * EXCLUSIONS
 * Everything here must go through Requesting.request + your syncs.
 * Include all mutating actions and internal validation queries.
 */
export const exclusions: string[] = [
  // --- User (mutations + internal validation) ---
  R("User", "registerUser"),
  R("User", "authenticateUser"),
  R("User", "updateUserEmail"),
  R("User", "deleteUser"),
  R("User", "_userExists"),
  R("User", "_getUserByUsernameOrEmail"),

  // --- Store (mutations + internal validation) ---
  R("Store", "createStore"),
  R("Store", "deleteStore"),
  R("Store", "_storeExists"),

  // --- Tagging (mutations/internal) ---
  R("Tagging", "addTag"),
  R("Tagging", "removeTag"),
  R("Tagging", "deleteTagsForStore"),

  // --- Review (mutations/internal) ---
  R("Review", "createReview"),
  R("Review", "deleteReview"),
  R("Review", "deleteReviewsForStore"),
  R("Review", "deleteReviewsByUser"),

  // --- Rating (internal-only mutations) ---
  R("Rating", "updateRating"),
  R("Rating", "deleteRatingForStore"),
];
