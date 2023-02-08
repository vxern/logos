import { Periods } from 'logos/constants.ts';

const configuration = {
	permissions: {
		moderatorRoleNames: {
			main: 'Guide',
			others: ['Trainee Guide'],
		},
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
			verification: 'verifications',
			reports: 'reports',
			suggestions: 'suggestions',

			moderation: 'moderation',

			information: 'rules',
			roles: 'roles',
			welcome: 'welcome',

			voiceChat: 'Voice Chat',
		},
	},
	resultsPerPage: 10,
	commands: {
		report: {
			limitUses: 2,
			within: 30 * Periods.minute,
			limitUsers: 5,
		},
		suggestion: {
			limitUses: 3,
			within: 2 * Periods.hour,
		},
		warn: {
			limitUses: 3,
			within: 2 * Periods.month,
		},
		praise: {
			limitUses: 3,
			within: 6 * Periods.hour,
		},
	},
	rateLimiting: {
		limit: 3,
		within: 30 * Periods.second,
	},
	// Configuration settings pertaining to music.
	music: {
		defaultVolume: 50,
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
