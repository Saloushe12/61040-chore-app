import { actions, Frames, Sync } from "@engine";
import { Rating, Requesting, Store, Tagging } from "@concepts";

// --- Request-Response Flow for Tagging ---

export const AddTagRequest: Sync = ({ request, storeId, tag }) => ({
  when: actions([
    Requesting.request,
    { path: "/Tagging/addTag", storeId, tag },
    { request },
  ]),
  then: actions([
    Tagging.addTag,
    { storeId, tag },
    {}, // Output binding for addTag (returns Empty on success)
  ]),
});

export const AddTagResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/Tagging/addTag" }, { request }],
    [Tagging.addTag, {}, {}], // Match successful addTag
  ),
  then: actions([
    Requesting.respond,
    { request, status: "success" },
    { request },
  ]),
});

export const AddTagResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Tagging/addTag" }, { request }],
    [Tagging.addTag, {}, { error }], // Match failed addTag
  ),
  then: actions([
    Requesting.respond,
    { request, error: error },
    { request },
  ]),
});

// --- NEW: Remove Tag Flow ---

export const RemoveTagRequest: Sync = ({ request, storeId, tag }) => ({
  when: actions([
    Requesting.request,
    { path: "/Tagging/removeTag", storeId, tag },
    { request },
  ]),
  // Optional: Add where clause to validate storeId existence or tag presence before attempting removal
  // where: async (frames) => await frames.query(Store._storeExists, { storeId }, { storeId }),
  then: actions([
    Tagging.removeTag,
    { storeId, tag },
    {}, // Output binding for removeTag (returns Empty on success)
  ]),
});

export const RemoveTagResponseSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/Tagging/removeTag" }, { request }],
    [Tagging.removeTag, {}, {}],
  ),
  then: actions([
    Requesting.respond,
    { request, status: "success", message: "Tag removed successfully." },
    { request },
  ]),
});

export const RemoveTagResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Tagging/removeTag" }, { request }],
    [Tagging.removeTag, {}, { error }],
  ),
  then: actions([
    Requesting.respond,
    { request, error: error },
    { request },
  ]),
});

// --- Example Query Orchestration Syncs ---

export const GetStoresByTagRequestAndResponse: Sync = (
  {
    request,
    tag,
    storeId,
    name,
    address,
    aggregatedRating,
    reviewCount,
    results,
    error,
  },
) => ({
  when: actions([
    Requesting.request,
    { path: "/Tagging/getStoresByTag", tag },
    { request },
  ]),
  where: async (frames) => {
    const originalRequestFrame = frames[0];

    // Query Tagging to get store IDs for the given tag
    frames = await frames.query(Tagging._getStoresByTag, { tag: tag }, {
      storeId,
    });

    if (frames.length === 0) {
      // If no stores found for the tag, respond with empty results
      return new Frames({ ...originalRequestFrame, [results]: [] });
    }

    // For each storeId found, get its details from the Store concept
    frames = await frames.query(Store._getStoreDetails, { storeId: storeId }, {
      name,
      address,
    });
    // Filter out frames where _getStoreDetails returned empty, meaning the store ID from tagging didn't yield a store.
    frames = frames.filter((f) => f[name] && f[address]);

    if (frames.length === 0) {
      return new Frames({
        ...originalRequestFrame,
        [results]: [],
        [error]: "No matching stores found or store details missing.",
      });
    }

    // For each valid store, get its rating from the Rating concept
    frames = await frames.query(Rating._getRating, { storeId: storeId }, {
      aggregatedRating,
      reviewCount,
    });
    // _getRating returns [0,0] if no record exists, so no additional filtering needed here based on its non-empty return.

    return frames.collectAs([
      storeId,
      name,
      address,
      aggregatedRating,
      reviewCount,
    ], results);
  },
  then: actions([
    Requesting.respond,
    { request, results: results, error: error },
    { request },
  ]),
});
