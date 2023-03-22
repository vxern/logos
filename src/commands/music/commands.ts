import { ApplicationCommandTypes } from 'discordeno';
import history from 'logos/src/commands/music/commands/history.ts';
import now from 'logos/src/commands/music/commands/now.ts';
import pause from 'logos/src/commands/music/commands/pause.ts';
import play from 'logos/src/commands/music/commands/play.ts';
import queue from 'logos/src/commands/music/commands/queue.ts';
import remove from 'logos/src/commands/music/commands/remove.ts';
import replay from 'logos/src/commands/music/commands/replay.ts';
import resume from 'logos/src/commands/music/commands/resume.ts';
import skipTo from 'logos/src/commands/music/commands/skip-to.ts';
import skip from 'logos/src/commands/music/commands/skip.ts';
import stop from 'logos/src/commands/music/commands/stop.ts';
import unskip from 'logos/src/commands/music/commands/unskip.ts';
import volume from 'logos/src/commands/music/commands/volume.ts';
import { CommandTemplate } from 'logos/src/commands/command.ts';

const music: CommandTemplate = {
	name: 'music',
	type: ApplicationCommandTypes.ChatInput,
	defaultMemberPermissions: ['VIEW_CHANNEL'],
	options: [
		history,
		now,
		pause,
		play,
		queue,
		remove,
		replay,
		resume,
		skipTo,
		skip,
		stop,
		unskip,
		volume,
	],
};

const commands = [music];

export default commands;
