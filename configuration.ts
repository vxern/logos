import { Periods } from 'logos/constants.ts';
import { Client } from 'logos/src/client.ts';

const configuration = {
	guilds: {
		namePattern: new RegExp('^Learn ([A-Z][a-z]*)$'),
		environments: {
			'staging': '1055102122137489418',
			'development': '1055102910658269224',
		} satisfies Partial<Record<Client['metadata']['environment'], string>>,
		channels: {
			logging: 'journal',
			verification: 'verifications',
			reports: 'reports',
			suggestions: 'suggestions',

			guideChat: 'guide-chat',

			information: 'rules',
			roles: 'roles',
			welcome: 'welcome',

			voiceChat: 'Voice Chat',
		},
	},
	resultsPerPage: 10,
	commands: {
		purge: {
			maxDeletable: 500,
			maxFound: 1000,
		},
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
			timeoutDuration: Periods.day,
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
			minimumRequiredAge: 6 * Periods.month,
			verification: {
				disabledOn: [] satisfies string[] as string[],
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
