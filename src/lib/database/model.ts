import constants from "../../constants/constants";
import { EntryRequest } from "./entry-request";
import { Guild } from "./guild";
import { GuildStats } from "./guild-stats";
import { Praise } from "./praise";
import { Report } from "./report";
import { Resource } from "./resource";
import { Suggestion } from "./suggestion";
import { Ticket } from "./ticket";
import { User } from "./user";
import { Warning } from "./warning";

interface DocumentMetadata {
	"@id": string;
	"@collection": Collection;
	// TODO(vxern): Put "is-deleted" here
}

interface RawDocument {
	[key: string]: unknown;
	"@metadata": Omit<DocumentMetadata, "@collection"> & { "@collection": string };
}

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

type IdentifierData<M> = M extends Model<any> ? { [K in M["_idParts"][number]]: string } : never;
type MetadataOrIdentifierData<M> = { "@metadata": DocumentMetadata } | IdentifierData<M>;

// TODO(vxern): Add soft-deletion.
abstract class Model<Generic extends { idParts: readonly string[] }> {
	static readonly #_classes: Record<Collection, { new (parameter: any): Model<any> }> = {
		EntryRequests: EntryRequest,
		GuildStats: GuildStats,
		Guilds: Guild,
		Praises: Praise,
		Reports: Report,
		Resources: Resource,
		Suggestions: Suggestion,
		Tickets: Ticket,
		Users: User,
		Warnings: Warning,
	};

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

	constructor({ createdAt, "@metadata": metadata }: { createdAt: number; "@metadata": DocumentMetadata }) {
		this._idParts = metadata["@id"].split(constants.symbols.database.separator).slice(1) as Generic["idParts"];
		this.createdAt = createdAt;
		this["@metadata"] = metadata;
	}

	static from<M extends Model<any>>(data: RawDocument): M {
		if (data["@metadata"]["@collection"] === "@empty") {
			throw `Document ${data["@metadata"]["@collection"]} is not part of any collection.`;
		}

		if (!(data["@metadata"]["@collection"] in Model.#_classes)) {
			throw `Document ${data.id} is part of unknown collection: "${data["@metadata"]["@collection"]}"`;
		}

		const Class = Model.#_classes[data["@metadata"]["@collection"] as Collection];

		return new Class(data) as M;
	}

	static buildPartialId<M extends Model<any>>(data: IdentifierData<M>): string {
		return Object.values(data).join(constants.symbols.database.separator);
	}
}

export { Model };
export type { Collection, RawDocument, DocumentMetadata, MetadataOrIdentifierData };
