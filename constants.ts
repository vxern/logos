import { fromHex } from 'logos/src/utils.ts';
import { Language } from 'logos/types.ts';

class Periods {
	static readonly second = 1000;
	static readonly minute = 60 * Periods.second;
	static readonly hour = 60 * Periods.minute;
	static readonly day = 24 * Periods.hour;
	static readonly week = 7 * Periods.day;
	static readonly month = 30 * Periods.day;
	static readonly year = 365 * Periods.day;
}

const interactionTokenExpiryInterval = 14 * Periods.minute + 50 * Periods.second; // Just below 15 minutes.

const staticComponentIds = {
	none: 'none',
	acceptedRules: 'accepted_rules',
	selectedLanguageProficiency: 'selected_language_proficiency',
	requestedVerification: 'requested_verification',
	verification: 'verification',
	reports: 'reports',
	suggestions: 'suggestions',
	selectRoles: 'select_roles',
};

const links = {
	typescriptWebsite: 'https://www.typescriptlang.org/',
	denoWebsite: 'https://deno.land/',
	discordApiWebsite: 'https://discord.com/developers/docs/intro',
	discordenoRepository: 'https://github.com/discordeno/discordeno',

	learnArmenianListingWebsite: 'https://discord.me/learnarmenian',
	learnRomanianListingWebsite: 'https://discord.me/learnromanian',

	talonRepositoryLink: 'https://github.com/wordcollector/talon',
	generateLanguageRepositoryLink: (language: Language) => `https://github.com/wordcollector/${language.toLowerCase()}`,

	generateDiscordInviteLink: (inviteCode: string) => `https://discord.gg/${inviteCode}`,
};

const contributors = {
	esther: {
		username: 'Esther',
		id: 747900197358665758n,
	},
	intelProcessor: {
		username: 'IntelProcessor69',
		id: 839862207025119252n,
	},
	matteos: {
		username: '16WardM',
		id: 758385691851096195n,
	},
	moorddroom: {
		username: 'moorddroom',
		id: 656160896607059981n,
	},
	mymy: {
		username: 'Mymy',
		id: 859452448191545364n,
	},
	neemanUrmash: {
		username: 'Neeman Urmash',
		id: 943425310421053481n,
	},
	nemokosch: {
		username: 'Nemokosch',
		id: 297037173541175296n,
		links: {
			'Github': 'https://github.com/2colours',
		},
	},
	serene: {
		username: 'Serene',
		id: 797369145367855104n,
	},
	shamisem: {
		username: 'Shamisem',
		id: 1020296987494596620n,
	},
	qirimcak: {
		username: 'qırımçak',
		id: 558631025408999424n,
	},
	telemaniak: {
		username: 'Telemaniak',
		id: 410812091071725598n,
	},
	vxern: {
		username: 'vxern',
		id: 217319536485990400n,
		links: {
			'Github': 'https://github.com/vxern',
			'LinkedIn': 'https://linkedin.com/in/vxern',
		},
	},
	xXMemeXx: {
		username: 'xXMemeXx',
		id: 303605019532460033n,
		links: {
			'YouTube': 'https://www.youtube.com/channel/UC4aqpjKwQfkqxmQO0Owy2QQ',
		},
	},
	yeetfe: {
		username: 'Yeetfe',
		id: 249248581435916299n,
	},
};

const contributions = {
	translation: {
		'Dutch': {
			flag: '🇳🇱',
			contributors: [contributors.moorddroom],
		},
		'French': {
			flag: '🇫🇷',
			contributors: [
				contributors.intelProcessor,
				contributors.matteos,
				contributors.moorddroom,
				contributors.serene,
				contributors.esther,
			],
		},
		'Greek': {
			flag: '🇬🇷',
			contributors: [
				contributors.intelProcessor,
				contributors.neemanUrmash,
			],
		},
		'Hungarian': {
			flag: '🇭🇺',
			contributors: [contributors.nemokosch],
		},
		'Italian': {
			flag: '🇮🇹',
			contributors: [contributors.mymy],
		},
		'Norwegian': {
			flag: '🇳🇴',
			contributors: [contributors.telemaniak],
		},
		'Polish': {
			flag: '🇵🇱',
			contributors: [contributors.vxern],
		},
		'Romanian': {
			flag: '🇷🇴',
			contributors: [contributors.vxern, contributors.xXMemeXx],
		},
		'Turkish': {
			flag: '🇹🇷',
			contributors: [contributors.qirimcak, contributors.yeetfe],
		},
	},
};

const images = {
	rules: 'https://i.imgur.com/wRBpXcY.png',
	inviteLink: 'https://i.imgur.com/snJaKYm.png',
};

