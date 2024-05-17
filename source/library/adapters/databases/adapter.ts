import type { Collection } from "logos:constants/database";
import type { Environment } from "logos:core/loaders/environment";
import { type IdentifierData, type IdentifierDataOrMetadata, Model } from "logos/database/model";
import { Logger } from "logos/logger";
import type { DatabaseStore } from "logos/stores/database";

abstract class DatabaseAdapter {
	readonly log: Logger;

	constructor({ identifier, environment }: { identifier: string; environment: Environment }) {
		this.log = Logger.create({ identifier: `DatabaseAdapter(${identifier})`, isDebug: environment.isDebug });
	}

	abstract setup(): void | Promise<void>;

	abstract teardown(): void | Promise<void>;

	abstract conventionsFor({
		document,
		data,
		collection,
	}: { document: Model; data: IdentifierDataOrMetadata<Model>; collection: Collection }): DocumentConventions;

	abstract openSession({
		environment,
		database,
	}: { environment: Environment; database: DatabaseStore }): DocumentSession;

	async withSession<T>(
		callback: (session: DocumentSession) => T | Promise<T>,
		{ environment, database }: { environment: Environment; database: DatabaseStore },
	): Promise<T> {
		const session = this.openSession({ environment, database });

		const result = await callback(session);

		await session.dispose();

		return result;
	}
}

abstract class DocumentSession {
	readonly log: Logger;
	readonly database: DatabaseStore;

	constructor({
		identifier,
		environment,
		database,
	}: { environment: Environment; identifier: string; database: DatabaseStore }) {
		this.log = Logger.create({ identifier: `DocumentSession(${identifier})`, isDebug: environment.isDebug });
		this.database = database;
	}

	abstract load<M extends Model>(id: string): Promise<M | undefined>;
	async get<M extends Model>(id: string): Promise<M | undefined> {
		const document = await this.load<M>(id);
		if (document === undefined || document.isDeleted) {
			return undefined;
		}

		this.database.cacheDocument(document);

		return document;
	}

	abstract loadMany<M extends Model>(ids: string[]): (M | undefined)[] | Promise<(M | undefined)[]>;
	async getMany<M extends Model>(ids: string[]): Promise<(M | undefined)[]> {
		const results = await this.loadMany<M>(ids);

		const documents: (M | undefined)[] = [];
		for (const document of Object.values(results)) {
			if (document === undefined || document.isDeleted) {
				documents.push(undefined);
				continue;
			}

			this.database.cacheDocument(document);
			documents.push(document);
		}

		return documents;
	}

	abstract store<M extends Model>(document: M): void | Promise<void>;
	async set<M extends Model>(document: M): Promise<M> {
		await this.store(document);
		this.database.cacheDocument(document);

		return document;
	}

	remove<M extends Model>(document: M): void {
		// We don't call any methods to delete a document here because we don't actually delete anything from the
		// database; we merely *mark* documents as deleted.

		this.database.unloadDocument(document);
	}

	abstract query<M extends Model>({ collection }: { collection: Collection }): DocumentQuery<M>;

	abstract dispose(): void | Promise<void>;

	async loadManyTabulated<M extends Model, RawDocument>(
		ids: string[],
		{
			loadMany,
			instantiateModel,
		}: {
			loadMany: (ids: string[], { collection }: { collection: Collection }) => Promise<RawDocument[]>;
			instantiateModel: (database: DatabaseStore, rawDocument: RawDocument) => M;
		},
	): Promise<(M | undefined)[]> {
		if (ids.length === 0) {
			return [];
		}

		const idsWithIndex = ids.map<[string, number]>((id, index) => [id, index]);
		const idsWithIndexByCollection = new Map<Collection, [id: string, index: number][]>();
		for (const [id, index] of idsWithIndex) {
			const [collection, _] = Model.decomposeId(id);
			if (!idsWithIndexByCollection.has(collection)) {
				idsWithIndexByCollection.set(collection, [[id, index]]);
				continue;
			}

			idsWithIndexByCollection.get(collection)!.push([id, index]);
		}

		const promises: Promise<[rawDocument: RawDocument, index: number][]>[] = [];
		for (const [collection, idsWithIndexes] of idsWithIndexByCollection) {
			const ids = idsWithIndexes.map(([id, _]) => id);
			const indexes = idsWithIndexes.map(([_, index]) => index);

			promises.push(
				loadMany(ids, { collection }).then((rawDocuments) =>
					rawDocuments.map<[rawDocument: RawDocument, index: number]>((rawDocument, index) => [
						rawDocument,
						indexes[index]!,
					]),
				),
			);
		}

		const resultsUnsorted = await Promise.all(promises).then((results) => results.flat());
		const resultsSorted = resultsUnsorted.sort(([_, a], [__, b]) => a - b);

		return resultsSorted.map(([rawDocument, _]) => instantiateModel(this.database, rawDocument));
	}
}

