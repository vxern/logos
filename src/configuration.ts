import { TextInputStyle } from '../deps.ts';
import { fromHex } from './utils.ts';

export default {
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
	// Configuration settings pertaining to responses to commands.
	responses: {
		// The standardised, available set of colours the bot can utilise for its embed messages.
		colors: {
			red: fromHex('#b42f2f'),
			green: fromHex('#89ef59'),
			blue: fromHex('#6269ed'),
			yellow: fromHex('#f2f277'),
			// This colour matches the colour of an embed message,
			// making it seem like there is no colour stripe.
			invisible: fromHex('#36393f'),
		},
	},
	forms: {
		// Configuration settings pertaining to the article editor.
		article: {
			title: 'Article Editor',
			// Definitions of fields in the article editor form.
			fields: {
				title: {
					label: 'Title of your article',
					style: TextInputStyle.SHORT,
					minimum: 10,
					maximum: 50,
				},
				body: {
					label: 'Body of your article',
					style: TextInputStyle.PARAGRAPH,
					minimum: 30,
					maximum: 4000, // The maximum length of a field is 4,000.
				},
				/*
				footer: {
					label: 'Additional information / notes',
					style: TextInputStyle.PARAGRAPH,
					minimum: 10,
					maximum: 500,
				},
        */
			},
		},
		// Configuration settings pertaining to user verification.
		verification: {
			title: 'Verification Questions',
			// Definitions of fields in the verification form.
			fields: {
				reason: {
					label: 'What is your reason for learning Armenian?',
					style: TextInputStyle.PARAGRAPH,
					minimum: 20,
					maximum: 300,
				},
				aim: {
					label: 'How will you benefit from being a member?',
					style: TextInputStyle.PARAGRAPH,
					minimum: 20,
					maximum: 300,
				},
				whereFound: {
					label: 'How did you find out about Learn Armenian?',
					style: TextInputStyle.SHORT,
					minimum: 5,
					maximum: 50,
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
		// Configuration settings pertaining to the topic languages of managed guilds.
		languages: {
			armenian: {
				requiresVerification: true,
			},
			belarusian: {
				requiresVerification: false,
			},
			english: {
				requiresVerification: true,
			},
			romanian: {
				requiresVerification: false,
			},
		},
		// Configuration settings pertaining to the de facto owner of the managed guilds.
		owner: {
			id: '217319536485990400',
		},
		// Configuration settings pertaining to guild moderators.
		moderator: {
			role: 'Guide',
		},
		// Configuration settings pertaining to entry to the guild.
		entry: {
			minimumRequiredAge: 60 * 60 * 24 * 1000, // Two days.
		},
	},
};
