import { fromHex } from "./lib/utils.js";
import { Language } from "./types.js";

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
	none: "none",
	entry: {
		acceptedRules: "accepted_rules",
		selectedLanguageProficiency: "selected_language_proficiency",
		requestedVerification: "requested_verification",
	},
	verification: "verification",
	reports: "reports",
	suggestions: "suggestions",
	selectRoles: "select_roles",
};

const links = {
	typescriptWebsite: "https://www.typescriptlang.org/",
	nodeWebsite: "https://nodejs.org/en",
	discordApiWebsite: "https://discord.com/developers/docs/intro",
	discordenoRepository: "https://github.com/discordeno/discordeno",

	learnArmenianListingWebsite: "https://discord.me/learnarmenian",
	learnRomanianListingWebsite: "https://discord.me/learnromanian",

	talonRepositoryLink: "https://github.com/vxern/talon",
	generateLanguageRepositoryLink: (language: Language) => `https://github.com/vxern/${language.toLowerCase()}`,

	generateDiscordInviteLink: (inviteCode: string) => `https://discord.gg/${inviteCode}`,
};

const contributors = {
	asterfields: {
		username: "@asterfields_",
		id: "839862207025119252",
	},
	estheroide: {
		username: "@estheroide",
		id: "747900197358665758",
		link: "https://www.instagram.com/yosgatian",
	},
	mattheos: {
		username: "@16wardm",
		id: "758385691851096195",
	},
	moorddroom: {
		username: "@moorddroom",
		id: "656160896607059981",
	},
	noxys: {
		username: "@noxyys",
		id: "357538166061924353",
	},
	serene: {
		username: "@at.peace",
		id: "797369145367855104",
	},
	victor: {
		username: "@ferb02",
		id: "303605019532460033",
		link: "https://www.youtube.com/channel/UC4aqpjKwQfkqxmQO0Owy2QQ",
	},
	vxern: {
		username: "@vxern",
		id: "217319536485990400",
		link: "https://github.com/vxern",
	},
};

const contributions = {
	translation: {
		French: {
			flag: "🇫🇷",
			contributors: [
				contributors.mattheos,
				contributors.asterfields,
				contributors.noxys,
				contributors.moorddroom,
				contributors.serene,
				contributors.estheroide,
			],
		},
		Polish: {
			flag: "🇵🇱",
			contributors: [contributors.vxern],
		},
		Romanian: {
			flag: "🇷🇴",
			contributors: [contributors.victor, contributors.vxern],
		},
	},
};

const images = {
	rules: "https://i.imgur.com/wRBpXcY.png",
	inviteLink: "https://i.imgur.com/snJaKYm.png",
};

const colors = {
	invisible: fromHex("#36393f"),
	red: fromHex("#b42f2f"),
	darkRed: fromHex("#820000"),
	lightGreen: fromHex("#89ef59"),
	darkGreen: fromHex("#479621"),
	blue: fromHex("#6269ed"),
	dullYellow: fromHex("#f2f277"),
	gray: fromHex("#637373"),
	peach: fromHex("#ff9a76"),
	husky: fromHex("#d6e3f8"),
	black: fromHex("1c1c1c"), // Eerie black
	yellow: fromHex("#ffe548"), // Gargoyle gas
	orangeRed: fromHex("#ff4b3e"), // Dusk orange
	lightGray: fromHex("#daddd8"),
	turquoise: fromHex("#68d8d6"), // Hammam blue
	green: fromHex("#00cc66"), // Alienated
	greenishLightGray: fromHex("#c5e0d8"), // Ulthuan gray
	orange: fromHex("#f28123"), // Beer
};

type BulletStyle = "arrow" | "diamond";

