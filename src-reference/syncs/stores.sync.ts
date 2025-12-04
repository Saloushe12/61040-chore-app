// src/syncs/stores.sync.ts
import { actions, Sync } from "@engine";
import { Rating, Requesting, Review, Store, Tagging } from "@concepts";

/* ------------------------ Create store: request/response ------------------------ */

export const CreateStoreRequest: Sync = (
  { request, name, address, storeId },
) => ({
  when: actions(
    [Requesting.request, { path: "/Store/createStore", name, address }, {
      request,
    }],
  ),
  then: actions(
    [Store.createStore, { name, address }, { storeId }],
  ),
});

export const CreateStoreResponseSuccess: Sync = ({ request, storeId }) => ({
  when: actions(
    [Requesting.request, { path: "/Store/createStore" }, { request }],
    [Store.createStore, {}, { storeId }],
  ),
  then: actions(
    [Requesting.respond, { request, storeId }, { request }],
  ),
});

export const CreateStoreResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Store/createStore" }, { request }],
    [Store.createStore, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }, { request }],
  ),
});

/* ------------------------ Delete store: request/response ------------------------ */

export const DeleteStoreRequest: Sync = ({ request, storeId }) => ({
  when: actions(
    [Requesting.request, { path: "/Store/deleteStore", storeId }, { request }],
  ),
  where: async (frames) => {
    // Ensure store exists
    frames = await frames.query(Store._storeExists, { storeId }, { storeId });
    return frames;
  },
  then: actions(
    [Store.deleteStore, { storeId }, {}],
  ),
});

export const DeleteStoreResponseSuccess: Sync = ({ request, storeId }) => ({
  when: actions(
    [Requesting.request, { path: "/Store/deleteStore", storeId }, { request }],
    [Store.deleteStore, {}, {}],
  ),
  then: actions(
    // Avoid interpolating a symbol as a string. Return id as data.
    [Requesting.respond, { request, status: "success", storeId }, { request }],
  ),
});

export const DeleteStoreResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Store/deleteStore" }, { request }],
    [Store.deleteStore, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }, { request }],
  ),
});

/* ------------------------ Cascades after store deletion ------------------------ */

export const CascadeStoreDeletion: Sync = ({ storeId }) => ({
  when: actions(
    [Store.deleteStore, { storeId }, {}],
  ),
  then: actions(
    [Tagging.deleteTagsForStore, { storeId }, {}],
    [Review.deleteReviewsForStore, { storeId }, {}],
    [Rating.deleteRatingForStore, { storeId }, {}],
  ),
});
