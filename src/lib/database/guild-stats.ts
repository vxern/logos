import { Locale } from "../../constants/languages";
import { Model } from "./model";

interface GameStats {
	/** @since v3.42.0 */
	pickMissingWord?: {
		totalSessions: number;
		totalScore: number;
		uniquePlayers: number;
	};
}

class GuildStats extends Model<{ idParts: [guildId: string] }> {
	static readonly collection = "GuildStats";

	get guildId(): string {
		return this._idParts[0]!;
	}

	stats?: Partial<Record<Locale, GameStats>>;

	constructor({ id, createdAt, stats }: { id: string; createdAt: number; stats: Partial<Record<Locale, GameStats>> }) {
		super({ id, createdAt });

		this.stats = stats;
	}
}

export { GuildStats };
