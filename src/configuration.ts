import { TextStyles } from '../deps.ts';
import { SongListingContentTypes } from './commands/music/data/song-listing.ts';
import { Language } from './types.ts';
import { fromHex } from './utils.ts';

const second = 1000;
const minute = 60 * second;
const hour = 60 * minute;
const day = 24 * hour;
const week = 7 * day;
const month = 30 * day;
const year = 365 * day;

const timeDescriptors: [string[], number][] = [
	[['s', 'sec', 'second', 'seconds'], second],
	[['m', 'min', 'minute', 'minutes'], minute],
	[['h', 'hr', 'hour', 'hours'], hour],
	[['d', 'day', 'days'], day],
	[['w', 'wk', 'week', 'weeks'], week],
	[['M', 'month', 'months'], month],
	[['y', 'year', 'years'], year],
];

const settings = {
	// Configuration settings pertaining to core functions of the application.
	core: {
		// Configuration settings pertaining to event collectors.
		collectors: {
			maxima: {
				// How long it should take before a collector is automatically deinitialised.
				timeout: 6 * hour,
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
			verification: 'verifications',
		},
		defaultLanguage: 'english',
		// Configuration settings pertaining to the topic languages of managed guilds.
		languages: <Record<
			Language,
			{ requiresVerification: boolean; dialects: string[] }
		>> {
			'Armenian': {
				requiresVerification: true,
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
			'Romanian': {
				requiresVerification: false,
				dialects: [],
			},
		},
		praises: {
			interval: hour,
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
				interval: 2 * month,
				maximum: 3,
			},
			// Configuration settings pertaining to moderation abuse prevention.
			antiAbuse: {
				replacementRole: 'Under Review',
				// The proportion of messages a given user must have posted in the past year for
				// the anti-abuse system to trigger.
				allowance: 0.1,
				// The interval within which the enforcements must have taken place.
				interval: day,
				// The thresholds at which the anti-abuse system operates.
				thresholds: [{
					age: 0,
					string: 'less than a day',
					maximum: 8,
				}, {
					age: day,
					string: 'a day',
					maximum: 6,
				}, {
					age: week,
					string: 'a week',
					maximum: 4,
				}, {
					age: month,
					string: 'a month',
					maximum: 3,
				}, {
					age: 6 * month,
					string: 'six months',
					maximum: 2,
				}, {
					age: year,
					string: 'a year',
					maximum: 1,
				}],
			},
		},
		// Configuration settings pertaining to entry to the guild.
		entry: {
			minimumRequiredAge: 2 * day,
		},
	},
	// Configuration settings pertaining to music.
	music: {
		symbols: <Record<string, string>> {
			[SongListingContentTypes.Song]: '🎵',
			[SongListingContentTypes.External]: '📁',
			[SongListingContentTypes.Collection]: '🎶',
		},
		disconnectTimeout: 10 * minute,
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
				green: fromHex('#89ef59'),
				blue: fromHex('#6269ed'),
				yellow: fromHex('#f2f277'),
				// This colour matches the colour of an embed message,
				// making it seem like there is no colour stripe.
				invisible: fromHex('#36393f'),
				darkRed: fromHex('#820000'),
			},
		},
		// Configuration settings pertaining to user forms.
		forms: {
			// Configuration settings pertaining to the article editor.
			article: {
				title: 'Article Editor',
				// Definitions of fields in the article editor form.
				fields: {
					title: {
						type: 'TEXT_INPUT',
						label: 'Title of your article',
						style: TextStyles.Short,
						minimum: 10,
						maximum: 50,
					},
					body: {
						type: 'TEXT_INPUT',
						label: 'Body of your article',
						style: TextStyles.Paragraph,
						minimum: 30,
						maximum: 3000,
					},
					footer: {
						type: 'TEXT_INPUT',
						label: 'Additional information / notes',
						style: TextStyles.Paragraph,
						required: false,
						minimum: 10,
						maximum: 500,
					},
				},
			},
			// Configuration settings pertaining to user verification.
			verification: {
				title: 'Verification Questions',
				// Definitions of fields in the verification form.
				fields: {
					reason: {
						type: 'TEXT_INPUT',
						label: (language: string) =>
							`What is your reason for learning ${language}?`,
						style: TextStyles.Paragraph,
						minimum: 20,
						maximum: 300,
					},
					aim: {
						type: 'TEXT_INPUT',
						label: 'How will you benefit from being a member?',
						style: TextStyles.Paragraph,
						minimum: 20,
						maximum: 300,
					},
					whereFound: {
						type: 'TEXT_INPUT',
						label: (language: string) =>
							`How did you find out about Learn ${language}?`,
						style: TextStyles.Short,
						minimum: 5,
						maximum: 50,
					},
				},
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
				interval: day,
			},
			edit: {
				// The maximum number of edits that can be made...
				maximum: {
					contributors: 40,
					members: 5,
				},
				// ... in the interval:
				interval: day / 2,
			},
		},
	},
};

export default settings;
export { day, hour, minute, month, second, timeDescriptors, week, year };
