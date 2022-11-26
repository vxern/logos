import { Interaction } from 'discordeno';
import youtube from 'logos/src/commands/music/data/sources/youtube.ts';
import { SongListing } from 'logos/src/commands/music/data/types.ts';
import { Client } from 'logos/src/client.ts';

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
