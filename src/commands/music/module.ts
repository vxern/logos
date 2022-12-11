import { Bot, Interaction } from 'discordeno';
import { Commands, localise } from 'logos/assets/localisations/mod.ts';
import { SongListing } from 'logos/src/commands/music/data/types.ts';
import { Client } from 'logos/src/client.ts';
import { paginate } from 'logos/src/interactions.ts';
import { chunk } from 'logos/src/utils.ts';
import configuration from 'logos/configuration.ts';
import { list } from 'logos/formatting.ts';

function displayListings(
	clientWithBot: [Client, Bot],
	interaction: Interaction,
	{ title, songListings, show }: {
		title: string;
		songListings: SongListing[];
		show: boolean;
	},
): void {
	const pages = chunk(songListings, configuration.music.maxima.songs.page);

	return paginate(clientWithBot, interaction, {
		elements: pages,
		embed: {
			title: title,
			color: configuration.messages.colors.blue,
		},
		view: {
			title: localise(Commands.music.strings.listings, interaction.locale),
			generate: (page, pageIndex) => {
				if (page.length === 0) {
					return localise(Commands.music.strings.listEmpty, interaction.locale);
				}

				return list(
					page.map((listing, index) => {
						const indexDisplayed = pageIndex * 10 + (index + 1);
						const symbol = configuration.music.symbols[listing.content.type];

						return `${indexDisplayed}. ${symbol} ~ ${listing.content.title}`;
					}),
				);
			},
		},
		show: show,
	});
}

export { displayListings };
