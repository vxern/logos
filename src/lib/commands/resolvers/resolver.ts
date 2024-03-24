import { SongListing } from "logos:constants/music";
import { Client } from "logos/client";

type SongListingResolver = (
	client: Client,
	interaction: Logos.Interaction,
	{ query }: { query: string },
) => Promise<SongListing | undefined>;

export type { SongListingResolver };
