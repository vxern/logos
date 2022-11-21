import { information } from 'logos/src/commands/information/mod.ts';
import { language } from 'logos/src/commands/language/mod.ts';
import { moderation } from 'logos/src/commands/moderation/mod.ts';
//import { music } from 'logos/src/commands/music/mod.ts';
import { server } from 'logos/src/commands/server/mod.ts';
import { social } from 'logos/src/commands/social/mod.ts';

const commands = [
	...information,
	...language,
	...moderation,
	//...music,
	...server,
	...social,
];

export { commands };
