import { Bot, Interaction } from '../../../deps.ts';
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
import remove from './commands/remove.ts';
import replay from './commands/replay.ts';
import skip from './commands/skip.ts';
import stop from './commands/stop.ts';
import resume from './commands/resume.ts';
import unskip from './commands/unskip.ts';
import volume from './commands/volume.ts';
import { SongListing } from './data/song-listing.ts';
import { createLocalisations, localise } from '../../../assets/localisations/types.ts';
import { Commands } from '../../../assets/localisations/commands.ts';

const music: CommandBuilder = {
	...createLocalisations(Commands.music),
	defaultMemberPermissions: ['VIEW_CHANNEL'],
	options: [
		history,
		now,
		pause,
		play,
		queue,
		remove,
		replay,
		skip,
		stop,
		resume,
		unskip,
		volume,
	],
};

const commands = [music];

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
			color: configuration.interactions.responses.colors.blue,
		},
		view: {
			title: localise(Commands.music.strings.listings, interaction.locale),
			generate: (page, pageIndex) =>
				page.length === 0 ? localise(Commands.music.strings.listEmpty, interaction.locale) : list(
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
