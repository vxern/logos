import information from 'logos/src/commands/information/commands.ts';
import language from 'logos/src/commands/language/commands.ts';
import moderation from 'logos/src/commands/moderation/commands.ts';
import music from 'logos/src/commands/music/commands.ts';
import server from 'logos/src/commands/server/commands.ts';
import social from 'logos/src/commands/social/commands.ts';

export default [
	...information,
	...language,
	...moderation,
	...music,
	...server,
	...social,
];
