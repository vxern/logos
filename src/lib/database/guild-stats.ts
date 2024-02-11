import { Locale } from "../../constants/languages";

// TODO(vxern): Improve.
interface GuildStats {
	id: string;

	guildId: string;

	/** @since v3.42.0 */
	stats?: Partial<
		Record<
			Locale,
			{
				pickMissingWord?: {
					totalSessions: number;
					totalScore: number;
					uniquePlayers: number;
				};
			}
		>
	>;

	createdAt: number;
}

export type { GuildStats };
