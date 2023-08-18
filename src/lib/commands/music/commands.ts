import { CommandTemplate } from "../command";
import history from "./commands/history";
import loop from "./commands/loop";
import now from "./commands/now";
import pause from "./commands/pause";
import play from "./commands/play";
import queue from "./commands/queue";
import remove from "./commands/remove";
import replay from "./commands/replay";
import resume from "./commands/resume";
import skip from "./commands/skip";
import skipTo from "./commands/skip-to";
import stop from "./commands/stop";
import unskip from "./commands/unskip";
import volume from "./commands/volume";
import * as Discord from "@discordeno/bot";

const music: CommandTemplate = {
	name: "music",
	type: Discord.ApplicationCommandTypes.ChatInput,
	defaultMemberPermissions: ["VIEW_CHANNEL"],
	options: [history, loop, now, pause, play, queue, remove, replay, resume, skipTo, skip, stop, unskip, volume],
};

export { music };
