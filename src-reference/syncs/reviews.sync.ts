// src/syncs/reviews.sync.ts
import { actions, Sync } from "@engine";
import { Rating, Requesting, Review, Store, User } from "@concepts";

/* ---------------------- Create Review (request → action) ---------------------- */

export const CreateReviewRequest: Sync = (
  { request, userId, storeId, rating, text },
) => ({
  when: actions(
    [Requesting.request, {
      path: "/Review/createReview",
      userId,
      storeId,
      rating,
      text,
    }, { request }],
  ),
  where: async (frames) => {
    // Validate user exists
    frames = await frames.query(User._userExists, { userId }, { userId });
    // Validate store exists
    frames = await frames.query(Store._storeExists, { storeId }, { storeId });
    return frames;
  },
  then: actions(
    // Only invoke the action here. Do NOT try to respond with {reviewId} in this same sync.
    [Review.createReview, { userId, storeId, rating, text }, {}],
  ),
});

/* ---------------------- Create Review (success response) ---------------------- */

export const CreateReviewResponseSuccess: Sync = ({ request, reviewId }) => ({
  when: actions(
    [Requesting.request, { path: "/Review/createReview" }, { request }],
    // Match successful createReview (captures reviewId from the action’s output)
    [Review.createReview, {}, { reviewId }],
  ),
  then: actions(
    [Requesting.respond, { request, reviewId }, { request }],
  ),
});

/* ----------------------- Create Review (error response) ----------------------- */

export const CreateReviewResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Review/createReview" }, { request }],
    [Review.createReview, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }, { request }],
  ),
});

/* ----------------------- Delete Review (request → actions) -------------------- */

export const DeleteReviewRequest: Sync = (
  { request, reviewId, storeId, rating },
) => ({
  when: actions(
    [Requesting.request, { path: "/Review/deleteReview", reviewId }, {
      request,
    }],
  ),
  where: async (frames) => {
    // Fetch storeId & rating BEFORE deletion so we can adjust the aggregate.
    // Your Review concept provides _getReviewByIdFull with the needed fields.
    frames = await frames.query(Review._getReviewByIdFull, { reviewId }, {
      reviewId,
      storeId,
      rating,
    });
    return frames; // If empty, THEN won't fire.
  },
  then: actions(
    // Subtract this review’s contribution: keep rating as-is, set weight: -1.
    [
      Rating.updateRating,
      { storeId, contribution: { rating, weight: -1 } },
      {},
    ],
    // Then delete the review.
    [Review.deleteReview, { reviewId }, {}],
  ),
});

/* ----------------------- Delete Review (success response) --------------------- */

export const DeleteReviewResponseSuccess: Sync = ({ request, reviewId }) => ({
  when: actions(
    [Requesting.request, { path: "/Review/deleteReview", reviewId }, {
      request,
    }],
    [Review.deleteReview, {}, {}], // successful deletion
  ),
  then: actions(
    [Requesting.respond, { request, status: "success", reviewId }, { request }],
  ),
});

/* ------------------------ Delete Review (error response) ---------------------- */

export const DeleteReviewResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Review/deleteReview" }, { request }],
    [Review.deleteReview, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }, { request }],
  ),
});

/* -------------------------- Aggregation on create ----------------------------- */

export const AggregateReviewRating: Sync = (
  { userId, storeId, text, rating, reviewId },
) => ({
  when: actions(
    // Capture inputs and the success output of createReview
    [Review.createReview, { userId, storeId, text, rating }, { reviewId }],
  ),
  then: actions(
    // Add this review’s contribution to the aggregate
    [Rating.updateRating, { storeId, contribution: { rating, weight: 1 } }, {}],
  ),
});
