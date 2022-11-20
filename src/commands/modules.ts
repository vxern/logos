import information from './information/mod.ts';
import language from './language/mod.ts';
import moderation from './moderation/mod.ts';
//import music from './music/module.ts';
import server from './server/module.ts';
import social from './social/module.ts';

const commands = [
	...information,
	...language,
	...moderation,
	//...music,
	...server,
	...social,
];

export { commands };
