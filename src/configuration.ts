import { Misc } from '../assets/localisations/misc.ts';
import { SongListingContentTypes } from './commands/music/data/song-listing.ts';
import { Language } from './types.ts';
import { fromHex } from './utils.ts';

class Periods {
	static readonly second = 1000;
	static readonly minute = 60 * Periods.second;
	static readonly hour = 60 * Periods.minute;
	static readonly day = 24 * Periods.hour;
	static readonly week = 7 * Periods.day;
	static readonly month = 30 * Periods.day;
	static readonly year = 365 * Periods.day;
}

const timeDescriptors: [typeof Misc.time.periods.second, number][] = [
	[Misc.time.periods.second, Periods.second],
	[Misc.time.periods.minute, Periods.minute],
	[Misc.time.periods.hour, Periods.hour],
	[Misc.time.periods.day, Periods.day],
	[Misc.time.periods.week, Periods.week],
	[Misc.time.periods.month, Periods.month],
	[Misc.time.periods.year, Periods.year],
];

const settings = {
	// Configuration settings pertaining to core functions of the application.
	core: {
		// Configuration settings pertaining to event collectors.
		collectors: {
			maxima: {
				// How long it should take before a collector is automatically deinitialised.
				timeout: 6 * Periods.hour,
			},
		},
		// Configuration settings pertaining to the database.
		database: {
			// Configuration settings pertaining to the caching of objects.
			cache: {
				// Maximum number of entries per each data type to be kept in cache.
				maxima: {
					articles: 500,
					users: 300,
				},
			},
		},
	},
	// Configuration settings pertaining to the managed guilds.
	guilds: {
		nameExpression: new RegExp('^Learn ([A-Z][a-z]*)$'),
		// Configuration settings pertaining to the guild channels.
		channels: {
			logging: 'journal',
			conference: 'conference',
			verification: 'verifications',
		},
		// Configuration settings pertaining to the topic languages of managed guilds.
		languages: <Record<
			Language,
			{ requiresVerification: boolean; dialects: string[] }
		>> {
			'Armenian': {
				requiresVerification: false,
				dialects: ['Western Armenian', 'Eastern Armenian', 'Karabakh Dialect'],
			},
			'Belarusian': {
				requiresVerification: false,
				dialects: [],
			},
			'English': {
				requiresVerification: false,
				dialects: [],
			},
			'Polish': {
				requiresVerification: false,
				dialects: [],
			},
			'Romanian': {
				requiresVerification: false,
				dialects: [],
			},
		},
		praises: {
			interval: Periods.hour,
			maximum: 1,
		},
		// Configuration settings pertaining to the de facto owner of the managed guilds.
		owner: {
			id: 217319536485990400n,
		},
		// Configuration settings pertaining to guild moderators.
		moderation: {
			// The role responsible for taking moderation action.
			moderator: 'Guide',
			warnings: {
				interval: 2 * Periods.month,
				maximum: 3,
			},
			// Configuration settings pertaining to moderation abuse prevention.
			antiAbuse: {
				replacementRole: 'Under Review',
				// The proportion of messages a given user must have posted in the past year for
				// the anti-abuse system to trigger.
				allowance: 0.1,
				// The interval within which the enforcements must have taken place.
				interval: Periods.day,
				// The thresholds at which the anti-abuse system operates.
				thresholds: [{
					age: 0,
					string: 'less than a day',
					maximum: 8,
				}, {
					age: Periods.day,
					string: 'a day',
					maximum: 6,
				}, {
					age: Periods.week,
					string: 'a week',
					maximum: 4,
				}, {
					age: Periods.month,
					string: 'a month',
					maximum: 3,
				}, {
					age: 6 * Periods.month,
					string: 'six months',
					maximum: 2,
				}, {
					age: Periods.year,
					string: 'a year',
					maximum: 1,
				}],
			},
		},
		// Configuration settings pertaining to entry to the guild.
		entry: {
			minimumRequiredAge: 2 * Periods.day,
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
		maxima: {
			// The maximum volume
			volume: 100,
			songs: {
				history: 100,
				queue: 20,
				page: 10,
			},
		},
	},
	interactions: {
		// Configuration settings pertaining to responses to commands.
		responses: {
			// The standard number of results to display per page.
			resultsPerPage: 10,
			// The standardised, available set of colours the bot can utilise for its embed messages.
			colors: {
				red: fromHex('#b42f2f'),
				darkRed: fromHex('#820000'),
				green: fromHex('#89ef59'),
				darkGreen: fromHex('#479621'),
				blue: fromHex('#6269ed'),
				yellow: fromHex('#f2f277'),
				// This colour matches the colour of an embed message,
				// making it seem like there is no colour stripe.
				invisible: fromHex('#36393f'),
			},
			// The standardised, available set of custom emojis the bot can utilise for its embed messages.
			emojis: {
				typescript: '<:TypeScript:1034795288185024592>',
				deno: '<:Deno:1034795684852932729>',
				discordeno: '<:Discordeno:1034795720315777086>',
			},
		},
		// Configuration settings pertaining to articles.
		articles: {
			contributors: ['Guide'],
			restrictions: {
				newlines: {
					body: 0.03,
					footer: 0.01,
					consecutive: 2,
				},
				paragraphLength: 400,
			},
			create: {
				// The maximum number of articles that can be created...
				maximum: {
					contributors: 20,
					members: 3,
				},
				// ... in the interval:
				interval: Periods.day,
			},
			edit: {
				// The maximum number of edits that can be made...
				maximum: {
					contributors: 40,
					members: 5,
				},
				// ... in the interval:
				interval: Periods.day / 2,
			},
		},
	},
};

export default settings;
export { Periods, timeDescriptors };
