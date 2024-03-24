import { Client } from "logos/client";
import youtube from "logos/commands/music/data/sources/youtube";
import { SongListing } from "logos/commands/music/data/types";

/** Obtains a song listing from a source. */
type ListingResolver = (
	client: Client,
	interaction: Logos.Interaction,
	query: string,
) => Promise<SongListing | undefined>;

/** Stores the available music sources. */
const sources = { YouTube: youtube } as const satisfies Record<string, ListingResolver>;

export { sources };
export type { ListingResolver };
