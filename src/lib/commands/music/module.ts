import constants from "../../../constants.js";
import defaults from "../../../defaults.js";
import { list } from "../../../formatting.js";
import { Client, localise } from "../../client.js";
import { paginate } from "../../interactions.js";
import { chunk } from "../../utils.js";
import { SongListing, listingTypeToEmoji } from "./data/types.js";
import * as Discord from "discordeno";

async function displayListings(
	[client, bot]: [Client, Discord.Bot],
	interaction: Discord.Interaction,
	{ title, songListings }: { title: string; songListings: SongListing[] },
	show: boolean,
	locale: string | undefined,
): Promise<void> {
	const pages = chunk(songListings, defaults.RESULTS_PER_PAGE);

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
