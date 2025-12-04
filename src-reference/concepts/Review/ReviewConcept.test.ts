import { assertEquals, assert } from "@test"; // Direct import
import { Db, MongoClient } from "mongodb";
import { testDb, freshID } from "@utils/database.ts";
import { ID, Empty } from "@utils/types.ts";
import ReviewConcept from "./ReviewConcept.ts";

Deno.test("ReviewConcept: All Scenarios", async (testContext) => {
  let db: Db | null = null; // Initialize to null
  let client: MongoClient | null = null; // Initialize to null
  let reviewConcept: ReviewConcept | null = null; // Initialize to null

  try {
    // Use the provided testDb utility for a clean test database
    [db, client] = await testDb();
    reviewConcept = new ReviewConcept(db);

    console.log(`\n--- Starting ReviewConcept Tests for Database: ${db.databaseName} ---`);

    await testContext.step("Operational Principle - Create a review and retrieve it for the store", async () => {
      // It's safe to use db and reviewConcept here because if we reached this point,
      // they must have been successfully assigned in the parent try block.
      const userId: ID = freshID();
      const storeId: ID = freshID();
      const text = "Great food and service!";
      const rating = 5;

      console.log(`\n--- Test Step: Operational Principle ---`);

      // 1. createReview
      console.log(
        `1. Action: createReview. Input: userId='${userId}', storeId='${storeId}', text='${text}', rating=${rating}`,
      );
      const createResult = await (reviewConcept as ReviewConcept).createReview({ userId, storeId, text, rating });
      console.log(`1. Output: ${JSON.stringify(createResult)}`);

      assert("reviewId" in createResult, "Expected createReview to return a reviewId.");
      const reviewId = createResult.reviewId;
      assert(reviewId, "reviewId should not be null or undefined.");

      // 2. getReviewsForStore
      console.log(`2. Action: getReviewsForStore. Input: storeId='${storeId}'`);
      const getForStoreResult = await (reviewConcept as ReviewConcept).getReviewsForStore({ storeId });
      console.log(`2. Output: ${JSON.stringify(getForStoreResult)}`);

      assert(getForStoreResult.reviewIds.has(reviewId), `Expected getReviewsForStore to include reviewId '${reviewId}'.`);
      assertEquals(getForStoreResult.reviewIds.size, 1, "Expected exactly one review for the store.");

      // Direct DB verification (optional, but good for understanding)
      const doc = await (db as Db).collection("Review.reviews").findOne({ _id: reviewId });
      console.log(`Verified DB state for reviewId '${reviewId}': ${JSON.stringify(doc)}`);
      assert(doc, "Review document should exist in DB.");
      assertEquals(doc.userId, userId, "Review's userId should match.");
      assertEquals(doc.storeId, storeId, "Review's storeId should match.");
      assertEquals(doc.text, text, "Review's text should match.");
      assertEquals(doc.rating, rating, "Review's rating should match.");

      console.log("--- Test Step Finished ---");
    });

    await testContext.step("Scenario 1 - createReview with an invalid rating", async () => {
      const userId: ID = freshID();
      const storeId: ID = freshID();
      const text = "Bad rating value test";
      const invalidRating = 0; // Rating must be between 1 and 5

      console.log(`\n--- Test Step: Scenario 1 ---`);

      console.log(
        `Action: createReview. Input: userId='${userId}', storeId='${storeId}', text='${text}', rating=${invalidRating}`,
      );
      const result = await (reviewConcept as ReviewConcept).createReview({ userId, storeId, text, rating: invalidRating });
      console.log(`Output: ${JSON.stringify(result)}`);

      assert("error" in result, "Expected createReview to return an error for invalid rating.");
      assertEquals(result.error, "Rating must be between 1 and 5.", "Error message should match for invalid rating.");

      // Verify no review was created
      const reviewsCount = await (db as Db).collection("Review.reviews").countDocuments({ userId, storeId });
      assertEquals(reviewsCount, 0, "No review should have been created for invalid rating.");

      console.log("--- Test Step Finished ---");
    });

    await testContext.step("Scenario 2 - Delete an existing review and verify its absence", async () => {
      const userId: ID = freshID();
      const storeId: ID = freshID();
      const text = "Review to be deleted";
      const rating = 4;

      console.log(`\n--- Test Step: Scenario 2 ---`);

      // 1. Create a review first
      console.log(
        `1. Action: createReview. Input: userId='${userId}', storeId='${storeId}', text='${text}', rating=${rating}`,
      );
      const createResult = await (reviewConcept as ReviewConcept).createReview({ userId, storeId, text, rating });
      console.log(`1. Output: ${JSON.stringify(createResult)}`);
      assert("reviewId" in createResult, "Expected reviewId from creation.");
      const reviewId = createResult.reviewId;

      // Verify initial state
      const initialDoc = await (db as Db).collection("Review.reviews").findOne({ _id: reviewId });
      assert(initialDoc, "Review document should exist before deletion.");

      // 2. deleteReview
      console.log(`2. Action: deleteReview. Input: reviewId='${reviewId}'`);
      const deleteResult = await (reviewConcept as ReviewConcept).deleteReview({ reviewId });
      console.log(`2. Output: ${JSON.stringify(deleteResult)}`);
      assertEquals(deleteResult, {}, "Expected successful deletion (empty object).");

      // 3. Verify deletion using getReviewsForStore
      console.log(`3. Action: getReviewsForStore. Input: storeId='${storeId}'`);
      const getForStoreResult = await (reviewConcept as ReviewConcept).getReviewsForStore({ storeId });
      console.log(`3. Output: ${JSON.stringify(getForStoreResult)}`);
      assert(!getForStoreResult.reviewIds.has(reviewId), `Expected reviewId '${reviewId}' to be absent after deletion.`);
      assertEquals(getForStoreResult.reviewIds.size, 0, "Expected no reviews for the store after deletion.");

      // Direct DB verification (optional)
      const docAfterDelete = await (db as Db).collection("Review.reviews").findOne({ _id: reviewId });
      console.log(`Verified DB state for reviewId '${reviewId}' after deletion: ${JSON.stringify(docAfterDelete)}`);
      assertEquals(docAfterDelete, null, "Review document should be null after deletion.");

      console.log("--- Test Step Finished ---");
    });

    await testContext.step("Scenario 3 - Attempt to delete a non-existent review", async () => {
      const nonExistentReviewId: ID = freshID();

      console.log(`\n--- Test Step: Scenario 3 ---`);

      console.log(`Action: deleteReview. Input: reviewId='${nonExistentReviewId}'`);
      const result = await (reviewConcept as ReviewConcept).deleteReview({ reviewId: nonExistentReviewId });
      console.log(`Output: ${JSON.stringify(result)}`);

      assert("error" in result, "Expected deleteReview to return an error for non-existent review.");
      assertEquals(result.error, `Review with ID '${nonExistentReviewId}' not found.`, "Error message should match.");

      console.log("--- Test Step Finished ---");
    });

    await testContext.step("Scenario 4 - Multiple reviews for the same store from different users", async () => {
      const storeId: ID = freshID();
      const userId1: ID = freshID();
      const userId2: ID = freshID();

      console.log(`\n--- Test Step: Scenario 4 ---`);

      // 1. User 1 creates a review for the store
      console.log(
        `1. Action: createReview. Input: userId='${userId1}', storeId='${storeId}', text='Review 1', rating=5`,
      );
      const createResult1 = await (reviewConcept as ReviewConcept).createReview({ userId: userId1, storeId, text: "Review 1", rating: 5 });
      console.log(`1. Output: ${JSON.stringify(createResult1)}`);
      assert("reviewId" in createResult1, "Expected reviewId from creation 1.");
      const reviewId1 = createResult1.reviewId;

      // 2. User 2 creates a review for the same store
      console.log(
        `2. Action: createReview. Input: userId='${userId2}', storeId='${storeId}', text='Review 2', rating=3`,
      );
      const createResult2 = await (reviewConcept as ReviewConcept).createReview({ userId: userId2, storeId, text: "Review 2", rating: 3 });
      console.log(`2. Output: ${JSON.stringify(createResult2)}`);
      assert("reviewId" in createResult2, "Expected reviewId from creation 2.");
      const reviewId2 = createResult2.reviewId;

      // 3. getReviewsForStore
      console.log(`3. Action: getReviewsForStore. Input: storeId='${storeId}'`);
      const getForStoreResult = await (reviewConcept as ReviewConcept).getReviewsForStore({ storeId });
      console.log(`3. Output: ${JSON.stringify(getForStoreResult)}`);

      assertEquals(getForStoreResult.reviewIds.size, 2, "Expected two reviews for the store.");
      assert(getForStoreResult.reviewIds.has(reviewId1), `Expected reviewId '${reviewId1}' to be present.`);
      assert(getForStoreResult.reviewIds.has(reviewId2), `Expected reviewId '${reviewId2}' to be present.`);

      console.log("--- Test Step Finished ---");
    });

    await testContext.step("Scenario 5 - Multiple reviews by the same user for different stores", async () => {
      const userId: ID = freshID();
      const storeId1: ID = freshID();
      const storeId2: ID = freshID();

      console.log(`\n--- Test Step: Scenario 5 ---`);

      // 1. User creates a review for Store 1
      console.log(
        `1. Action: createReview. Input: userId='${userId}', storeId='${storeId1}', text='User review for store 1', rating=4`,
      );
      const createResult1 = await (reviewConcept as ReviewConcept).createReview({ userId, storeId: storeId1, text: "User review for store 1", rating: 4 });
      console.log(`1. Output: ${JSON.stringify(createResult1)}`);
      assert("reviewId" in createResult1, "Expected reviewId from creation 1.");
      const reviewId1 = createResult1.reviewId;

      // 2. User creates a review for Store 2
      console.log(
        `2. Action: createReview. Input: userId='${userId}', storeId='${storeId2}', text='User review for store 2', rating=2`,
      );
      const createResult2 = await (reviewConcept as ReviewConcept).createReview({ userId, storeId: storeId2, text: "User review for store 2", rating: 2 });
      console.log(`2. Output: ${JSON.stringify(createResult2)}`);
      assert("reviewId" in createResult2, "Expected reviewId from creation 2.");
      const reviewId2 = createResult2.reviewId;

      // 3. getReviewsByUser
      console.log(`3. Action: getReviewsByUser. Input: userId='${userId}'`);
      const getByUserResult = await (reviewConcept as ReviewConcept).getReviewsByUser({ userId });
      console.log(`3. Output: ${JSON.stringify(getByUserResult)}`);

      assertEquals(getByUserResult.reviewIds.size, 2, "Expected two reviews by the user.");
      assert(getByUserResult.reviewIds.has(reviewId1), `Expected reviewId '${reviewId1}' to be present.`);
      assert(getByUserResult.reviewIds.has(reviewId2), `Expected reviewId '${reviewId2}' to be present.`);

      console.log("--- Test Step Finished ---");
    });

    console.log(`--- All ReviewConcept Tests Finished for Database: ${(db as Db).databaseName} ---`);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error(`Error during test setup or execution: ${message}`);
    // Re-throw the error to ensure the test fails if setup itself fails
    throw e;
  } finally {
    // Ensure the client connection is closed only once after all steps are complete,
    // even if an error occurs in a step or setup.
    if (client) {
      await client.close();
    }
  }
});