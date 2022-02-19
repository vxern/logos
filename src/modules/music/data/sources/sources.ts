import {
	Interaction,
	InteractionApplicationCommandOption,
} from '../../../../../deps.ts';
import { SongListing } from '../song-listing.ts';
import youtube from './youtube.ts';

const sources = ['Spotify', 'YouTube'] as const;
type Source = (typeof sources)[number];

type ListingResolver = (
	interaction: Interaction,
	data: InteractionApplicationCommandOption,
) => Promise<SongListing | undefined>;

const blank: ListingResolver = async (_) => undefined;

const handlers: Record<Source, ListingResolver> = {
	'Spotify': blank,
	'YouTube': youtube,
};

export { handlers };
export type { ListingResolver, Source };
