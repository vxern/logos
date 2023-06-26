import developer from 'logos/src/lib/commands/developer/commands.ts';
import information from 'logos/src/lib/commands/information/commands.ts';
import language from 'logos/src/lib/commands/language/commands.ts';
import moderation from 'logos/src/lib/commands/moderation/commands.ts';
import music from 'logos/src/lib/commands/music/commands.ts';
import server from 'logos/src/lib/commands/server/commands.ts';
import social from 'logos/src/lib/commands/social/commands.ts';

const modules = [developer, information, language, moderation, music, server, social];

export default {
	local: modules.map((module) => module.local).flat(),
	global: modules.map((module) => module.global).flat(),
};
