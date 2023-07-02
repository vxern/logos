import information from "./information/commands.js";
import language from "./language/commands.js";
import moderation from "./moderation/commands.js";
import music from "./music/commands.js";
import server from "./server/commands.js";
import social from "./social/commands.js";

const modules = [information, language, moderation, music, server, social];

export default {
	local: modules.flatMap((module) => module.local),
	global: modules.flatMap((module) => module.global),
};
