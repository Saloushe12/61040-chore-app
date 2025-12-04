import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";

const PREFIX = "Rating" + ".";

/**
 * Interface representing the structure of a Rating record in the database.
 * Each record aggregates rating information for a specific store.
 *
 * @property _id The unique identifier for the store, serving as the document's primary key.
 *               This corresponds to the storeId passed to actions.
 * @property aggregatedRating The calculated average or composite rating for the store.
 * @property reviewCount The total number of reviews contributing to the aggregated rating.
 */
interface RatingDoc {
  _id: ID; // References a Store's ID (e.g., from the Store concept)
  aggregatedRating: number;
  reviewCount: number;
}

/**
 * @concept Rating
 * @purpose To maintain an aggregated rating score and count for a store, derived from individual reviews.
 * @principle After a series of individual review contributions (e.g., from the Review concept),
 *            this concept correctly aggregates the rating scores and maintains an accurate count,
 *            making the store's overall standing readily available for queries and decisions.
 */
export default class RatingConcept {
  ratings: Collection<RatingDoc>;

  constructor(private readonly db: Db) {
    this.ratings = this.db.collection(PREFIX + "ratings");
  }

  /**
   * updateRating(storeId: ID, contribution: { rating: Number, weight: Number }): {} | { error: String }
   *
   * @requires The `storeId` must conceptually refer to an existing store in the system.
   *           The `contribution.weight` should not lead to a negative `reviewCount` for the store.
   * @effects Updates the `aggregatedRating` and increments/decrements the `reviewCount`
   *          for the `storeId` based on the provided `contribution`.
   *          If no rating record exists for the `storeId`, it is initialized with the contribution.
   * @returns {} on success, or { error: String } if the `newReviewCount` would become negative.
   */
  async updateRating(
    { storeId, contribution }: {
      storeId: ID;
      contribution: { rating: number; weight: number };
    },
  ): Promise<Empty | { error: string }> {
    if (contribution.weight === 0) {
      return {};
    }

    const existingRating = await this.ratings.findOne({ _id: storeId });
    const currentAggregatedRating = existingRating?.aggregatedRating ?? 0;
    const currentReviewCount = existingRating?.reviewCount ?? 0;
    const currentTotalSum = currentAggregatedRating * currentReviewCount;

    const newReviewCount = currentReviewCount + contribution.weight;
    const newTotalSum = currentTotalSum +
      (contribution.rating * contribution.weight);

    if (newReviewCount < 0) {
      return {
        error:
          `Cannot update rating: resulting review count for store ${storeId} would be negative (${newReviewCount}).`,
      };
    }

    const newAggregatedRating = newReviewCount === 0
      ? 0
      : newTotalSum / newReviewCount;

    await this.ratings.updateOne(
      { _id: storeId },
      {
        $set: {
          aggregatedRating: newAggregatedRating,
          reviewCount: newReviewCount,
        },
      },
      { upsert: true },
    );

    return {};
  }

  /**
   * _getRating(storeId: String): (storeId: String, aggregatedRating: Number, reviewCount: Number)
   *
   * @requires true
   * @effects Returns the current aggregated rating and the count of reviews for the specified store.
   * @returns An array containing a single object with `storeId`, `aggregatedRating`, and `reviewCount` on success.
   *          Returns an empty array if no rating record exists for the `storeId`, indicating no reviews.
   */
  async _getRating(
    { storeId }: { storeId: ID },
  ): Promise<
    Array<{ storeId: ID; aggregatedRating: number; reviewCount: number }>
  > {
    const ratingRecord = await this.ratings.findOne({ _id: storeId });

    if (!ratingRecord) {
      // Per engine rules, queries return an empty array for "not found" or no match.
      return [];
    }

    return [{
      storeId: ratingRecord._id,
      aggregatedRating: ratingRecord.aggregatedRating,
      reviewCount: ratingRecord.reviewCount,
    }];
  }

  /**
   * deleteRatingForStore(storeId: String): {} | { error: String }
   *
   * @requires The `storeId` must exist.
   * @effects Removes the `Rating` record for the specified `storeId`.
   * @returns {} on success, or { error: String } if the record could not be deleted.
   */
  async deleteRatingForStore(
    { storeId }: { storeId: ID },
  ): Promise<Empty | { error: string }> {
    try {
      const result = await this.ratings.deleteOne({ _id: storeId });
      if (result.deletedCount === 1) {
        return {};
      } else {
        // If deletedCount is 0, it means no rating record existed for that storeId,
        // which can be considered a success for "delete if exists" semantics,
        // or an error if strict existence is required. For cascading, empty is fine.
        return {}; // No error if nothing to delete
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Unknown error";
      console.error(`Error deleting rating for store '${storeId}': ${message}`);
      return { error: `Failed to delete rating: ${message}` };
    }
  }
}
