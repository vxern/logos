import { Bot, Interaction } from 'discordeno';
import youtube from 'logos/src/lib/commands/music/data/sources/youtube.ts';
import { SongListing } from 'logos/src/lib/commands/music/data/types.ts';
import { Client } from 'logos/src/lib/client.ts';

/** Obtains a song listing from a source. */
type ListingResolver = (
	[client, bot]: [Client, Bot],
	interaction: Interaction,
	query: string,
) => Promise<SongListing | undefined>;

/** Stores the available music sources. */
const sources: Record<string, ListingResolver> = { 'YouTube': youtube };

export { sources };
export type { ListingResolver };
