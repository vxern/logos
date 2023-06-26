import developer from 'logos/src/commands/developer/commands.ts';
import information from 'logos/src/commands/information/commands.ts';
import language from 'logos/src/commands/language/commands.ts';
import moderation from 'logos/src/commands/moderation/commands.ts';
import music from 'logos/src/commands/music/commands.ts';
import server from 'logos/src/commands/server/commands.ts';
import social from 'logos/src/commands/social/commands.ts';

const modules = [developer, information, language, moderation, music, server, social];

export default {
	global: modules.map((module) => module.global).flat(),
	local: modules.map((module) => module.local).flat(),
};
