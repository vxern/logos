export default {
	meta: {
		// ! Responsible for inserting whitespace where a standard space would get filtered out.
		// ! Changing this would break:
		// ! - Empty translations.
		// ! - Indentation on the /word command.
		whitespace: "⠀",
		// ! Responsible for separating pieces of data in component custom IDs.
		// ! Changing this would break button interactions on all existing prompts/notices.
		idSeparator: "|",
	},
	ruleBullet: "💠",
	understood: "✅",
	information: {
		information: "ℹ️",
		inviteLink: "🔗",
		bot: "🤖",
		function: "🛠️",
		languages: "🌍",
		add: "🤝",
	},
	sigils: {
		divider: "﹘",
		separator: "・",
	},
	squares: {
		green: "🟩",
		white: "⬜",
	},
	divider: "—",
	link: "🔗",
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
		slowmode: {
			enabled: "🐌",
			disabled: "🚀",
			upgraded: "⏫",
			downgraded: "⏬",
		},
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
	word: {
		word: "📜",
		definitions: "📚",
		expressions: "💐",
		etymology: "🌐",
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
	verification: {
		for: "🟩",
		against: "🟥",
	},
	bot: {
		features: {
			definitions: "🔍",
			translations: "🌍",
			games: "🎮",
			messages: "✍️",
			guides: "🎓",
		},
		multipurpose: {
			features: {
				audio: "🎶",
				roles: "💼",
				moderation: "💢",
				social: "💐",
			},
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
		languages: {
			languages: "🌍",
			localisation: "🏠",
			feature: "🎯",
		},
		owner: "👑",
		moderators: "⚖️",
		proficiencyDistribution: "🎓",
	},
	warn: "😖",
	answer: "📜",
	correction: "🖋️",
	interactions: {
		menu: {
			controls: {
				back: "«",
				forward: "»",
			},
		},
	},
	bullet: "-",
	strings: {
		trail: "...",
		continued: "(...)",
	},
	cefr: {
		a: "🟩",
		b: "🟨",
		c: "🟥",
	},
	detect: {
		likely: "💯",
		possible: "🤔",
	},
	showInChat: "🗨️",
	roles: {
		folder: "📁",
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
