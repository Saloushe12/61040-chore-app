import { assertEquals, assertExists } from "@test"; 
import { MongoClient, Db } from "mongodb";
import UserConcept from "./UserConcept.ts";
import { ID } from "@utils/types.ts";
import { testDb } from "@utils/database.ts";

// --- Global variables for database and concept instance ---
let db: Db;
let client: MongoClient;
let userConcept: UserConcept;

// Main test suite for User Concept actions
Deno.test("User Concept Comprehensive Tests", async (t) => {
  // --- Setup for the entire test suite execution ---
  // This runs once before any 't.step' within this Deno.test block.
  // `testDb()` connects to a test DB and drops all collections initially, providing a clean slate for the suite.
  [db, client] = await testDb();
  userConcept = new UserConcept(db);
  console.log("--- Initialized DB and UserConcept for comprehensive suite ---");

  // --- Operational Principle Test ---
  // A sequence representing the common, expected usage of the concept.
  await t.step("Operational Principle: User registration, authentication, profile retrieval, and email update", async () => {
    // Each t.step clears its own collection to ensure isolation.
    await db.collection("User.users").deleteMany({});
    console.log("--- Cleared 'User.users' collection for Operational Principle test ---");

    const username = "principleUser";
    const email = "principle@example.com";
    const newEmail = "new_principle@example.com";
    const password = "PrinciplePassword123!";

    console.log("Scenario: Operational Principle - Register, Authenticate, Get Profile, Update Email");

    // 1. Register User (successful execution of registerUser)
    console.log(`  Action: registerUser(username: '${username}', email: '${email}', password: '***')`);
    const registerResult = await userConcept.registerUser({ username, email, password });
    console.log("  Output:", registerResult);
    assertExists((registerResult as { userId: ID }).userId, "Expected userId from registration.");
    const userId = (registerResult as { userId: ID }).userId;
    console.log(`  Verification: User registered with ID: ${userId}`);

    // 2. Authenticate User by username (successful execution of authenticateUser)
    console.log(`  Action: authenticateUser(usernameOrEmail: '${username}', password: '***')`);
    const authResult1 = await userConcept.authenticateUser({ usernameOrEmail: username, password });
    console.log("  Output:", authResult1);
    assertEquals((authResult1 as { userId: ID }).userId, userId, "Auth by username should succeed.");
    console.log(`  Verification: Authenticated by username.`);

    // 3. Get User By ID (successful execution of getUserById)
    console.log(`  Action: getUserById(userId: '${userId}')`);
    const userProfile1 = await userConcept.getUserById({ userId });
    console.log("  Output:", userProfile1);
    assertEquals((userProfile1 as { username: string }).username, username, "Retrieved username should match.");
    assertEquals((userProfile1 as { email: string }).email, email, "Retrieved email should match original.");
    assertExists((userProfile1 as { creationDate: Date }).creationDate, "Expected creationDate in profile result.");
    console.log(`  Verification: User profile retrieved.`);

    // 4. Update User Email (successful execution of updateUserEmail)
    console.log(`  Action: updateUserEmail(userId: '${userId}', newEmail: '${newEmail}')`);
    const updateEmailResult = await userConcept.updateUserEmail({ userId, newEmail });
    console.log("  Output:", updateEmailResult);
    assertEquals(updateEmailResult, {}, "Email update should succeed.");
    console.log(`  Verification: Email updated to ${newEmail}.`);

    // 5. Verify email update by getting profile again
    console.log(`  Action: getUserById(userId: '${userId}') (after update)`);
    const userProfile2 = await userConcept.getUserById({ userId });
    console.log("  Output:", userProfile2);
    assertEquals((userProfile2 as { email: string }).email, newEmail, "Retrieved email should match new email.");
    console.log(`  Verification: Updated email confirmed.`);
  });

  // --- Interesting Scenario 1: Full User Lifecycle including Deletion and Re-registration ---
  // Probes deletion and the freeing up of unique identifiers.
  await t.step("Scenario 1: Full User Lifecycle (Register -> Auth -> Update -> Delete -> Re-register)", async () => {
    await db.collection("User.users").deleteMany({});
    console.log("--- Cleared 'User.users' collection for 'User Lifecycle' test ---");

    const username = "lifecycleUser";
    const email = "lifecycle@example.com";
    const updatedEmail = "new_lifecycle@example.com";
    const password = "LifecyclePassword123!";
    const newRegistrationEmail = "re_register@example.com"; // For re-registration with same username

    console.log("Scenario: User Lifecycle - Register, Auth, Update, Delete, Re-register with same username");

    // 1. Register User (successful execution of registerUser)
    const registerResult = await userConcept.registerUser({ username, email, password });
    const userId = (registerResult as { userId: ID }).userId;
    assertExists(userId, "Expected userId from registration.");
    console.log(`  Registered user '${username}' with ID '${userId}'`);

    // 2. Authenticate User (successful execution of authenticateUser)
    const authResult = await userConcept.authenticateUser({ usernameOrEmail: username, password });
    assertEquals((authResult as { userId: ID }).userId, userId, "Authentication should succeed.");
    console.log(`  Authenticated user '${username}'`);

    // 3. Update User Email (successful execution of updateUserEmail)
    const updateResult = await userConcept.updateUserEmail({ userId, newEmail: updatedEmail });
    assertEquals(updateResult, {}, "Email update should succeed.");
    console.log(`  Email updated for user '${username}' to '${updatedEmail}'`);

    // 4. Delete User (successful execution of deleteUser)
    console.log(`  Action: deleteUser(userId: '${userId}')`);
    const deleteResult = await userConcept.deleteUser({ userId });
    console.log("  Output:", deleteResult);
    assertEquals(deleteResult, {}, "Deletion should succeed.");
    console.log(`  Verification: User '${username}' deleted.`);

    // 5. Attempt to authenticate deleted user (expect error)
    console.log(`  Action: authenticateUser(usernameOrEmail: '${username}', password: '***') (after deletion)`);
    const authAfterDelete = await userConcept.authenticateUser({ usernameOrEmail: username, password });
    assertExists((authAfterDelete as { error: string }).error, "Auth after deletion should fail.");
    assertEquals((authAfterDelete as { error: string }).error, "Invalid credentials.", "Error message for wrong password after deletion.");
    console.log(`  Verification: Authentication failed for deleted user (as expected).`);

    // 6. Attempt to get profile of deleted user (expect error)
    console.log(`  Action: getUserById(userId: '${userId}') (after deletion)`);
    const getAfterDelete = await userConcept.getUserById({ userId });
    assertExists((getAfterDelete as { error: string }).error, "Get profile after deletion should fail.");
    assertEquals((getAfterDelete as { error: string }).error, `User with ID '${userId}' not found.`, "Error message for non-existent user after deletion.");
    console.log(`  Verification: Get profile failed for deleted user (as expected).`);

    // 7. Re-register a *new* user with the *same username* (should succeed now that old one is gone)
    // This confirms username uniqueness is respected after deletion.
    console.log(`  Action: registerUser(username: '${username}', email: '${newRegistrationEmail}', password: '***') (re-register)`);
    const reRegisterResult = await userConcept.registerUser({ username, email: newRegistrationEmail, password });
    console.log("  Output:", reRegisterResult);
    assertExists((reRegisterResult as { userId: ID }).userId, "Re-registration should succeed.");
    const newUserId = (reRegisterResult as { userId: ID }).userId;
    assertExists(newUserId !== userId, "New userId should be different from the old one."); // Ensure it's a new user, not recovery
    console.log(`  Verification: New user re-registered with username '${username}' and ID '${newUserId}'.`);
  });

  // --- Interesting Scenario 2: Multiple Authentication Failures & Success ---
  // Probes various authentication failure paths.
  await t.step("Scenario 2: Multiple authentication attempts (fail then succeed)", async () => {
    await db.collection("User.users").deleteMany({});
    console.log("--- Cleared 'User.users' collection for 'Authentication Failures' test ---");

    const username = "authTestUser";
    const email = "authtest@example.com";
    const password = "AuthTestPassword123!";
    const wrongPassword = "WrongPassword!";
    const nonExistentUsername = "ghostUser";

    console.log("Scenario: Authentication failures and eventual success");

    // 1. Register User (pre-condition for successful authentication attempts)
    const registerResult = await userConcept.registerUser({ username, email, password });
    const userId = (registerResult as { userId: ID }).userId;
    assertExists(userId, "Expected userId from registration.");
    console.log(`  Registered user '${username}' with ID '${userId}'`);

    // 2. Attempt to authenticate with wrong password (expect error)
    console.log(`  Action: authenticateUser(usernameOrEmail: '${username}', password: '***') (wrong password)`);
    const authWrongPwd = await userConcept.authenticateUser({ usernameOrEmail: username, password: wrongPassword });
    assertExists((authWrongPwd as { error: string }).error, "Auth with wrong password should fail.");
    assertEquals((authWrongPwd as { error: string }).error, "Invalid credentials.", "Error message for wrong password.");
    console.log(`  Verification: Authentication failed with wrong password (as expected).`);

    // 3. Attempt to authenticate with non-existent user (expect error)
    console.log(`  Action: authenticateUser(usernameOrEmail: '${nonExistentUsername}', password: '***') (non-existent)`);
    const authNonExistent = await userConcept.authenticateUser({ usernameOrEmail: nonExistentUsername, password });
    assertExists((authNonExistent as { error: string }).error, "Auth with non-existent user should fail.");
    assertEquals((authNonExistent as { error: string }).error, "Invalid credentials.", "Error message for non-existent user.");
    console.log(`  Verification: Authentication failed for non-existent user (as expected).`);

    // 4. Successfully authenticate by email (successful execution of authenticateUser)
    console.log(`  Action: authenticateUser(usernameOrEmail: '${email}', password: '***') (success by email)`);
    const authSuccessEmail = await userConcept.authenticateUser({ usernameOrEmail: email, password });
    assertEquals((authSuccessEmail as { userId: ID }).userId, userId, "Auth by email should succeed.");
    console.log(`  Verification: User '${username}' successfully authenticated by email.`);
  });

  // --- Interesting Scenario 3: Registration with existing details and weak password ---
  // Probes `registerUser` error conditions.
  await t.step("Scenario 3: Registration attempts with existing username/email and weak password", async () => {
    await db.collection("User.users").deleteMany({});
    console.log("--- Cleared 'User.users' collection for 'Registration Errors' test ---");

    const baseUsername = "baseUser";
    const baseEmail = "base@example.com";
    const password = "StrongPassword123!";
    const weakPassword = "weak";

    console.log("Scenario: Registration error cases");

    // 1. Register base user successfully (pre-condition for duplicate username/email tests)
    const registerResult = await userConcept.registerUser({ username: baseUsername, email: baseEmail, password });
    const userId = (registerResult as { userId: ID }).userId;
    assertExists(userId, "Expected userId from base registration.");
    console.log(`  Registered base user '${baseUsername}' with ID '${userId}'`);

    // 2. Attempt to register with existing username (expect error)
    console.log(`  Action: registerUser(username: '${baseUsername}', email: 'new@example.com', password: '***') (duplicate username)`);
    const dupUsernameResult = await userConcept.registerUser({ username: baseUsername, email: "new@example.com", password });
    assertExists((dupUsernameResult as { error: string }).error, "Expected error for duplicate username.");
    assertEquals((dupUsernameResult as { error: string }).error, `Username '${baseUsername}' already exists.`, "Error message for duplicate username.");
    console.log(`  Verification: Registration failed for duplicate username (as expected).`);

    // 3. Attempt to register with existing email (expect error)
    console.log(`  Action: registerUser(username: 'anotherUser', email: '${baseEmail}', password: '***') (duplicate email)`);
    const dupEmailResult = await userConcept.registerUser({ username: "anotherUser", email: baseEmail, password });
    assertExists((dupEmailResult as { error: string }).error, "Expected error for duplicate email.");
    assertEquals((dupEmailResult as { error: string }).error, `Email '${baseEmail}' already exists.`, "Error message for duplicate email.");
    console.log(`  Verification: Registration failed for duplicate email (as expected).`);

    // 4. Attempt to register with weak password (expect error)
    console.log(`  Action: registerUser(username: 'weakPwdUser', email: 'weak@example.com', password: '***') (weak password)`);
    const weakPwdResult = await userConcept.registerUser({ username: "weakPwdUser", email: "weak@example.com", password: weakPassword });
    assertExists((weakPwdResult as { error: string }).error, "Expected error for weak password.");
    assertEquals((weakPwdResult as { error: string }).error, "Password must be at least 8 characters long.", "Error message for weak password.");
    console.log(`  Verification: Registration failed for weak password (as expected).`);
  });

  // --- Teardown for the entire test suite ---
  // This runs once after all `t.step` tests in this Deno.test block are complete.
  await client.close();
  console.log("--- Closed MongoDB client after User Concept Comprehensive Tests ---");
});