import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";
import { compare, hash } from "bcrypt";

const PREFIX = "User" + ".";

/**
 * Each User is represented by:
 * @property _id The unique identifier for the user (userId).
 * @property username A unique username for login.
 * @property email A unique email for login and communication.
 * @property passwordHash The hashed password for security.
 * @property creationDate The date the user account was created.
 */
interface UserDoc {
  _id: ID; // Mapped from userId in spec
  username: string;
  email: string;
  passwordHash: string;
  creationDate: Date;
}

/**
 * @concept User
 * @purpose To manage user accounts, including registration, authentication, and basic profile information.
 * @principle User accounts are fundamental for personalized interactions like leaving reviews or setting language preferences.
 *            Other concepts interact with `User` primarily to identify who is performing an action or whose preferences are being queried.
 */
export default class UserConcept {
  private users: Collection<UserDoc>;

  constructor(private readonly db: Db) {
    this.users = this.db.collection(PREFIX + "users");
  }

  /**
   * registerUser(username: String, email: String, password: String): { userId: ID } | { error: String }
   * @requires The `username` and `email` must not already exist in the system. The `password` should meet security criteria.
   * @effects Creates a new user account, hashes the password, and returns the unique `userId`.
   * @returns { userId: ID } on success or { error: string } if requirements are not met or an internal error occurs.
   */
  async registerUser(
    { username, email, password }: {
      username: string;
      email: string;
      password: string;
    },
  ): Promise<{ userId: ID } | { error: string }> {
    const existingUserByUsername = await this.users.findOne({ username });
    if (existingUserByUsername) {
      return { error: `Username '${username}' already exists.` };
    }

    const existingUserByEmail = await this.users.findOne({ email });
    if (existingUserByEmail) {
      return { error: `Email '${email}' already exists.` };
    }

    if (password.length < 8) {
      return { error: "Password must be at least 8 characters long." };
    }

    try {
      const passwordHash = await hash(password);
      const newUserId = freshID();
      const newUser: UserDoc = {
        _id: newUserId,
        username,
        email,
        passwordHash,
        creationDate: new Date(),
      };

      await this.users.insertOne(newUser);
      return { userId: newUserId };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Unknown error";
      console.error(`Error registering user: ${message}`);
      return { error: `Internal server error: ${message}` };
    }
  }

  /**
   * authenticateUser(usernameOrEmail: String, password: String): { userId: ID } | { error: String }
   * @requires A user with the provided `usernameOrEmail` must exist. The provided `password` must match the stored `passwordHash`.
   * @effects Authenticates the user and returns their `userId`. Returns an error if authentication fails.
   * @returns { userId: ID } on success or { error: string } if authentication fails.
   */
  async authenticateUser(
    { usernameOrEmail, password }: {
      usernameOrEmail: string;
      password: string;
    },
  ): Promise<{ userId: ID } | { error: string }> {
    const user = await this.users.findOne({
      $or: [{ username: usernameOrEmail }, { email: usernameOrEmail }],
    });

    if (!user) {
      return { error: "Invalid credentials." };
    }

    const passwordMatches = await compare(password, user.passwordHash);

    if (!passwordMatches) {
      return { error: "Invalid credentials." };
    }
    return { userId: user._id };
  }

  /**
   * updateUserEmail(userId: String, newEmail: String): {} | { error: String }
   * @requires The `userId` must exist. The `newEmail` must not already be in use by another user.
   * @effects Updates the user's email address. Returns an error if requirements are not met.
   * @returns {} on success or { error: string } if requirements are not met or an internal error occurs.
   */
  async updateUserEmail(
    { userId, newEmail }: { userId: ID; newEmail: string },
  ): Promise<Empty | { error: string }> {
    const userToUpdate = await this.users.findOne({ _id: userId });
    if (!userToUpdate) {
      return { error: `User with ID '${userId}' not found.` };
    }

    const existingUserWithNewEmail = await this.users.findOne({
      email: newEmail,
      _id: { $ne: userId }, // Exclude the current user
    });
    if (existingUserWithNewEmail) {
      return {
        error: `Email '${newEmail}' is already in use by another user.`,
      };
    }

    if (userToUpdate.email === newEmail) {
      return {};
    }

    try {
      const updateResult = await this.users.updateOne(
        { _id: userId },
        { $set: { email: newEmail } },
      );

      if (updateResult.modifiedCount === 0) {
        return { error: "Failed to update email." };
      }
      return {};
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Unknown error";
      console.error(`Error updating user email for '${userId}': ${message}`);
      return { error: `Internal server error: ${message}` };
    }
  }

  /**
   * deleteUser(userId: String): {} | { error: String }
   * @requires The `userId` must exist.
   * @effects Deletes the user account. This action should ideally trigger cascades via syncs to clean up associated data in other concepts.
   * @returns {} on success or { error: string } if requirements are not met.
   */
  async deleteUser(
    { userId }: { userId: ID },
  ): Promise<Empty | { error: string }> {
    const userToDelete = await this.users.findOne({ _id: userId });
    if (!userToDelete) {
      return { error: `User with ID '${userId}' not found.` };
    }

    try {
      const deleteResult = await this.users.deleteOne({ _id: userId });
      if (deleteResult.deletedCount === 0) {
        return { error: `Failed to delete user with ID '${userId}'.` };
      }
      return {};
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Unknown error";
      console.error(`Error deleting user '${userId}': ${message}`);
      return { error: `Internal server error: ${message}` };
    }
  }

  /**
   * _userExists(userId: String): (userId: String)
   * @requires true
   * @effects Returns the `userId` if a user with that ID exists.
   * @returns An array containing `userId` if found, otherwise an empty array.
   */
  async _userExists(
    { userId }: { userId: ID },
  ): Promise<Array<{ userId: ID }>> {
    const user = await this.users.findOne({ _id: userId }, {
      projection: { _id: 1 },
    });
    return user ? [{ userId: user._id }] : [];
  }

  /**
   * _getUserDetails(userId: String): (username: String, email: String, creationDate: Timestamp)
   * @requires The `userId` must exist.
   * @effects Returns basic non-sensitive user profile information.
   * @returns An array containing a single object with username, email, and creationDate on success.
   *          Returns an empty array if the `userId` does not exist.
   */
  async _getUserDetails(
    { userId }: { userId: ID },
  ): Promise<Array<{ username: string; email: string; creationDate: Date }>> {
    const user = await this.users.findOne({ _id: userId });
    if (!user) {
      return [];
    }
    return [{
      username: user.username,
      email: user.email,
      creationDate: user.creationDate,
    }];
  }

  /**
   * _getUserByUsernameOrEmail(usernameOrEmail: String): (userId: String)
   * @requires true
   * @effects Returns the `userId` if a user matches the `usernameOrEmail`.
   * @returns An array containing `userId` if found, otherwise an empty array.
   */
  async _getUserByUsernameOrEmail(
    { usernameOrEmail }: { usernameOrEmail: string },
  ): Promise<Array<{ userId: ID }>> {
    const user = await this.users.findOne(
      { $or: [{ username: usernameOrEmail }, { email: usernameOrEmail }] },
      { projection: { _id: 1 } },
    );
    return user ? [{ userId: user._id }] : [];
  }
}
