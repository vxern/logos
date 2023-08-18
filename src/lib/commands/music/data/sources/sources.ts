import * as Logos from "../../../../../types";
import { Client } from "../../../../client";
import { SongListing } from "../types";
import youtube from "./youtube";
import * as Discord from "@discordeno/bot";

/** Obtains a song listing from a source. */
type ListingResolver = (
	[client, bot]: [Client, Discord.Bot],
	interaction: Logos.Interaction,
	query: string,
) => Promise<SongListing | undefined>;

/** Stores the available music sources. */
const sources: Record<string, ListingResolver> = { YouTube: youtube };

export { sources };
export type { ListingResolver };
