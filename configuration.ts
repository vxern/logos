import { SongListingContentTypes } from 'logos/src/commands/music/data/types.ts';
import { fromHex } from 'logos/src/utils.ts';
import { Periods } from 'logos/constants.ts';

const configuration = {
	permissions: {
		moderatorRoleName: 'Guide',
	},
	collectors: {
		expiresIn: 6 * Periods.hour,
	},
	database: {
		cache: {
			limits: {
				articles: 500,
				users: 300,
			},
		},
	},
	guilds: {
		namePattern: new RegExp('^Learn ([A-Z][a-z]*)$'),
		channels: {
			logging: 'journal',
			conference: 'conference',
			verification: 'verifications',
			voiceChat: 'Voice Chat',
		},
	},
	messages: {
		colors: {
			invisible: fromHex('#36393f'),
			red: fromHex('#b42f2f'),
			darkRed: fromHex('#820000'),
			green: fromHex('#89ef59'),
			darkGreen: fromHex('#479621'),
			blue: fromHex('#6269ed'),
			yellow: fromHex('#f2f277'),
		},
	},
	resultsPerPage: 10,
	commands: {
		warn: {
			limit: 3,
			within: 2 * Periods.month,
		},
		praise: {
			limit: 3,
			within: 6 * Periods.hour,
		},
	},
	// Configuration settings pertaining to music.
	music: {
		symbols: <Record<string, string>> {
			[SongListingContentTypes.Song]: '🎵',
			[SongListingContentTypes.External]: '📁',
			[SongListingContentTypes.Collection]: '🎶',
		},
		disconnectTimeout: 10 * Periods.minute,
		limits: {
			// The maximum volume
			volume: 100,
			songs: {
				history: 100,
				queue: 20,
				page: 10,
			},
		},
	},
	services: {
		entry: {
			minimumRequiredAge: 2 * Periods.day,
			verification: {
				disabledOn: [] as string[],
				proportionVotesToAccept: 0.2,
				proportionVotesToReject: 0.5,
				defaultVotesRequired: 2,
			},
		},
		dynamicVoiceChannels: {
			limit: 5,
		},
	},
};

export default configuration;
