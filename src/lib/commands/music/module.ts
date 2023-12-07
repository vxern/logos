import * as Discord from "@discordeno/bot";
import { Locale } from "../../../constants/languages";
import * as Logos from "../../../types";
import { Client, localise } from "../../client";
import { paginate } from "../../interactions";
import { SongListing, listingTypeToEmoji } from "./data/types";

async function displayListings(
	[client, bot]: [Client, Discord.Bot],
	interaction: Logos.Interaction,
	{ title, getSongListings }: { title: string; getSongListings: () => SongListing[][] },
	show: boolean,
	{ locale }: { locale: Locale },
): Promise<() => Promise<void>> {
	const strings = {
		listEmpty: localise(client, "music.strings.listEmpty", locale)(),
	};

	return paginate(
		[client, bot],
		interaction,
		{
			getElements: getSongListings,
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
