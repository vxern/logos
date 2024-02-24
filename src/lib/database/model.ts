import constants from "../../constants/constants";
import { capitalise, decapitalise } from "../../formatting";
import { Client, Database } from "../client";
import { RateLimit, timeStructToMilliseconds } from "./guild";

interface DocumentMetadata {
	"@id": string;
	"@collection": Collection;
	"@is-deleted"?: boolean;
}

interface RawDocument {
	[key: string]: unknown;
	"@metadata": Omit<DocumentMetadata, "@collection"> & { "@collection": string };
}

const collections = [
	"EntryRequests",
	"GuildStats",
	"Guilds",
	"Praises",
	"Reports",
	"Resources",
	"Suggestions",
	"Tickets",
	"Users",
	"Warnings",
] as const;
type Collection = (typeof collections)[number];

function isSupportedCollection(collection: string): collection is Collection {
	return (collections as unknown as string[]).includes(collection);
}

type IdentifierParts<M extends Model> = M["_idParts"];
type IdentifierData<M extends Model> = { [K in IdentifierParts<M>[number]]: string };
type IdentifierDataWithDummies<M extends Model> = { [K in IdentifierParts<M>[number]]: string | undefined };
type MetadataOrIdentifierData<M extends Model> = { "@metadata": DocumentMetadata } | IdentifierData<M>;

type ClientOrDatabase = Client | Database;

const IDENTIFIER_PARTS_ORDERED: string[] = ["guildId", "userId", "authorId", "targetId", "createdAt"];

abstract class Model<Generic extends { idParts: readonly string[] } = any> {
	readonly _idParts: Generic["idParts"];

	readonly createdAt: number;

	readonly "@metadata": DocumentMetadata;

	get partialId(): string {
		return this._idParts.join(constants.symbols.database.separator);
	}

	get id(): string {
		return this["@metadata"]["@id"];
	}

	get collection(): string {
		return this["@metadata"]["@collection"];
	}

	constructor({ createdAt, "@metadata": metadata }: { createdAt?: number; "@metadata": DocumentMetadata }) {
		this.createdAt = createdAt ?? Date.now();
		this["@metadata"] = metadata;

		const [_, idParts] = Model.getDataFromId(metadata["@id"]);
		this._idParts = idParts;
	}

	static buildPartialId<M extends Model>(data: IdentifierData<M>): string {
		const parts: string[] = [];
		for (const part of IDENTIFIER_PARTS_ORDERED) {
			if (!(part in data)) {
				continue;
			}

			parts.push(data[part as keyof typeof data]);
		}

		return parts.join(constants.symbols.database.separator);
	}

	static buildId<M extends Model>(data: IdentifierData<M>, { collection }: { collection: Collection }): string {
		const collectionCamelCase = decapitalise(collection);
		const partialId = Model.buildPartialId(data);

		return `${collectionCamelCase}${constants.symbols.database.separator}${partialId}`;
	}

	static getDataFromId<M extends Model>(id: string): [collection: Collection, data: IdentifierParts<M>] {
		const [collectionCamelCase, ...data] = id.split(constants.symbols.database.separator);
		const collection = capitalise(collectionCamelCase!);
		if (!isSupportedCollection(collection)) {
			throw `Collection "${collection}" encoded in ID "${id}" is unknown.`;
		}

		return [collection as Collection, data];
	}

	static #withDummiesReplaced<M extends Model>(
		data: IdentifierDataWithDummies<M>,
		{ value }: { value: string },
	): IdentifierData<M> {
		return Object.fromEntries(Object.entries(data).map(([key, value_]) => [key, value_ ?? value])) as IdentifierData<M>;
	}

	static async all<M extends Model>(
		clientOrDatabase: ClientOrDatabase,
		{ collection, where }: { collection: Collection; where?: IdentifierDataWithDummies<M> },
	): Promise<M[]> {
		const { promise, resolve } = Promise.withResolvers<M[]>();

		await getDatabase(clientOrDatabase).withSession(async (session) => {
			let query = session.query<M>({ collection });

			if (where !== undefined) {
				const clause = Model.#withDummiesReplaced(where, { value: "\\d+" });
				query = query.whereRegex("id", Model.buildId(clause, { collection }));
			}

			const result = await query.all();

			resolve(result);
		});

		return promise;
	}

	static crossesRateLimit<M extends Model>(documents: M[], rateLimit: RateLimit): boolean {
		const timestamps = documents.map((document) => document.createdAt);

		const actionTimestamps = timestamps.sort((a, b) => b - a); // From most recent to least recent.
		const relevantTimestamps = actionTimestamps.slice(0, rateLimit.uses);

		// Has not reached the limit, regardless of the limiting time period.
		if (relevantTimestamps.length < rateLimit.uses) {
			return true;
		}

		const now = Date.now();
		const interval = timeStructToMilliseconds(rateLimit.within);
		for (const timestamp of relevantTimestamps) {
			if (now - timestamp < interval) {
				continue;
			}
			return true;
		}

		return false;
	}

	async create(clientOrDatabase: ClientOrDatabase): Promise<void> {
		await getDatabase(clientOrDatabase).withSession(async (session) => {
			await session.set(this);
			await session.saveChanges();
		});
	}

	async update(clientOrDatabase: ClientOrDatabase, callback: () => void): Promise<void> {
		await getDatabase(clientOrDatabase).withSession(async (session) => {
			callback();
			await session.set(this);
			await session.saveChanges();
		});
	}

	async delete(clientOrDatabase: ClientOrDatabase): Promise<void> {
		await this.update(clientOrDatabase, () => {
			this["@metadata"]["@is-deleted"] = true;
		});

		await getDatabase(clientOrDatabase).withSession(async (session) => {
			await session.remove(this);
			await session.saveChanges();
		});
	}
}

function getDatabase(clientOrDatabase: ClientOrDatabase): Database {
	if (clientOrDatabase instanceof Client) {
		return clientOrDatabase.database;
	}

	return clientOrDatabase;
}

export { Model };
export type {
	Collection,
	RawDocument,
	DocumentMetadata,
	IdentifierParts,
	IdentifierData,
	MetadataOrIdentifierData,
	ClientOrDatabase,
};
