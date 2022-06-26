import { Interaction } from '../../../deps.ts';
import { Command } from '../../commands/structs/command.ts';
import configuration from '../../configuration.ts';
import { list } from '../../formatting.ts';
import { chunk, paginate } from '../../utils.ts';
import history from './commands/history.ts';
import now from './commands/now.ts';
import pause from './commands/pause.ts';
import play from './commands/play.ts';
import queue from './commands/queue.ts';
import replay from './commands/replay.ts';
import skip from './commands/skip.ts';
import unpause from './commands/unpause.ts';
import unskip from './commands/unskip.ts';
import volume from './commands/volume.ts';
import { SongListing } from './data/song-listing.ts';

const commands: Record<string, Command> = {
	history,
	now,
	pause,
	play,
	queue,
	replay,
	skip,
	unpause,
	unskip,
	volume,
};

function displayListings(
	{ interaction, title, listings, show }: {
		interaction: Interaction;
		title: string;
		listings: SongListing[];
		show: boolean;
	},
): void {
	const pages = chunk(listings, configuration.music.maxima.songs.page);

	paginate({
		interaction: interaction,
		elements: pages,
		embed: {
			title: title,
			color: configuration.interactions.responses.colors.blue,
		},
		view: {
			title: 'Page',
			generate: (page, pageIndex) =>
				page.length !== 0
					? list(
						page.map((listing, index) =>
							`${pageIndex * 10 + (index + 1)}. ${
								listing.type === 'SONG' ? '🎵' : '🎶'
							} ~ ${listing.content.title}`
						),
					)
					: 'This list is empty.',
		},
		show: show,
	});
}

export default commands;
export { displayListings };
