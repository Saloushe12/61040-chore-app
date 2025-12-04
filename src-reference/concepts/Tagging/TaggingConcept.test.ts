import { assert, assertEquals, assertArrayIncludes } from "@std/assert";
import { testDb, freshID } from "@utils/database.ts";
import TaggingConcept from "./TaggingConcept.ts";
import { ID } from "@utils/types.ts";
import { MongoClient } from "mongodb";

Deno.test("Tagging Concept - Core Workflow and Edge Cases", async (t) => {
  let taggingConcept: TaggingConcept;
  let client: MongoClient; // Declare client to ensure it's closed (will be from testDb)

  // Setup: Initialize a fresh test database and TaggingConcept instance once for all steps
  // testDb() internally drops all collections for a clean slate, providing isolated tests
  // for the entire Deno.test block.
  const [db, mongoClient] = await testDb();
  taggingConcept = new TaggingConcept(db);
  client = mongoClient;

  // Define unique store IDs for each major scenario to ensure isolation of state.
  const storeId_OpPrinciple_1 = freshID() as ID;
  const storeId_OpPrinciple_2 = freshID() as ID;
  const storeId_Scenario1 = freshID() as ID;
  const storeId_Scenario2_A = freshID() as ID; // For empty/special char tags
  const storeId_Scenario2_B = freshID() as ID; // For last tag removal

  try { // Use try...finally to ensure client closure for this Deno.test block
    await t.step("Operational Principle: Successfully add multiple tags and query stores by tags", async () => {
      console.log(`--- Running 'Operational Principle' test ---`);

      const tagA = "Electronics";
      const tagB = "Gadgets";
      const tagC = "NewArrivals";
      const commonTag = "Popular";

      // 1. Add tags to the first store
      console.log(`Action: addTag({ storeId: '${storeId_OpPrinciple_1}', tag: '${tagA}' })`);
      let result = await taggingConcept.addTag({ storeId: storeId_OpPrinciple_1, tag: tagA });
      assertEquals(result, {}, `Expected success for adding '${tagA}' to new store '${storeId_OpPrinciple_1}'`);

      console.log(`Action: addTag({ storeId: '${storeId_OpPrinciple_1}', tag: '${tagB}' })`);
      result = await taggingConcept.addTag({ storeId: storeId_OpPrinciple_1, tag: tagB });
      assertEquals(result, {}, `Expected success for adding '${tagB}' to '${storeId_OpPrinciple_1}'`);

      console.log(`Action: addTag({ storeId: '${storeId_OpPrinciple_1}', tag: '${commonTag}' })`);
      result = await taggingConcept.addTag({ storeId: storeId_OpPrinciple_1, tag: commonTag });
      assertEquals(result, {}, `Expected success for adding '${commonTag}' to '${storeId_OpPrinciple_1}'`);

      // 2. Add tags to a second store, including the common tag
      const tagD = "Books";
      console.log(`Action: addTag({ storeId: '${storeId_OpPrinciple_2}', tag: '${tagD}' })`);
      await taggingConcept.addTag({ storeId: storeId_OpPrinciple_2, tag: tagD });

      console.log(`Action: addTag({ storeId: '${storeId_OpPrinciple_2}', tag: '${commonTag}' })`);
      await taggingConcept.addTag({ storeId: storeId_OpPrinciple_2, tag: commonTag });

      // Verification of state after adding
      let store1Doc = await taggingConcept["taggings"].findOne({ _id: storeId_OpPrinciple_1 });
      assert(store1Doc, `Document for storeId '${storeId_OpPrinciple_1}' should exist`);
      assertArrayIncludes(store1Doc!.tags, [tagA, tagB, commonTag], `Store 1 should have tags`);
      assertEquals(store1Doc!.tags.length, 3, `Store 1 should have 3 tags`);

      let store2Doc = await taggingConcept["taggings"].findOne({ _id: storeId_OpPrinciple_2 });
      assert(store2Doc, `Document for storeId '${storeId_OpPrinciple_2}' should exist`);
      assertArrayIncludes(store2Doc!.tags, [tagD, commonTag], `Store 2 should have tags`);
      assertEquals(store2Doc!.tags.length, 2, `Store 2 should have 2 tags`);

      // 3. Query for stores by tags
      console.log(`Action: _getStoresByTag({ tag: '${tagA}' })`);
      let queryResult = await taggingConcept._getStoresByTag({ tag: tagA });
      assertEquals(queryResult, { storeIds: [storeId_OpPrinciple_1] }, `Expected storeId1 for tag '${tagA}'`);

      console.log(`Action: _getStoresByTag({ tag: '${tagD}' })`);
      queryResult = await taggingConcept._getStoresByTag({ tag: tagD });
      assertEquals(queryResult, { storeIds: [storeId_OpPrinciple_2] }, `Expected storeId2 for tag '${tagD}'`);

      console.log(`Action: _getStoresByTag({ tag: '${commonTag}' })`);
      queryResult = await taggingConcept._getStoresByTag({ tag: commonTag });
      const expectedCommonStoreIds = [storeId_OpPrinciple_1, storeId_OpPrinciple_2].sort();
      const actualCommonStoreIds = (queryResult as { storeIds: ID[] }).storeIds.sort();
      assertEquals(actualCommonStoreIds, expectedCommonStoreIds, `Expected both stores for common tag '${commonTag}'`);

      console.log(`--- End 'Operational Principle' test ---`);
    });

    await t.step("Scenario 1: Full Lifecycle & Idempotency (Add, Remove, Re-add, Re-remove, Query)", async () => {
      console.log(`--- Running 'Full Lifecycle & Idempotency' test ---`);

      const storeId = storeId_Scenario1;
      const tagX = "Fashion";
      const tagY = "Clothing";
      const nonExistentTag = "Unused";

      // 1. Add tags
      console.log(`Action: addTag({ storeId: '${storeId}', tag: '${tagX}' })`);
      let result = await taggingConcept.addTag({ storeId: storeId, tag: tagX });
      assertEquals(result, {}, `Expected success for adding '${tagX}'`);

      console.log(`Action: addTag({ storeId: '${storeId}', tag: '${tagY}' })`);
      result = await taggingConcept.addTag({ storeId: storeId, tag: tagY });
      assertEquals(result, {}, `Expected success for adding '${tagY}'`);

      let doc = await taggingConcept["taggings"].findOne({ _id: storeId });
      assert(doc, `Document for '${storeId}' should exist`);
      assertEquals(doc!.tags.length, 2, `Should have 2 tags`);
      assertArrayIncludes(doc!.tags, [tagX, tagY]);

      // 2. Attempt to re-add existing tag (idempotency)
      console.log(`Action: addTag({ storeId: '${storeId}', tag: '${tagX}' }) (again)`);
      result = await taggingConcept.addTag({ storeId: storeId, tag: tagX });
      assertEquals(result, {}, `Expected success for re-adding '${tagX}' (idempotent)`);
      doc = await taggingConcept["taggings"].findOne({ _id: storeId });
      assertEquals(doc!.tags.length, 2, `Count should still be 2 after re-adding existing tag`);

      // 3. Remove a tag
      console.log(`Action: removeTag({ storeId: '${storeId}', tag: '${tagX}' })`);
      result = await taggingConcept.removeTag({ storeId: storeId, tag: tagX });
      assertEquals(result, {}, `Expected success for removing '${tagX}'`);
      doc = await taggingConcept["taggings"].findOne({ _id: storeId });
      assertEquals(doc!.tags.length, 1, `Should have 1 tag left after removal`);
      assertArrayIncludes(doc!.tags, [tagY]);

      // 4. Attempt to remove a non-existent tag from an existing store (error case)
      console.log(`Action: removeTag({ storeId: '${storeId}', tag: '${nonExistentTag}' })`);
      result = await taggingConcept.removeTag({ storeId: storeId, tag: nonExistentTag });
      assert(result.error, `Expected error for removing non-existent tag '${nonExistentTag}'`);
      assertEquals(result.error, `Tag '${nonExistentTag}' not found for store ID '${storeId}'.`);
      doc = await taggingConcept["taggings"].findOne({ _id: storeId }); // Verify state unchanged
      assertEquals(doc!.tags.length, 1, `Count should still be 1 after failed removal`);
      assertArrayIncludes(doc!.tags, [tagY]);

      // 5. Query for the state
      console.log(`Action: _getStoresByTag({ tag: '${tagY}' })`);
      let queryResult = await taggingConcept._getStoresByTag({ tag: tagY });
      assertEquals(queryResult, { storeIds: [storeId] }, `Expected '${storeId}' for tag '${tagY}'`);

      console.log(`Action: _getStoresByTag({ tag: '${tagX}' })`);
      queryResult = await taggingConcept._getStoresByTag({ tag: tagX });
      assertEquals(queryResult, { storeIds: [] }, `Expected no storeIds for removed tag '${tagX}'`);

      console.log(`--- End 'Full Lifecycle & Idempotency' test ---`);
    });

    await t.step("Scenario 2: Edge Cases (Empty Tags, Non-Existent Entities, Document Deletion)", async () => {
      console.log(`--- Running 'Edge Cases' test ---`);

      // --- Store A: Empty/Special Char Tags ---
      const storeIdA = storeId_Scenario2_A;
      const tagEmpty = "";
      const tagSpecialChars = "Food & Drink (Vegan)";
      const nonExistentStoreId = freshID() as ID;

      // 1. Add tags with empty string and special characters
      console.log(`Action: addTag({ storeId: '${storeIdA}', tag: '${tagEmpty}' }) (empty string)`);
      let result = await taggingConcept.addTag({ storeId: storeIdA, tag: tagEmpty });
      assertEquals(result, {}, `Expected success for adding an empty string tag`);

      console.log(`Action: addTag({ storeId: '${storeIdA}', tag: '${tagSpecialChars}' }) (special characters)`);
      result = await taggingConcept.addTag({ storeId: storeIdA, tag: tagSpecialChars });
      assertEquals(result, {}, `Expected success for adding tag with special characters`);

      let docA = await taggingConcept["taggings"].findOne({ _id: storeIdA });
      assert(docA, `Document for '${storeIdA}' should exist`);
      assertEquals(docA!.tags.length, 2, `Should have 2 tags`);
      assertArrayIncludes(docA!.tags, [tagEmpty, tagSpecialChars]);

      // 2. Query for empty string tag
      console.log(`Action: _getStoresByTag({ tag: '' })`);
      let queryResult = await taggingConcept._getStoresByTag({ tag: "" });
      assertEquals((queryResult as { storeIds: ID[] }).storeIds, [storeIdA], `Expected '${storeIdA}' for empty string tag`);

      // 3. Attempt to remove from a non-existent store (error)
      console.log(`Action: removeTag({ storeId: '${nonExistentStoreId}', tag: 'any_tag' }) from non-existent store`);
      result = await taggingConcept.removeTag({ storeId: nonExistentStoreId, tag: "any_tag" });
      assert(result.error, `Expected error when removing from non-existent store`);
      assertEquals(result.error, `Store with ID '${nonExistentStoreId}' not found for tagging.`);


      // --- Store B: Document Deletion on Last Tag Removal ---
      const storeIdB = storeId_Scenario2_B;
      const soloTag = "SoloTag";

      // 1. Add the only tag to store B
      console.log(`Action: addTag({ storeId: '${storeIdB}', tag: '${soloTag}' })`);
      result = await taggingConcept.addTag({ storeId: storeIdB, tag: soloTag });
      assertEquals(result, {}, `Expected success for adding '${soloTag}' to new store '${storeIdB}'`);

      let docB_before = await taggingConcept["taggings"].findOne({ _id: storeIdB });
      assert(docB_before, `Document for '${storeIdB}' should exist before removing last tag`);
      assertEquals(docB_before!.tags.length, 1, `Should have 1 tag`);

      // 2. Query for the tag before removal
      console.log(`Action: _getStoresByTag({ tag: '${soloTag}' }) before removal`);
      queryResult = await taggingConcept._getStoresByTag({ tag: soloTag });
      assertEquals(queryResult, { storeIds: [storeIdB] }, `Expected '${storeIdB}' for '${soloTag}' before removal`);

      // 3. Remove the last tag (should trigger document deletion)
      console.log(`Action: removeTag({ storeId: '${storeIdB}', tag: '${soloTag}' }) (last tag)`);
      result = await taggingConcept.removeTag({ storeId: storeIdB, tag: soloTag });
      assertEquals(result, {}, `Expected success for removing the last tag '${soloTag}'`);

      // 4. Verify document is deleted
      let docB_after = await taggingConcept["taggings"].findOne({ _id: storeIdB });
      assertEquals(docB_after, null, `Document for '${storeIdB}' should be deleted after removing its last tag`);

      // 5. Query for the tag after document deletion
      console.log(`Action: _getStoresByTag({ tag: '${soloTag}' }) after removal`);
      queryResult = await taggingConcept._getStoresByTag({ tag: soloTag });
      assertEquals(queryResult, { storeIds: [] }, `Expected no storeIds for '${soloTag}' after document deletion`);

      console.log(`--- End 'Edge Cases' test ---`);
    });
  } finally {
    console.log("Closing MongoDB client after all Tagging Concept Deno.test steps.");
    await client.close(); // Close the client opened at the start of this Deno.test block
  }
});