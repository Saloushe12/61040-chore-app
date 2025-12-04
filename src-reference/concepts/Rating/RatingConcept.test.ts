import { assertEquals, assertExists } from "@std/assert";
import { ID } from "@utils/types.ts";
import { freshID, testDb } from "@utils/database.ts";
import RatingConcept from "./RatingConcept.ts";
import { MongoClient, Db } from "mongodb";

// Helper function with strict typing
const formatResult = (
  actionName: string,
  inputs: Record<string, unknown>,
  outputs: Record<string, unknown>,
) => {
  console.log(`--- ${actionName} ---`);
  console.log("Inputs:", JSON.stringify(inputs, null, 2));
  console.log("Outputs:", JSON.stringify(outputs, null, 2));
  console.log("-------------------\n");
};

/**
 * Utility to wrap each test case with its own DB lifecycle.
 */
async function withDb(
  testFn: (ratingConcept: RatingConcept) => Promise<void>,
) {
  const [db, client]: [Db, MongoClient] = await testDb();
  const ratingConcept = new RatingConcept(db);
  try {
    await testFn(ratingConcept);
  } finally {
    await client.close();
  }
}

Deno.test("Rating Concept: Operational Principle - Aggregating Reviews", async () => {
  await withDb(async (ratingConcept) => {
    const storeId: ID = freshID();

    const initialOutput = await ratingConcept.getRating({ storeId });
    formatResult("getRating", { storeId }, initialOutput);
    assertEquals(initialOutput, { aggregatedRating: 0, reviewCount: 0 });

    await ratingConcept.updateRating({ storeId, contribution: { rating: 5, weight: 1 } });
    const after1 = await ratingConcept.getRating({ storeId });
    formatResult("getRating", { storeId }, after1);
    assertEquals(after1, { aggregatedRating: 5, reviewCount: 1 });

    await ratingConcept.updateRating({ storeId, contribution: { rating: 3, weight: 1 } });
    const after2 = await ratingConcept.getRating({ storeId });
    formatResult("getRating", { storeId }, after2);
    assertEquals(after2, { aggregatedRating: 4, reviewCount: 2 });

    await ratingConcept.updateRating({ storeId, contribution: { rating: 4, weight: 1 } });
    const after3 = await ratingConcept.getRating({ storeId });
    formatResult("getRating", { storeId }, after3);
    assertEquals(after3, { aggregatedRating: 4, reviewCount: 3 });
  });
});

Deno.test("Scenario 1: No Reviews Initially", async () => {
  await withDb(async (ratingConcept) => {
    const storeId: ID = freshID();
    const output = await ratingConcept.getRating({ storeId });
    formatResult("getRating", { storeId }, output);
    assertEquals(output, { aggregatedRating: 0, reviewCount: 0 });
  });
});

Deno.test("Scenario 2: Zero Weight Contribution (No Change)", async () => {
  await withDb(async (ratingConcept) => {
    const storeId: ID = freshID();

    await ratingConcept.updateRating({ storeId, contribution: { rating: 5, weight: 1 } });
    const initial = await ratingConcept.getRating({ storeId });
    assertEquals(initial, { aggregatedRating: 5, reviewCount: 1 });

    const zeroWeightOutput = await ratingConcept.updateRating({
      storeId,
      contribution: { rating: 1, weight: 0 },
    });
    formatResult("updateRating", { storeId, weight: 0 }, zeroWeightOutput);
    assertEquals(zeroWeightOutput, {});

    const after = await ratingConcept.getRating({ storeId });
    assertEquals(after, { aggregatedRating: 5, reviewCount: 1 });
  });
});

Deno.test("Scenario 3: Negative Weight (Simulating Review Deletion)", async () => {
  await withDb(async (ratingConcept) => {
    const storeId: ID = freshID();

    await ratingConcept.updateRating({ storeId, contribution: { rating: 5, weight: 1 } });
    await ratingConcept.updateRating({ storeId, contribution: { rating: 3, weight: 1 } });

    const afterAdds = await ratingConcept.getRating({ storeId });
    assertEquals(afterAdds, { aggregatedRating: 4, reviewCount: 2 });

    await ratingConcept.updateRating({ storeId, contribution: { rating: 5, weight: -1 } });
    const afterRemove1 = await ratingConcept.getRating({ storeId });
    assertEquals(afterRemove1, { aggregatedRating: 3, reviewCount: 1 });

    await ratingConcept.updateRating({ storeId, contribution: { rating: 3, weight: -1 } });
    const afterRemove2 = await ratingConcept.getRating({ storeId });
    assertEquals(afterRemove2, { aggregatedRating: 0, reviewCount: 0 });
  });
});

Deno.test("Scenario 4: Error when Negative Review Count Would Occur", async () => {
  await withDb(async (ratingConcept) => {
    const storeId: ID = freshID();

    await ratingConcept.updateRating({ storeId, contribution: { rating: 5, weight: 1 } });
    const output = await ratingConcept.updateRating({
      storeId,
      contribution: { rating: 1, weight: -2 },
    });
    assertExists((output as { error: string }).error);
    assertEquals(
      (output as { error: string }).error,
      `Cannot update rating: resulting review count for store ${storeId} would be negative (-1).`,
    );

    const current = await ratingConcept.getRating({ storeId });
    assertEquals(current, { aggregatedRating: 5, reviewCount: 1 });
  });
});

Deno.test("Scenario 5: Multiple Independent Stores", async () => {
  await withDb(async (ratingConcept) => {
    const storeIdA: ID = freshID();
    const storeIdB: ID = freshID();
    const storeIdC: ID = freshID();

    await ratingConcept.updateRating({ storeId: storeIdA, contribution: { rating: 4, weight: 1 } });
    await ratingConcept.updateRating({ storeId: storeIdA, contribution: { rating: 5, weight: 1 } });

    await ratingConcept.updateRating({ storeId: storeIdB, contribution: { rating: 2, weight: 1 } });
    await ratingConcept.updateRating({ storeId: storeIdB, contribution: { rating: 3, weight: 1 } });
    await ratingConcept.updateRating({ storeId: storeIdB, contribution: { rating: 4, weight: 1 } });

    const ratingA = await ratingConcept.getRating({ storeId: storeIdA });
    const ratingB = await ratingConcept.getRating({ storeId: storeIdB });
    const ratingC = await ratingConcept.getRating({ storeId: storeIdC });

    assertEquals(ratingA, { aggregatedRating: 4.5, reviewCount: 2 });
    assertEquals(ratingB, { aggregatedRating: 3, reviewCount: 3 });
    assertEquals(ratingC, { aggregatedRating: 0, reviewCount: 0 });
  });
});
