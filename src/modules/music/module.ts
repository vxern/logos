import { Command } from '../../commands/command.ts';
import forward from './commands/forward.ts';
import history from './commands/history.ts';
import now from './commands/now.ts';
import pause from './commands/pause.ts';
import play from './commands/play.ts';
import queue from './commands/queue.ts';
import remove from './commands/remove.ts';
import replay from './commands/replay.ts';
import rewind from './commands/rewind.ts';
import skip from './commands/skip.ts';
import unpause from './commands/unpause.ts';
import unskip from './commands/unskip.ts';
import volume from './commands/volume.ts';

const commands: Record<string, Command> = {
	forward,
	history,
	now,
	pause,
	play,
	queue,
	remove,
	replay,
	rewind,
	skip,
	unpause,
	unskip,
	volume,
};

export default commands;
