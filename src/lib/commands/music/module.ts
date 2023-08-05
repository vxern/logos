import constants from "../../../constants/constants";
import { Locale } from "../../../constants/language";
import defaults from "../../../defaults";
import { list } from "../../../formatting";
import * as Logos from "../../../types";
import { Client, localise } from "../../client";
import { paginate } from "../../interactions";
import { chunk } from "../../utils";
import { SongListing, listingTypeToEmoji } from "./data/types";
import * as Discord from "discordeno";

async function displayListings(
	[client, bot]: [Client, Discord.Bot],
	interaction: Logos.Interaction,
	{ title, songListings }: { title: string; songListings: SongListing[] },
	show: boolean,
	{ locale }: { locale: Locale },
): Promise<void> {
	const pages = chunk(songListings, defaults.RESULTS_PER_PAGE);

	const strings = {
		title: localise(client, "music.strings.listings", locale)(),
		listEmpty: localise(client, "music.strings.listEmpty", locale)(),
	};

	paginate(
		[client, bot],
		interaction,
		{
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
		},
		{ locale },
	);
}

export { displayListings };