const colors = {
	invisible: fromHex('#36393f'),
	red: fromHex('#b42f2f'),
	darkRed: fromHex('#820000'),
	lightGreen: fromHex('#89ef59'),
	darkGreen: fromHex('#479621'),
	blue: fromHex('#6269ed'),
	dullYellow: fromHex('#f2f277'),
	gray: fromHex('#637373'),
	peach: fromHex('#ff9a76'),
	husky: fromHex('#d6e3f8'),
	black: fromHex('1c1c1c'), // Eerie black
	yellow: fromHex('#ffe548'), // Gargoyle gas
	orangeRed: fromHex('#ff4b3e'), // Dusk orange
	lightGray: fromHex('#daddd8'),
	turquoise: fromHex('#68d8d6'), // Hammam blue
	green: fromHex('#00cc66'), // Alienated
	greenishLightGray: fromHex('#c5e0d8'), // Ulthuan gray
	orange: fromHex('#f28123'), // Beer
};

enum BulletStyles {
	Arrow = 'arrow',
	Diamond = 'diamond',
}

const symbols = {
	meta: {
		whitespace: '⠀',
		metadataSeparator: '・',
		idSeparator: '|',
	},
	ruleBullet: '💠',
	understood: '✅',
	information: {
		information: 'ℹ️',
		inviteLink: '🔗',
	},
	events: {
		user: {
			banned: '⚔️',
			unbanned: '😇',
			joined: '😁',
			left: '😔',
		},
		message: {
			updated: '⬆️',
			deleted: '❌',
		},
		entryRequest: {
			submitted: 'ℹ️',
			accepted: '✅',
			rejected: '❌',
		},
		warned: '⚠️',
		pardoned: '😇',
		timeout: {
			added: '⏳',
			removed: '😇',
		},
		praised: '🙏',
		suggestion: '🌿',
		report: '💢',
		purging: {
			begin: '⚔️',
			end: '✅',
		},
	},
	music: {
		song: '🎵',
		file: '📁',
		collection: '🎶',
		list: '📋',
		loopEnabled: '🔁',
		loopDisabled: '⏸️',
		paused: '⏸️',
		queued: '👍',
		nowPlaying: '⬇️',
		replaying: '🔁',
		removed: '❌',
		resumed: '▶️',
		skippedTo: '🔍',
		skipped: '⏭️',
		stopped: '⏹️',
		unskipped: '⏮️',
		volume: '🔊',
	},
	indicators: {
		exclamation: '❗',
		warning: '⚠️',
		arrowRight: '➜',
	},
	responses: {
		celebration: '🥳',
		upset: '😕',
	},
	guild: {
		description: '🖋️',
		members: '🧑',
		created: '⏱️',
		channels: {
			channels: '🗯️',
			text: '📜',
			voice: '🔊',
		},
		owner: '👑',
		moderators: '⚖️',
		proficiencyDistribution: '🎓',
	},
	interactions: {
		menu: {
			controls: {
				back: '«',
				forward: '»',
			},
		},
	},
	bullets: {
		arrow: '➜',
		diamond: '♦️',
	} satisfies Record<BulletStyles, string>,
	strings: {
		trail: '...',
		continued: '(...)',
	},
	roles: {
		noCategory: '💭',
		unknownEmoji: '❓',
		categories: {
			language: {
				category: '🎓',
				proficiency: {
					category: '🔰',
					beginner: '🟩',
					intermediate: '🟦',
					advanced: '🟥',
					native: '🟨',
				},
				cefr: {
					category: '🔤',
					a0: '☁️',
					a1: '⚡',
					a2: '✨',
					b1: '⭐',
					b2: '🌟',
					c1: '💫',
					c2: '🌠',
				},
			},
			personalisation: {
				category: '🌈',
				orthography: {
					category: '🖋️',
					idinist: 'Idini',
				},
				gender: {
					category: '⚧',
					male: '♂️',
					female: '♀️',
					transgender: '⚧',
					nonbinary: '🧑',
				},
				abroad: {
					category: '🌎',
					diasporan: '🌎',
				},
			},
			learning: {
				category: '📖',
				classroomAttendee: '📖',
				correctMe: '✍️',
				dailyPhrase: '🌞',
				voicechatter: '🗣️',
			},
			ethnicity: {
				category: '🗾',
			},
			dialects: {
				category: '🏷️',
			},
			regions: {
				category: '🤷‍♂️',
			},
		},
	},
	profile: {
		roles: '💼',
		statistics: {
			statistics: '🧮',
			praises: '🙏',
			warnings: '😖',
		},
	},
};

const endpoints = {
	deepl: {
		languages: 'https://api-free.deepl.com/v2/languages',
		translate: 'https://api-free.deepl.com/v2/translate',
	},
};

export default {
	contributions,
	endpoints,
	links,
	images,
	colors,
	symbols,
	staticComponentIds,
	interactionTokenExpiryInterval,
};
export { BulletStyles, Periods };
