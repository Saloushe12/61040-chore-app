import { assertEquals, assertExists, assertNotEquals, assertArrayIncludes } from "@test";
import { testDb } from "@utils/database.ts";
import StoreConcept from "./StoreConcept.ts";
import { MongoClient, Db } from "mongodb";
import { ID } from "@utils/types.ts";

Deno.test("Store Concept Comprehensive Tests", async (test) => {
  let db: Db | null = null;
  let client: MongoClient | null = null;
  let storeConcept: StoreConcept;

  // --- Setup (executed once at the beginning of this Deno.test block) ---
  console.log("StoreConcept Setup: Initializing test database...");
  [db, client] = await testDb(); // testDb() automatically drops all collections in the test database, ensuring a clean state.
  storeConcept = new StoreConcept(db!);
  console.log("StoreConcept setup complete. Test database initialized and cleared.");

  // Variables to hold store IDs for cross-step verification
  let storeIdA: ID;
  let storeIdB: ID;
  let storeIdC: ID;
  let storeIdToDelete: ID;
  let storeIdEmpty: ID;
  let storeIdNameOnlyEmpty: ID;

  await test.step("Operational Principle: Create, Retrieve, and Query Multiple Stores", async () => {
    const name1 = "Grocery Central";
    const address1 = "100 Market St";
    const name2 = "Grocery Express";
    const address2 = "200 Market St";
    const name3 = "Hardware Hub";
    const address3 = "100 Market St"; // Same address as name1

    // 1. Create multiple stores
    console.log(`Creating Store A: Name="${name1}", Address="${address1}"`);
    const resultA = await storeConcept.createStore({ name: name1, address: address1 });
    assertExists((resultA as { storeId: ID }).storeId, "Store A creation should succeed.");
    storeIdA = (resultA as { storeId: ID }).storeId;
    console.log(`Store A created: ${JSON.stringify(resultA)}`);

    console.log(`Creating Store B: Name="${name2}", Address="${address2}"`);
    const resultB = await storeConcept.createStore({ name: name2, address: address2 });
    assertExists((resultB as { storeId: ID }).storeId, "Store B creation should succeed.");
    storeIdB = (resultB as { storeId: ID }).storeId;
    console.log(`Store B created: ${JSON.stringify(resultB)}`);

    console.log(`Creating Store C: Name="${name3}", Address="${address3}"`);
    const resultC = await storeConcept.createStore({ name: name3, address: address3 });
    assertExists((resultC as { storeId: ID }).storeId, "Store C creation should succeed.");
    storeIdC = (resultC as { storeId: ID }).storeId;
    console.log(`Store C created: ${JSON.stringify(resultC)}`);

    assertNotEquals(storeIdA, storeIdB, "Store IDs A and B should be different.");
    assertNotEquals(storeIdA, storeIdC, "Store IDs A and C should be different.");
    assertNotEquals(storeIdB, storeIdC, "Store IDs B and C should be different.");

    // 2. Retrieve a store by ID
    console.log(`Retrieving Store A by ID: ${storeIdA}`);
    const retrievedA = await storeConcept._getStore({ storeId: storeIdA });
    assertExists((retrievedA as { name: string }).name, "Store A should be retrievable.");
    assertEquals((retrievedA as { name: string }).name, name1, "Retrieved Store A name should match.");
    assertEquals((retrievedA as { address: string }).address, address1, "Retrieved Store A address should match.");
    console.log(`Store A retrieved: ${JSON.stringify(retrievedA)}`);

    // 3. Query stores by name
    console.log(`Querying stores by name: "${name1}"`);
    const storesByName1 = await storeConcept._getStoresByName({ name: name1 });
    assertEquals(storesByName1 instanceof Set, true, "Result should be a Set.");
    assertEquals(storesByName1.size, 1, `Should find 1 store with name "${name1}".`);
    assertArrayIncludes(Array.from(storesByName1), [storeIdA], "Set should contain Store A's ID.");
    console.log(`Stores found by name "${name1}": ${JSON.stringify(Array.from(storesByName1))}`);

    console.log(`Querying stores by name: "${name2}"`);
    const storesByName2 = await storeConcept._getStoresByName({ name: name2 });
    assertEquals(storesByName2.size, 1, `Should find 1 store with name "${name2}".`);
    assertArrayIncludes(Array.from(storesByName2), [storeIdB], "Set should contain Store B's ID.");
    console.log(`Stores found by name "${name2}": ${JSON.stringify(Array.from(storesByName2))}`);

    // 4. Query stores by address
    console.log(`Querying stores by address: "${address1}"`);
    const storesByAddress1 = await storeConcept._getStoresByAddress({ address: address1 });
    assertEquals(storesByAddress1 instanceof Set, true, "Result should be a Set.");
    assertEquals(storesByAddress1.size, 2, `Should find 2 stores with address "${address1}".`);
    assertArrayIncludes(Array.from(storesByAddress1), [storeIdA, storeIdC], "Set should contain Store A and C IDs.");
    console.log(`Stores found by address "${address1}": ${JSON.stringify(Array.from(storesByAddress1))}`);
  });

  await test.step("Scenario 1: Duplicate Creation and Non-Existent Retrieval Attempts", async () => {
    const name = "Unique Corner Store";
    const address = "789 Quiet St";

    // 1. Create a store successfully
    console.log(`Creating initial store for duplication test: Name="${name}", Address="${address}"`);
    const initialResult = await storeConcept.createStore({ name, address });
    assertExists((initialResult as { storeId: ID }).storeId, "Initial store creation should succeed.");
    console.log(`Initial store created: ${JSON.stringify(initialResult)}`);

    // 2. Attempt to create an identical duplicate (expect error)
    console.log(`Attempting to create duplicate store: Name="${name}", Address="${address}"`);
    const duplicateResult = await storeConcept.createStore({ name, address });
    assertExists((duplicateResult as { error: string }).error, "Should return an error for duplicate store.");
    assertEquals(
      (duplicateResult as { error: string }).error,
      "A store with the same name and address already exists.",
      "Error message should indicate duplicate store.",
    );
    console.log(`Duplicate store creation failed as expected: ${JSON.stringify(duplicateResult)}`);

    // 3. Attempt to retrieve a non-existent store by ID (expect error)
    const nonExistentId = "non_existent_id_123" as ID;
    console.log(`Attempting to retrieve non-existent store with ID: ${nonExistentId}`);
    const resultNonExistent = await storeConcept._getStore({ storeId: nonExistentId });
    assertExists((resultNonExistent as { error: string }).error, "Should return an error for non-existent store.");
    assertEquals(
      (resultNonExistent as { error: string }).error,
      `Store with ID '${nonExistentId}' not found.`,
      "Error message should indicate store not found.",
    );
    console.log(`Retrieval of non-existent store failed as expected: ${JSON.stringify(resultNonExistent)}`);
  });

  await test.step("Scenario 2: Store Deletion Lifecycle and Error Handling", async () => {
    const name = "Ephemeral Pop-Up";
    const address = "500 Temporary Ave";

    // 1. Create a store to be deleted
    console.log(`Creating store for deletion: Name="${name}", Address="${address}"`);
    const createResult = await storeConcept.createStore({ name, address });
    assertExists((createResult as { storeId: ID }).storeId, "Store creation for deletion should succeed.");
    storeIdToDelete = (createResult as { storeId: ID }).storeId;
    console.log(`Store created for deletion: ${JSON.stringify(createResult)}`);

    // 2. Delete the newly created store
    console.log(`Attempting to delete store with ID: ${storeIdToDelete}`);
    const deleteResult = await storeConcept.deleteStore({ storeId: storeIdToDelete });
    assertEquals(deleteResult, {}, "Should return an empty object on successful deletion.");
    console.log(`Store deleted successfully: ${JSON.stringify(deleteResult)}`);

    // 3. Verify it's no longer retrievable
    console.log(`Attempting to retrieve deleted store with ID: ${storeIdToDelete}`);
    const checkDeleted = await storeConcept._getStore({ storeId: storeIdToDelete });
    assertExists((checkDeleted as { error: string }).error, "Deleted store should no longer be retrievable.");
    console.log(`Retrieval of deleted store failed as expected: ${JSON.stringify(checkDeleted)}`);

    // 4. Attempt to delete the same store again (now non-existent)
    console.log(`Attempting to delete already deleted store with ID: ${storeIdToDelete}`);
    const reDeleteResult = await storeConcept.deleteStore({ storeId: storeIdToDelete });
    assertExists((reDeleteResult as { error: string }).error, "Should return an error for deleting non-existent store.");
    assertEquals(
      (reDeleteResult as { error: string }).error,
      `Store with ID '${storeIdToDelete}' not found.`,
      "Error message should indicate store not found for deletion.",
    );
    console.log(`Re-deletion of store failed as expected: ${JSON.stringify(reDeleteResult)}`);

    // 5. Attempt to delete a completely fake ID
    const fakeId = "totally_fake_id" as ID;
    console.log(`Attempting to delete fake store with ID: ${fakeId}`);
    const fakeDeleteResult = await storeConcept.deleteStore({ storeId: fakeId });
    assertExists((fakeDeleteResult as { error: string }).error, "Should return an error for deleting a fake ID.");
    assertEquals(
      (fakeDeleteResult as { error: string }).error,
      `Store with ID '${fakeId}' not found.`,
      "Error message should indicate store not found for deletion of fake ID.",
    );
    console.log(`Deletion of fake store failed as expected: ${JSON.stringify(fakeDeleteResult)}`);
  });

  await test.step("Scenario 3: Edge Cases - Stores with Empty Name and/or Address", async () => {
    const name = "";
    const address = "";
    const nameOnlyEmpty = "";
    const addressOnlyEmpty = "321 Data Dr";

    // 1. Create a store with empty name and address
    console.log(`Creating store with empty name and address: Name="${name}", Address="${address}"`);
    const resultEmpty = await storeConcept.createStore({ name, address });
    assertExists((resultEmpty as { storeId: ID }).storeId, "Creation of empty-field store should succeed.");
    storeIdEmpty = (resultEmpty as { storeId: ID }).storeId;
    console.log(`Empty-field store created: ${JSON.stringify(resultEmpty)}`);

    // 2. Verify its existence and details
    const retrievedEmpty = await storeConcept._getStore({ storeId: storeIdEmpty });
    assertExists((retrievedEmpty as { name: string }).name, "Empty-field store should be retrievable.");
    assertEquals((retrievedEmpty as { name: string }).name, name, "Retrieved empty name should match.");
    assertEquals((retrievedEmpty as { address: string }).address, address, "Retrieved empty address should match.");
    console.log(`Empty-field store retrieved: ${JSON.stringify(retrievedEmpty)}`);

    // 3. Attempt to create a duplicate of the empty-named/addressed store
    console.log(`Attempting to create duplicate of empty-field store.`);
    const duplicateEmptyResult = await storeConcept.createStore({ name, address });
    assertExists((duplicateEmptyResult as { error: string }).error, "Should return an error for duplicate empty store.");
    assertEquals(
      (duplicateEmptyResult as { error: string }).error,
      "A store with the same name and address already exists.",
      "Error message should indicate duplicate for empty fields.",
    );
    console.log(`Duplicate empty-field store creation failed as expected: ${JSON.stringify(duplicateEmptyResult)}`);

    // 4. Create a store with only name empty but unique address
    console.log(`Creating store with only name empty: Name="${nameOnlyEmpty}", Address="${addressOnlyEmpty}"`);
    const resultNameEmpty = await storeConcept.createStore({ name: nameOnlyEmpty, address: addressOnlyEmpty });
    assertExists((resultNameEmpty as { storeId: ID }).storeId, "Creation of name-empty store should succeed.");
    storeIdNameOnlyEmpty = (resultNameEmpty as { storeId: ID }).storeId;
    console.log(`Name-empty store created: ${JSON.stringify(resultNameEmpty)}`);


    // 5. Query for stores with empty name
    console.log(`Querying stores by empty name: ""`);
    // Now both storeIdEmpty and storeIdNameOnlyEmpty should be returned as they both have empty names
    const storesByEmptyName = await storeConcept._getStoresByName({ name: "" });
    assertEquals(storesByEmptyName.size, 2, `Should find 2 stores with empty name.`);
    assertArrayIncludes(Array.from(storesByEmptyName), [storeIdEmpty, storeIdNameOnlyEmpty], "Set should contain empty-field store IDs.");
    console.log(`Stores found by empty name: ${JSON.stringify(Array.from(storesByEmptyName))}`);

    // 6. Query for stores with empty address
    console.log(`Querying stores by empty address: ""`);
    const storesByEmptyAddress = await storeConcept._getStoresByAddress({ address: "" });
    assertEquals(storesByEmptyAddress.size, 1, `Should find 1 store with empty address.`);
    assertArrayIncludes(Array.from(storesByEmptyAddress), [storeIdEmpty], "Set should contain empty-field store ID.");
    console.log(`Stores found by empty address: ${JSON.stringify(Array.from(storesByEmptyAddress))}`);
  });

  // --- Teardown (executed once at the end of this Deno.test block) ---
  console.log("StoreConcept Teardown: Closing database client...");
  if (client) {
    await client.close();
    console.log("StoreConcept teardown complete. Database client closed.");
  }
});