import { type Collection, isValidCollection } from "logos:constants/database";
import { timeStructToMilliseconds } from "logos:constants/time";
import { capitalise, decapitalise } from "logos:core/formatting";
import type { DocumentConventions } from "logos/adapters/databases/adapter";
import type { Client } from "logos/client";
import type { RateLimit } from "logos/models/guild";
import type { DatabaseStore } from "logos/stores/database";

type ClientOrDatabaseStore = Client | DatabaseStore;

type ModelConstructor = { new (database: DatabaseStore, data: any): Model };

type IdentifierParts<M extends Model> = M["idParts"];
type IdentifierData<M extends Model> = { [K in IdentifierParts<M>[number]]: string };
type IdentifierDataWithDummies<M extends Model> = { [K in IdentifierParts<M>[number]]: string | undefined };
type IdentifierDataOrMetadata<M extends Model, Metadata = any> = IdentifierData<M> | Metadata;
abstract class Model<Generic extends { collection: Collection; idParts: readonly string[] } = any> {
	readonly #conventions: DocumentConventions;

	abstract get createdAt(): number;

	declare id: string;

	get partialId(): string {
		return this.#conventions.partialId;
	}

	get idParts(): Generic["idParts"] {
		return this.#conventions.idParts;
	}

	get collection(): Collection {
		return this.#conventions.collection;
	}

	get revision(): string | undefined {
		return this.#conventions.revision;
	}

	set revision(value: string) {
		this.#conventions.revision = value;
	}

	get isDeleted(): boolean | undefined {
		return this.#conventions.isDeleted;
	}

	set isDeleted(value: boolean) {
		this.#conventions.isDeleted = value;
	}

	constructor(database: DatabaseStore, data: Record<string, unknown>, { collection }: { collection: Collection }) {
		this.#conventions = database.conventionsFor({ document: this, data, collection });
	}

	static buildPartialId<M extends Model>(data: IdentifierData<M>): string {
		const parts: string[] = [];
		for (const part of constants.database.identifierParts) {
			if (!(part in data)) {
				continue;
			}

			parts.push(data[part as keyof typeof data]);
		}

		return parts.join(constants.special.database.separator);
	}

	static buildId<M extends Model>(data: IdentifierData<M>, { collection }: { collection: Collection }): string {
		const collectionCamelcase = decapitalise(collection);
		const partialId = Model.buildPartialId(data);

		return `${collectionCamelcase}${constants.special.database.separator}${partialId}`;
	}

	static getDataFromId<M extends Model>(id: string): [collection: Collection, data: IdentifierParts<M>] {
		const [collectionCamelcase, ...data] = id.split(constants.special.database.separator) as [string, string[]];
		const collection = capitalise(collectionCamelcase);
		if (!isValidCollection(collection)) {
			throw new Error(`Collection "${collectionCamelcase}" encoded in ID "${id}" is unknown.`);
		}

		return [collection as Collection, data as IdentifierParts<M>];
	}

	static getDataFromPartialId<M extends Model>(partialId: string): IdentifierParts<M> {
		return partialId.split(constants.special.database.separator) as string[] as IdentifierParts<M>;
	}

	static composeId(partialId: string, { collection }: { collection: Collection }): string {
		return `${decapitalise(collection)}${constants.special.database.separator}${partialId}`;
	}

	static decomposeId(id: string): [collection: Collection, partialId: string] {
		const [collection, data] = Model.getDataFromId(id);
		const partialId = data.join(constants.special.database.separator);

		return [collection, partialId];
	}

	static #withDummiesReplaced<M extends Model>(
		data: IdentifierDataWithDummies<M>,
		{ value }: { value: string },
	): IdentifierData<M> {
		return Object.fromEntries(
			Object.entries(data).map(([key, value_]) => [key, value_ ?? value]),
		) as IdentifierData<M>;
	}

	static async all<M extends Model>(
		clientOrDatabase: ClientOrDatabaseStore,
		{ collection, where }: { collection: Collection; where?: IdentifierDataWithDummies<M> },
	): Promise<M[]> {
		const { promise, resolve } = Promise.withResolvers<M[]>();

		await getDatabase(clientOrDatabase).withSession(async (session) => {
			let query = session.query<M>({ collection });

			if (where !== undefined) {
				const clause = Model.#withDummiesReplaced(where, { value: "\\d+" });
				query = query.whereRegex("id", new RegExp(Model.buildId(clause, { collection })));
			}

			const documents = await query.run();

			resolve(documents);
		});

		return promise;
	}

	static crossesRateLimit<M extends Model>(documents: M[], rateLimit: RateLimit): boolean {
		const timestamps = documents.map((document) => document.createdAt);

		const actionTimestamps = timestamps.sort((a, b) => b - a); // From most recent to least recent.
		const relevantTimestamps = actionTimestamps.slice(0, rateLimit.uses);

		// Has not reached the limit, regardless of the limiting time period.
		if (relevantTimestamps.length < rateLimit.uses) {
			return false;
		}

		const now = Date.now();
		const interval = timeStructToMilliseconds(rateLimit.within);

		return relevantTimestamps.some((timestamp) => now - timestamp < interval);
	}

	async create(clientOrDatabase: ClientOrDatabaseStore): Promise<void> {
		await getDatabase(clientOrDatabase).withSession(async (session) => {
			await session.set(this);
		});
	}

	async update(clientOrDatabase: ClientOrDatabaseStore, callback: () => void): Promise<void> {
		await getDatabase(clientOrDatabase).withSession(async (session) => {
			callback();
			await session.set(this);
		});
	}

	async delete(clientOrDatabase: ClientOrDatabaseStore): Promise<void> {
		await this.update(clientOrDatabase, () => {
			this.isDeleted = true;
		});

		await getDatabase(clientOrDatabase).withSession((session) => {
			session.remove(this);
		});
	}
}

function getDatabase(clientOrDatabase: ClientOrDatabaseStore): DatabaseStore {
	if ("database" in clientOrDatabase) {
		return clientOrDatabase.database;
	}

	return clientOrDatabase;
}

export { Model };
export type { IdentifierParts, IdentifierData, IdentifierDataOrMetadata, ClientOrDatabaseStore, ModelConstructor };
