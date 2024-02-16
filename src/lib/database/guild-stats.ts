import { Locale } from "../../constants/languages";
import { MetadataOrIdentifierData, Model } from "./model";

interface GameStats {
	/** @since v3.42.0 */
	pickMissingWord?: {
		totalSessions: number;
		totalScore: number;
		uniquePlayers: number;
	};
}

class GuildStats extends Model<{ idParts: ["guildId"] }> {
	get guildId(): string {
		return this._idParts[0]!;
	}

	stats?: Partial<Record<Locale, GameStats>>;

	constructor({
		createdAt,
		stats,
		...data
	}: {
		createdAt: number;
		stats: Partial<Record<Locale, GameStats>>;
	} & MetadataOrIdentifierData<GuildStats>) {
		super({
			createdAt,
			"@metadata":
				"@metadata" in data
					? data["@metadata"]
					: { "@collection": "GuildStats", "@id": Model.buildPartialId<GuildStats>(data) },
		});

		this.stats = stats;
	}
}

export { GuildStats };
export type { GameStats };
