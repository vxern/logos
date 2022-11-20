import { Interaction } from 'discordeno';
import { Client } from '../../../../client.ts';
import { SongListing } from '../mod.ts';
import { youtube } from './mod.ts';

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
