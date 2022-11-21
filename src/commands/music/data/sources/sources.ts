import { Interaction } from 'discordeno';
import { Client } from 'logos/src/mod.ts';
import { SongListing } from 'logos/src/commands/music/data/mod.ts';
import { youtube } from 'logos/src/commands/music/data/sources/mod.ts';

/** Obtains a song listing from a source. */
type ListingResolver = (
	client: Client,
	interaction: Interaction,
	query: string,
) => Promise<SongListing | undefined>;

/** Stores the available music sources. */
const sources: Record<string, ListingResolver> = {
	'YouTube': youtube,
};

export { sources };
export type { ListingResolver };
