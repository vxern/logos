import { Client } from "logos/client";
import { SongListing } from "logos/services/music";

type SongListingResolver = (
	client: Client,
	interaction: Logos.Interaction,
	{ query }: { query: string },
) => Promise<SongListing | undefined>;

export type { SongListingResolver };
