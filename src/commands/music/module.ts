import { Interaction } from '../../../deps.ts';
import { Client } from '../../client.ts';
import configuration from '../../configuration.ts';
import { list } from '../../formatting.ts';
import { chunk, paginate } from '../../utils.ts';
import { CommandBuilder } from '../command.ts';
import history from './commands/history.ts';
import now from './commands/now.ts';
import pause from './commands/pause.ts';
import play from './commands/play.ts';
import queue from './commands/queue.ts';
import replay from './commands/replay.ts';
import skip from './commands/skip.ts';
import stop from './commands/stop.ts';
import unpause from './commands/unpause.ts';
import unskip from './commands/unskip.ts';
import volume from './commands/volume.ts';
import { SongListing } from './data/song-listing.ts';

const music: CommandBuilder = {
	name: 'music',
	nameLocalizations: {
		pl: 'muzyka',
		ro: 'muzică',
	},
	description: 'Allows the user to manage music playback in a voice channel.',
	descriptionLocalizations: {
		pl:
			'Pozwala użytkownikowi na zarządanie odtwarzaniem muzyki w kanale głosowym.',
		ro:
			'Permite utilizatorului gestionarea redării muzicii într-un canal de voce.',
	},
	defaultMemberPermissions: ['VIEW_CHANNEL'],
	options: [
		history,
		now,
		pause,
		play,
		queue,
		replay,
		skip,
		stop,
		unpause,
		unskip,
		volume,
	],
};

const commands = [music];

function displayListings(
	client: Client,
	interaction: Interaction,
	{ title, songListings, show }: {
		title: string;
		songListings: SongListing[];
		show: boolean;
	},
): void {
	const pages = chunk(songListings, configuration.music.maxima.songs.page);

	paginate(client, interaction, {
		elements: pages,
		embed: {
			title: title,
			color: configuration.interactions.responses.colors.blue,
		},
		view: {
			title: 'Listings',
			generate: (page, pageIndex) =>
				page.length === 0 ? 'This list is empty.' : list(
					page.map((listing, index) =>
						`${pageIndex * 10 + (index + 1)}. ${
							(configuration.music.symbols)[listing.content.type]
						} ~ ${listing.content.title}`
					),
				),
		},
		show: show,
	});
}

export default commands;
export { displayListings };
