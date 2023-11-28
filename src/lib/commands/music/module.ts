import * as Discord from "@discordeno/bot";
import { Locale } from "../../../constants/languages";
import defaults from "../../../defaults";
import * as Logos from "../../../types";
import { Client, localise } from "../../client";
import { paginate } from "../../interactions";
import { chunk } from "../../utils";
import { SongListing, listingTypeToEmoji } from "./data/types";

async function displayListings(
	[client, bot]: [Client, Discord.Bot],
	interaction: Logos.Interaction,
	{ title, songListings }: { title: string; songListings: SongListing[] },
	show: boolean,
	{ locale }: { locale: Locale },
): Promise<void> {
	const pages = chunk(songListings, defaults.RESULTS_PER_PAGE);

	const strings = {
		listEmpty: localise(client, "music.strings.listEmpty", locale)(),
	};

	paginate(
		[client, bot],
		interaction,
		{
			elements: pages,
			embed: {},
			view: {
				title,
				generate: (page, pageIndex) => {
					if (page.length === 0) {
						return strings.listEmpty;
					}

					return page
						.map((listing, index) => {
							const indexDisplayed = pageIndex * 10 + (index + 1);
							const emoji = listingTypeToEmoji[listing.content.type];

							return `${indexDisplayed}. ${emoji} ~ ${listing.content.title}`;
						})
						.join("\n");
				},
			},
			show,
			showable: true,
		},
		{ locale },
	);
}

export { displayListings };
