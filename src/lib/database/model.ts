import constants from "../../constants/constants";

type Collection =
	| "EntryRequests"
	| "GuildStats"
	| "Guilds"
	| "Praises"
	| "Reports"
	| "Resources"
	| "Suggestions"
	| "Tickets"
	| "Users"
	| "Warnings";

// TODO(vxern): Add soft-deletion.
abstract class Model<Generic extends { idParts: string[] }> {
	static readonly collection: Collection;
	static readonly #collectionLowerCase = Model.collection.toLowerCase();

	readonly _idParts: Generic["idParts"];

	readonly createdAt: number;

	get partialId(): string {
		return this._idParts.join();
	}

	get id(): string {
		return `${Model.#collectionLowerCase}${constants.symbols.database.separator}${this.partialId}`;
	}

	constructor({ id, createdAt }: { id: string; createdAt: number }) {
		this._idParts = id.split(constants.symbols.database.separator).slice(1) as Generic["idParts"];
		this.createdAt = createdAt;
	}
}

export { Model };
export type { Collection };
