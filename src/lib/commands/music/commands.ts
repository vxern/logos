import { ApplicationCommandTypes } from 'discordeno';
import history from 'logos/src/lib/commands/music/commands/history.ts';
import loop from 'logos/src/lib/commands/music/commands/loop.ts';
import now from 'logos/src/lib/commands/music/commands/now.ts';
import pause from 'logos/src/lib/commands/music/commands/pause.ts';
import play from 'logos/src/lib/commands/music/commands/play.ts';
import queue from 'logos/src/lib/commands/music/commands/queue.ts';
import remove from 'logos/src/lib/commands/music/commands/remove.ts';
import replay from 'logos/src/lib/commands/music/commands/replay.ts';
import resume from 'logos/src/lib/commands/music/commands/resume.ts';
import skipTo from 'logos/src/lib/commands/music/commands/skip-to.ts';
import skip from 'logos/src/lib/commands/music/commands/skip.ts';
import stop from 'logos/src/lib/commands/music/commands/stop.ts';
import unskip from 'logos/src/lib/commands/music/commands/unskip.ts';
import volume from 'logos/src/lib/commands/music/commands/volume.ts';
import { CommandTemplate } from 'logos/src/lib/commands/command.ts';

const music: CommandTemplate = {
	name: 'music',
	type: ApplicationCommandTypes.ChatInput,
	defaultMemberPermissions: ['VIEW_CHANNEL'],
	options: [
		history,
		loop,
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

export default { local: [music], global: [music] };