const symbols = {
	meta: {
		whitespace: "⠀",
		metadataSeparator: ",",
		idSeparator: "|",
	},
	ruleBullet: "💠",
	understood: "✅",
	information: {
		information: "ℹ️",
		inviteLink: "🔗",
	},
	events: {
		user: {
			banned: "⚔️",
			unbanned: "😇",
			joined: "😁",
			left: "😔",
		},
		message: {
			updated: "⬆️",
			deleted: "❌",
		},
		entryRequest: {
			submitted: "ℹ️",
			accepted: "✅",
			rejected: "❌",
		},
		warned: "⚠️",
		pardoned: "😇",
		timeout: {
			added: "⏳",
			removed: "😇",
		},
		praised: "🙏",
		suggestion: "🌿",
		report: "💢",
		purging: {
			begin: "⚔️",
			end: "✅",
		},
	},
	music: {
		song: "🎵",
		file: "📁",
		collection: "🎶",
		list: "📋",
		loopEnabled: "🔁",
		loopDisabled: "⏸️",
		paused: "⏸️",
		queued: "👍",
		nowPlaying: "⬇️",
		replaying: "🔁",
		removed: "❌",
		resumed: "▶️",
		skippedTo: "🔍",
		skipped: "⏭️",
		stopped: "⏹️",
		unskipped: "⏮️",
		volume: "🔊",
	},
	indicators: {
		exclamation: "❗",
		warning: "⚠️",
		arrowRight: "➜",
	},
	responses: {
		celebration: "🥳",
		upset: "😕",
	},
	bot: {
		features: {
			roles: "💼",
			language: "🎓",
			music: "🎶",
		},
	},
	guild: {
		description: "🖋️",
		members: "🧑",
		created: "⏱️",
		channels: {
			channels: "🗯️",
			text: "📜",
			voice: "🔊",
		},
		owner: "👑",
		moderators: "⚖️",
		proficiencyDistribution: "🎓",
	},
	interactions: {
		menu: {
			controls: {
				back: "«",
				forward: "»",
			},
		},
	},
	bullets: {
		arrow: "➜",
		diamond: "♦️",
	} satisfies Record<BulletStyle, string>,
	strings: {
		trail: "...",
		continued: "(...)",
	},
	roles: {
		noCategory: "💭",
		unknownEmoji: "❓",
		categories: {
			language: {
				category: "🎓",
				proficiency: {
					category: "🔰",
					beginner: "🟩",
					intermediate: "🟦",
					advanced: "🟥",
					native: "🟨",
				},
				cefr: {
					category: "🔤",
					a0: "☁️",
					a1: "⚡",
					a2: "✨",
					b1: "⭐",
					b2: "🌟",
					c1: "💫",
					c2: "🌠",
				},
			},
			personalisation: {
				category: "🌈",
				orthography: {
					category: "🖋️",
					idinist: "Idini",
				},
				gender: {
					category: "⚧",
					male: "♂️",
					female: "♀️",
					transgender: "⚧",
					nonbinary: "🧑",
				},
				abroad: {
					category: "🌎",
					diasporan: "🌎",
				},
			},
			learning: {
				category: "📖",
				classroomAttendee: "📖",
				correctMe: "✍️",
				dailyPhrase: "🌞",
				voicechatter: "🗣️",
			},
			ethnicity: {
				category: "🗾",
			},
			dialects: {
				category: "🏷️",
			},
			regions: {
				category: "🤷‍♂️",
			},
		},
	},
	profile: {
		roles: "💼",
		statistics: {
			statistics: "🧮",
			praises: "🙏",
			warnings: "😖",
		},
	},
};

const gifs = {
	done: "https://media.tenor.com/3wJ_QISYvxEAAAAC/done-all.gif",
	followRules: "https://media.tenor.com/mPxD454ittYAAAAC/rules.gif",
	chaosWithoutRules: "https://media.tenor.com/_sFydMmz7YgAAAAd/loop-rules-rule.gif",
	welcome: "https://media.tenor.com/u4Pg5kqdaIAAAAAC/welcome.gif",
};

const endpoints = {
	deepl: {
		languages: "https://api-free.deepl.com/v2/languages",
		translate: "https://api-free.deepl.com/v2/translate",
	},
};

export default {
	contributions,
	endpoints,
	links,
	images,
	colors,
	symbols,
	gifs,
	staticComponentIds,
	interactionTokenExpiryInterval,
};
export { BulletStyle, Periods };
