import { fromHex } from './utils.ts';

export default {
	guilds: {
		moderator: {
			role: 'Guide',
		},
		manager: {
			id: '217319536485990400',
		},
		entry: {
			minimumRequiredAge: 60 * 60 * 24 * 1000, // Two days
		},
	},
	responses: {
		colors: {
			red: fromHex('#b42f2f'),
			green: fromHex('#89ef59'),
			blue: fromHex('#6269ed'),
			yellow: fromHex('#f2f277'),
			invisible: fromHex('#36393F'),
		},
	},
};
