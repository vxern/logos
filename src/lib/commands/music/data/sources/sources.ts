import { Client } from "../../../../client.js";
import { SongListing } from "../types.js";
import youtube from "./youtube.js";
import * as Discord from "discordeno";

/** Obtains a song listing from a source. */
type ListingResolver = (
	[client, bot]: [Client, Discord.Bot],
	interaction: Discord.Interaction,
	query: string,
) => Promise<SongListing | undefined>;

/** Stores the available music sources. */
const sources: Record<string, ListingResolver> = { YouTube: youtube };

export { sources };
export type { ListingResolver };
