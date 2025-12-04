import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

const PREFIX = "Review" + ".";

type User = ID;
type Store = ID;

/**
 * Each Review record:
 * _id: ID (reviewId)
 * storeId: String (references a Store)
 * userId: String (references a User)
 * text: String (the content of the review)
 * rating: Number (a specific numeric rating for this review, e.g., 1-5)
 */
interface ReviewDoc {
  _id: ID; // The reviewId is the document's _id
  storeId: Store;
  userId: User;
  text: string;
  rating: number;
}

/**
 * @concept Review
 * @purpose To capture textual reviews and individual ratings submitted by users for specific stores.
 *          This concept is solely responsible for the *individual* review data.
 */
export default class ReviewConcept {
  private reviewsCollection: Collection<ReviewDoc>;

  constructor(private readonly db: Db) {
    this.reviewsCollection = this.db.collection(PREFIX + "reviews");
  }

  /**
   * createReview(userId: String, storeId: String, text: String, rating: Number): { reviewId: String } | { error: String }
   *
   * @requires The `userId` must exist. The `storeId` must exist. The `rating` should be within a valid range (e.g., 1-5).
   * @effects Creates a new `Review` record and returns its unique `reviewId`.
   *          This action *does not* update aggregate ratings; that is handled by a `sync`.
   * @returns { reviewId } on success, or { error } if requirements are not met or an internal error occurs.
   */
  async createReview(
    { userId, storeId, text, rating }: {
      userId: User;
      storeId: Store;
      text: string;
      rating: number;
    },
  ): Promise<{ reviewId: ID } | { error: string }> {
    try {
      if (rating < 1 || rating > 5) {
        return { error: "Rating must be between 1 and 5." };
      }

      const reviewId = freshID();
      const newReview: ReviewDoc = {
        _id: reviewId,
        userId,
        storeId,
        text,
        rating,
      };

      await this.reviewsCollection.insertOne(newReview);
      return { reviewId };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Unknown error";
      console.error(`Error creating review: ${message}`);
      return { error: `Internal server error: ${message}` };
    }
  }

  /**
   * deleteReview(reviewId: String): {} | { error: String }
   *
   * @requires The `reviewId` must exist.
   * @effects Deletes the specified `Review` record.
   * @returns {} on success, or { error } if the review does not exist or an internal error occurs.
   */
  async deleteReview(
    { reviewId }: { reviewId: ID },
  ): Promise<Empty | { error: string }> {
    try {
      const result = await this.reviewsCollection.deleteOne({ _id: reviewId });
      if (result.deletedCount === 1) {
        return {};
      } else {
        return { error: `Review with ID '${reviewId}' not found.` };
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Unknown error";
      console.error(`Error deleting review: ${message}`);
      return { error: `Internal server error: ${message}` };
    }
  }

  /**
   * deleteReviewsForStore(storeId: String): {} | { error: String }
   *
   * @requires The `storeId` must exist.
   * @effects Removes all `Review` records associated with the specified `storeId`.
   *          This action is typically invoked by a synchronization.
   * @returns {} on success, or { error } on failure.
   */
  async deleteReviewsForStore(
    { storeId }: { storeId: Store },
  ): Promise<Empty | { error: string }> {
    try {
      await this.reviewsCollection.deleteMany({ storeId: storeId });
      return {}; // Success, even if no reviews were found/deleted (idempotent)
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Unknown error";
      console.error(
        `Error deleting reviews for store '${storeId}': ${message}`,
      );
      return { error: `Failed to delete reviews for store: ${message}` };
    }
  }

  /**
   * deleteReviewsByUser(userId: String): {} | { error: String }
   *
   * @requires The `userId` must exist.
   * @effects Removes all `Review` records created by the specified `userId`.
   *          This action is typically invoked by a synchronization.
   * @returns {} on success, or { error } on failure.
   */
  async deleteReviewsByUser(
    { userId }: { userId: User },
  ): Promise<Empty | { error: string }> {
    try {
      await this.reviewsCollection.deleteMany({ userId: userId });
      return {}; // Success, even if no reviews were found/deleted (idempotent)
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Unknown error";
      console.error(`Error deleting reviews by user '${userId}': ${message}`);
      return { error: `Failed to delete reviews by user: ${message}` };
    }
  }

  /**
   * _getReviewByIdFull(reviewId: String): (reviewId: String, storeId: String, userId: String, text: String, rating: Number)
   *
   * @requires The `reviewId` must exist.
   * @effects Returns the full details of the specified review.
   * @returns An array containing a single object with full review details on success.
   *          Returns an empty array if the `reviewId` does not exist.
   */
  async _getReviewByIdFull(
    { reviewId }: { reviewId: ID },
  ): Promise<
    Array<
      { reviewId: ID; storeId: ID; userId: ID; text: string; rating: number }
    >
  > {
    const review = await this.reviewsCollection.findOne({ _id: reviewId });
    if (!review) {
      return [];
    }
    return [{
      reviewId: review._id,
      storeId: review.storeId,
      userId: review.userId,
      text: review.text,
      rating: review.rating,
    }];
  }

  /**
   * _getReviewsForStoreFull(storeId: String): (reviewId: String, storeId: String, userId: String, text: String, rating: Number)
   *
   * @requires true
   * @effects Returns a list of all review details associated with the specified `storeId`.
   * @returns An array of objects, each with full review details.
   *          Returns an empty array if no reviews are found for the `storeId`.
   */
  async _getReviewsForStoreFull(
    { storeId }: { storeId: Store },
  ): Promise<
    Array<
      { reviewId: ID; storeId: ID; userId: ID; text: string; rating: number }
    >
  > {
    const reviews = await this.reviewsCollection.find({ storeId: storeId })
      .toArray();
    return reviews.map((r) => ({
      reviewId: r._id,
      storeId: r.storeId,
      userId: r.userId,
      text: r.text,
      rating: r.rating,
    }));
  }

  /**
   * _getReviewsByUserFull(userId: String): (reviewId: String, storeId: String, userId: String, text: String, rating: Number)
   *
   * @requires true
   * @effects Returns a list of all review details created by the specified `userId`.
   * @returns An array of objects, each with full review details.
   *          Returns an empty array if no reviews are found for the `userId`.
   */
  async _getReviewsByUserFull(
    { userId }: { userId: User },
  ): Promise<
    Array<
      { reviewId: ID; storeId: ID; userId: ID; text: string; rating: number }
    >
  > {
    const reviews = await this.reviewsCollection.find({ userId: userId })
      .toArray();
    return reviews.map((r) => ({
      reviewId: r._id,
      storeId: r.storeId,
      userId: r.userId,
      text: r.text,
      rating: r.rating,
    }));
  }
}
