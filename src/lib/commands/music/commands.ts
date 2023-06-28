import { ApplicationCommandTypes } from "discordeno";
import history from "./commands/history.js";
import loop from "./commands/loop.js";
import now from "./commands/now.js";
import pause from "./commands/pause.js";
import play from "./commands/play.js";
import queue from "./commands/queue.js";
import remove from "./commands/remove.js";
import replay from "./commands/replay.js";
import resume from "./commands/resume.js";
import skipTo from "./commands/skip-to.js";
import skip from "./commands/skip.js";
import stop from "./commands/stop.js";
import unskip from "./commands/unskip.js";
import volume from "./commands/volume.js";
import { CommandTemplate } from "../command.js";

const music: CommandTemplate = {
	name: "music",
	type: ApplicationCommandTypes.ChatInput,
	defaultMemberPermissions: ["VIEW_CHANNEL"],
	options: [history, loop, now, pause, play, queue, remove, replay, resume, skipTo, skip, stop, unskip, volume],
};

export default { local: [music], global: [music] };
