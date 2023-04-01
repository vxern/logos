import { Bot, Interaction } from 'discordeno';
import { listingTypeToEmoji, SongListing } from 'logos/src/commands/music/data/types.ts';
import { Client, localise } from 'logos/src/client.ts';
import { paginate } from 'logos/src/interactions.ts';
import { chunk } from 'logos/src/utils.ts';
import configuration from 'logos/configuration.ts';
import constants from 'logos/constants.ts';
import { list } from 'logos/formatting.ts';

function displayListings(
	[client, bot]: [Client, Bot],
	interaction: Interaction,
	{ title, songListings }: { title: string; songListings: SongListing[] },
	show: boolean,
	locale: string | undefined,
): void {
	const pages = chunk(songListings, configuration.music.limits.songs.page);

	const strings = {
		title: localise(client, 'music.strings.listings', locale)(),
		listEmpty: localise(client, 'music.strings.listEmpty', locale)(),
	};

	return paginate([client, bot], interaction, {
		elements: pages,
		embed: { title: title, color: constants.colors.blue },
		view: {
			title: strings.title,
			generate: (page, pageIndex) => {
				if (page.length === 0) return strings.listEmpty;

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
