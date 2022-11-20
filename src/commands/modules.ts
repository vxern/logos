import information from './information/mod.ts';
import language from './language/module.ts';
import moderation from './moderation/module.ts';
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
