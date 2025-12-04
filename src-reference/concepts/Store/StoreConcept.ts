import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

const PREFIX = "Store" + ".";

/**
 * State: Each Store is represented by:
 * @property _id The unique identifier for the store (storeId).
 * @property name The name of the store.
 * @property address The physical address of the store.
 * @property description Optional descriptive text for the store.
 * @property phone Optional contact phone number for the store.
 * @property hours Optional operating hours for the store.
 * @property specialties Optional list of specialties offered by the store.
 * @property image Optional URL or identifier for the store's image.
 */
interface StoreDoc {
  _id: ID; // Mapped from storeId in spec
  name: string;
  address: string;
  description?: string;
  phone?: string;
  hours?: string;
  specialties?: string[];
  image?: string;
}

/**
 * @concept Store
 * @purpose Represent the identity and physical address of a store.
 * @principle A store's existence and location are fundamental. Interactions related to its classification, user feedback,
 *            or popularity are external concerns managed by other concepts through synchronizations.
 */
export default class StoreConcept {
  private stores: Collection<StoreDoc>;

  constructor(private readonly db: Db) {
    this.stores = this.db.collection(PREFIX + "stores");
  }

  /**
   * createStore(name: String, address: String, ...optionalFields): { storeId: ID } | { error: String }
   * @requires No existing store has both the exact same `name` and `address`.
   * @effects Creates a new store record including optional fields, and returns its unique `storeId`.
   * @returns { storeId: ID } on success or { error: string } if requirements are not met.
   */
  async createStore(
    {
      name,
      address,
      description,
      phone,
      hours,
      specialties,
      image,
    }: {
      name: string;
      address: string;
      description?: string;
      phone?: string;
      hours?: string;
      specialties?: string[];
      image?: string;
    },
  ): Promise<{ storeId: ID } | { error: string }> {
    const existingStore = await this.stores.findOne({ name, address });
    if (existingStore) {
      return {
        error: `A store with the same name and address already exists.`,
      };
    }

    const newStoreId = freshID();
    const newStore: StoreDoc = {
      _id: newStoreId,
      name,
      address,
      description,
      phone,
      hours,
      specialties,
      image,
    };

    await this.stores.insertOne(newStore);
    return { storeId: newStoreId };
  }

  /**
   * deleteStore(storeId: String): Empty | { error: String }
   * @requires The `storeId` must exist.
   * @effects Removes the store record.
   * @returns Empty on success or { error: string } if requirements are not met.
   */
  async deleteStore(
    { storeId }: { storeId: ID },
  ): Promise<Empty | { error: string }> {
    const existingStore = await this.stores.findOne({ _id: storeId });
    if (!existingStore) {
      return { error: `Store with ID '${storeId}' not found.` };
    }

    const result = await this.stores.deleteOne({ _id: storeId });
    if (result.acknowledged && result.deletedCount === 1) {
      return {};
    } else {
      return { error: `Failed to delete store with ID '${storeId}'.` };
    }
  }

  /**
   * _storeExists(storeId: String): (storeId: String)
   * @requires true
   * @effects Returns the `storeId` if a store with that ID exists.
   * @returns An array containing `storeId` if found, otherwise an empty array.
   */
  async _storeExists(
    { storeId }: { storeId: ID },
  ): Promise<Array<{ storeId: ID }>> {
    const store = await this.stores.findOne({ _id: storeId }, {
      projection: { _id: 1 },
    });
    return store ? [{ storeId: store._id }] : [];
  }

  /**
   * _getStoreDetails(storeId: String): (storeId: String, name: String, address: String, ...optionalFields)
   * @requires The `storeId` must exist.
   * @effects Returns the full store object including its ID.
   * @returns An array containing a single object with full store details on success.
   *          Returns an empty array if the `storeId` does not exist.
   */
  async _getStoreDetails(
    { storeId }: { storeId: ID },
  ): Promise<
    Array<{
      storeId: ID;
      name: string;
      address: string;
      description?: string;
      phone?: string;
      hours?: string;
      specialties?: string[];
      image?: string;
    }>
  > {
    const store = await this.stores.findOne({ _id: storeId });
    if (!store) {
      return [];
    }
    return [{
      storeId: store._id,
      name: store.name,
      address: store.address,
      description: store.description,
      phone: store.phone,
      hours: store.hours,
      specialties: store.specialties,
      image: store.image,
    }];
  }

  /**
   * _listAllStores(): (storeId: String, name: String, address: String, ...optionalFields)
   * @requires true
   * @effects Returns an array of all stores with full details (excluding ratings/reviews/tags).
   * @returns An array of objects, each with full store details.
   */
  async _listAllStores(): Promise<
    Array<{
      storeId: ID;
      name: string;
      address: string;
      description?: string;
      phone?: string;
      hours?: string;
      specialties?: string[];
      image?: string;
    }>
  > {
    try {
      const stores = await this.stores.find({}).toArray();
      return stores.map((store) => ({
        storeId: store._id,
        name: store.name,
        address: store.address,
        description: store.description,
        phone: store.phone,
        hours: store.hours,
        specialties: store.specialties,
        image: store.image,
      }));
    } catch (e: unknown) {
      console.error(
        `Error listing all stores: ${
          e instanceof Error ? e.message : "Unknown error"
        }`,
      );
      return []; // Return empty array on error for queries
    }
  }

  /**
   * _getStoresByName(name: String): (storeId: String, name: String, address: String, ...optionalFields)
   * @requires true
   * @effects Returns all matching store IDs and their details for the given name.
   * @returns An array of objects, each with full store details.
   */
  async _getStoresByName(
    { name }: { name: string },
  ): Promise<
    Array<{
      storeId: ID;
      name: string;
      address: string;
      description?: string;
      phone?: string;
      hours?: string;
      specialties?: string[];
      image?: string;
    }>
  > {
    const stores = await this.stores.find({ name }).toArray();
    return stores.map((store) => ({
      storeId: store._id,
      name: store.name,
      address: store.address,
      description: store.description,
      phone: store.phone,
      hours: store.hours,
      specialties: store.specialties,
      image: store.image,
    }));
  }

  /**
   * _getStoresByAddress(address: String): (storeId: String, name: String, address: String, ...optionalFields)
   * @requires true
   * @effects Returns all matching store IDs and their details for the given address.
   * @returns An array of objects, each with full store details.
   */
  async _getStoresByAddress(
    { address }: { address: string },
  ): Promise<
    Array<{
      storeId: ID;
      name: string;
      address: string;
      description?: string;
      phone?: string;
      hours?: string;
      specialties?: string[];
      image?: string;
    }>
  > {
    const stores = await this.stores.find({ address }).toArray();
    return stores.map((store) => ({
      storeId: store._id,
      name: store.name,
      address: store.address,
      description: store.description,
      phone: store.phone,
      hours: store.hours,
      specialties: store.specialties,
      image: store.image,
    }));
  }
}
