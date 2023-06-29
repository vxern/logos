import { Bot, Interaction } from "discordeno";
import { listingTypeToEmoji, SongListing } from "./data/types.js";
import { Client, localise } from "../../client.js";
import { paginate } from "../../interactions.js";
import { chunk } from "../../utils.js";
import configuration from "../../../configuration.js";
import constants from "../../../constants.js";
import { list } from "../../../formatting.js";

async function displayListings(
	[client, bot]: [Client, Bot],
	interaction: Interaction,
	{ title, songListings }: { title: string; songListings: SongListing[] },
	show: boolean,
	locale: string | undefined,
): Promise<void> {
	const pages = chunk(songListings, configuration.music.limits.songs.page);

	const strings = {
		title: localise(client, "music.strings.listings", locale)(),
		listEmpty: localise(client, "music.strings.listEmpty", locale)(),
	};

	paginate([client, bot], interaction, {
		elements: pages,
		embed: { title: title, color: constants.colors.blue },
		view: {
			title: strings.title,
			generate: (page, pageIndex) => {
				if (page.length === 0) {
					return strings.listEmpty;
				}

				return list(
					page.map((listing, index) => {
						const indexDisplayed = pageIndex * 10 + (index + 1);
						const emoji = listingTypeToEmoji[listing.content.type];

						return `${indexDisplayed}. ${emoji} ~ ${listing.content.title}`;
					}),
				);
			},
		},
		show,
	});
}

export { displayListings };