abstract class DocumentQuery<M extends Model> {
	abstract whereRegex(property: string, pattern: RegExp): DocumentQuery<M>;

	abstract whereEquals(property: string, value: unknown): DocumentQuery<M>;

	abstract execute(): M[] | Promise<M[]>;
	async run(): Promise<M[]> {
		const documents = await this.execute();
		return documents.filter((document) => !document.isDeleted);
	}
}

/**
 * Represents the set of document storage conventions used by a given database solution.
 *
 * Different database solutions define their own conventions and defaults for storing documents. For example, MongoDB
 * and CouchDB stores the document ID under `_id`, RavenDB stores it under `@metadata.@id`, and RethinkDB stores it as
 * just `id`. These kinds of differences between give birth to the need for having an object that works alongside models
 * in accordance to a set of predefined conventions.
 */
abstract class DocumentConventions<Metadata = any> {
	readonly document: Model & Metadata;
	readonly partialId: string;
	readonly idParts: string[];
	readonly collection: Collection;

	abstract get id(): string;

	/**
	 * @privateRemarks
	 * Can optionally be overridden by the concrete convention, and by default does not retrieve any underlying value
	 * for a revision. This is okay because only certain databases have to keep track of revisions, and most of them
	 * never consult with this value.
	 */
	get revision(): string | undefined {
		return undefined;
	}

	/**
	 * @privateRemarks
	 * Same remarks as for the getter; only some conventions have a use for the revision.
	 */
	set revision(_: string) {}

	/**
	 * @privateRemarks
	 * Same remarks as for revision.
	 */
	get isDeleted(): boolean | undefined {
		return undefined;
	}

	/**
	 * @privateRemarks
	 * Same remarks as for revision.
	 */
	set isDeleted(_: boolean) {}

	constructor({
		document,
		data,
		collection,
	}: { document: Model; data: IdentifierDataOrMetadata<Model, Metadata>; collection: Collection }) {
		this.document = document as Model & Metadata;

		this.assignAccessorsToModel();

		this.#populateModelData(data, { collection });

		const partialId = this.#getPartialIdFromData(data);
		this.collection = collection;
		this.partialId = partialId;
		this.idParts = partialId.split(constants.special.database.separator);
	}

	#getPartialIdFromData(data: IdentifierDataOrMetadata<Model, Metadata>): string {
		let partialId: string;
		if (this.hasMetadata(data)) {
			partialId = Model.decomposeId(this.id)[1];
		} else {
			partialId = Model.buildPartialId(data as IdentifierData<Model>);
		}

		return partialId;
	}

	#populateModelData(
		data: IdentifierDataOrMetadata<Model, Metadata>,
		{ collection }: { collection: Collection },
	): void {
		if (this.hasMetadata(data)) {
			Object.assign(this.document, data);
		} else {
			const id = Model.buildId(data as IdentifierData<Model>, { collection });
			Object.assign(this.document, this.buildMetadata({ id, collection }));
		}
	}

	assignAccessorsToModel(): void {
		const conventions = this;
		Object.defineProperty(this.document, "id", {
			get(): string {
				return conventions.id;
			},
		});
	}

	/**
	 * Determines whether the given data object contains document metadata, which would be characteristic of a document
	 * that already exists, or just identifier data, which would be characteristic of a document that is only just
	 * getting created.
	 */
	abstract hasMetadata(data: IdentifierDataOrMetadata<Model, Metadata>): boolean;

	/**
	 * Given the {@link id} of the document and the {@link collection} it belongs to, builds out the metadata stored on
	 * documents in the database employing this set of conventions.
	 */
	abstract buildMetadata({ id, collection }: { id: string; collection: Collection }): Metadata;
}

export { DatabaseAdapter, DocumentSession, DocumentQuery, DocumentConventions };
