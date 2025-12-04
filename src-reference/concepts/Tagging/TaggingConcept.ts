import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";

const PREFIX = "Tagging" + ".";

type StoreId = ID;
type Tag = string; // Tags themselves are just strings in the spec, not separate entities.

/**
 * Each `Tagging` record associates tags with a store:
 * @property _id The unique identifier for the store this document tags (`storeId`).
 * @property tags An array of tags associated with the store.
 */
interface TaggingDoc {
  _id: StoreId; // The unique identifier for the store this document tags
  tags: Tag[]; // An array of tags associated with the store
}

/**
 * @concept Tagging
 * @purpose To allow arbitrary classification of stores using descriptive tags.
 */
export default class TaggingConcept {
  private taggings: Collection<TaggingDoc>;

  constructor(private readonly db: Db) {
    this.taggings = this.db.collection(PREFIX + "taggings");
  }

  /**
   * addTag(storeId: String, tag: String): {} | { error: String }
   *
   * @requires The `storeId` must exist (conceptually, in the `Store` concept).
   *           The `tag` should ideally be validated for format/content by a higher-level mechanism.
   * @effects Adds the specified `tag` to the `storeId`'s set of tags. If the tag already exists, the set remains unchanged.
   *          If no `Tagging` record exists for the `storeId`, a new one is created.
   * @returns {} on success, { error } on failure.
   */
  async addTag(
    { storeId, tag }: { storeId: StoreId; tag: Tag },
  ): Promise<Empty | { error: string }> {
    try {
      const result = await this.taggings.updateOne(
        { _id: storeId },
        { $addToSet: { tags: tag } },
        { upsert: true },
      );

      if (!result.acknowledged) {
        return { error: "Database operation for addTag was not acknowledged." };
      }
      return {};
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Unknown error";
      console.error(
        `Error in Tagging.addTag for storeId '${storeId}' and tag '${tag}':`,
        e,
      );
      return { error: `Failed to add tag: ${message}` };
    }
  }

  /**
   * removeTag(storeId: String, tag: String): {} | { error: String }
   *
   * @requires The `storeId` must exist (i.e., there is a tagging record for it).
   *           The `tag` must be present in the store's tag set.
   * @effects Removes the specified `tag` from the `storeId`'s set of tags.
   * @returns {} on success, { error } on failure.
   */
  async removeTag(
    { storeId, tag }: { storeId: StoreId; tag: Tag },
  ): Promise<Empty | { error: string }> {
    try {
      const existingDoc = await this.taggings.findOne({ _id: storeId });
      if (!existingDoc) {
        return { error: `Store with ID '${storeId}' not found for tagging.` };
      }
      if (!existingDoc.tags.includes(tag)) {
        return { error: `Tag '${tag}' not found for store ID '${storeId}'.` };
      }

      const result = await this.taggings.updateOne(
        { _id: storeId },
        { $pull: { tags: tag } },
      );

      if (!result.acknowledged) {
        return {
          error: "Database operation for removeTag was not acknowledged.",
        };
      }

      // Optional cleanup: if after removing the tag, the tags array becomes empty, remove the document itself.
      if (result.modifiedCount > 0) {
        const updatedDoc = await this.taggings.findOne({ _id: storeId });
        if (updatedDoc && updatedDoc.tags.length === 0) {
          await this.taggings.deleteOne({ _id: storeId });
        }
      }
      return {};
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Unknown error";
      console.error(
        `Error in Tagging.removeTag for storeId '${storeId}' and tag '${tag}':`,
        e,
      );
      return { error: `Failed to remove tag: ${message}` };
    }
  }

  /**
   * deleteTagsForStore(storeId: String): {} | { error: String }
   *
   * @requires The `storeId` must exist (conceptually).
   * @effects Removes all `Tagging` records associated with the specified `storeId`.
   *          This action is typically invoked by a synchronization.
   * @returns {} on success, or { error } on failure.
   */
  async deleteTagsForStore(
    { storeId }: { storeId: StoreId },
  ): Promise<Empty | { error: string }> {
    try {
      await this.taggings.deleteOne({ _id: storeId });
      return {}; // Success, even if no tagging record was found/deleted (idempotent)
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Unknown error";
      console.error(`Error deleting tags for store '${storeId}': ${message}`);
      return { error: `Failed to delete tags for store: ${message}` };
    }
  }

  /**
   * _getStoresByTag(tag: String): (storeId: String)
   *
   * @requires true
   * @effects Returns a list of all `storeId`s that are currently associated with the given `tag`.
   * @returns An array of objects, each containing a `storeId`.
   *          Returns an empty array if no stores are found with the given `tag`.
   */
  async _getStoresByTag(
    { tag }: { tag: string },
  ): Promise<Array<{ storeId: ID }>> {
    try {
      const docs = await this.taggings.find({ tags: tag }).project({ _id: 1 })
        .toArray();
      return docs.map((doc) => ({ storeId: doc._id }));
    } catch (e: unknown) {
      console.error(
        `Error retrieving stores by tag: ${
          e instanceof Error ? e.message : "Unknown error"
        }`,
      );
      return []; // Return empty array on error for queries
    }
  }

  /**
   * _getTagsForStore(storeId: String): (storeId: String, tags: Set<String>)
   * @requires true
   * @effects Returns the `storeId` and its associated `tags`.
   * @returns An array containing a single object with `storeId` and `tags` (as a string array).
   *          Returns an empty array if no tagging record is found for the `storeId`.
   */
  async _getTagsForStore(
    { storeId }: { storeId: ID },
  ): Promise<Array<{ storeId: ID; tags: string[] }>> {
    try {
      const doc = await this.taggings.findOne({ _id: storeId });
      if (!doc) {
        return [];
      }
      return [{ storeId: doc._id, tags: doc.tags }];
    } catch (e: unknown) {
      console.error(
        `Error retrieving tags for store '${storeId}': ${
          e instanceof Error ? e.message : "Unknown error"
        }`,
      );
      return []; // Return empty array on error for queries
    }
  }
}
