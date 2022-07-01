import {
	Interaction,
	InteractionApplicationCommandOption,
} from '../../../../../deps.ts';
import { Client } from '../../../../client.ts';
import { SongListing } from '../song-listing.ts';
import youtube from './youtube.ts';

/** Resolves a song listing from a source. */
type ListingResolver = (
	client: Client,
	interaction: Interaction,
	data: InteractionApplicationCommandOption,
) => Promise<SongListing | undefined>;

/** Defines the available sources. */
const sources: Record<string, ListingResolver> = {
	'YouTube': youtube,
};

export { sources };
export type { ListingResolver };
