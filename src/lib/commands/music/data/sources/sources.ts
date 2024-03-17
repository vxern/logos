import { Client } from "../../../../client";
import { SongListing } from "../types";
import youtube from "./youtube";

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
