import roles from "logos:constants/emojis/roles";
import events from "logos:constants/emojis/events";

export default Object.freeze({
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
	squares: {
		green: "🟩",
		white: "⬜",
	},
	link: "🔗",
	events,
	word: {
		word: "📜",
		definitions: "📚",
		translations: "🌐",
		relations: "🌳",
		pronunciation: "🗣️",
		expressions: "💐",
		examples: "🏷️",
		etymology: "🌱",
		notes: "📝",
	},
	music: {
		song: "🎵",
		collection: "🎶",
		stream: "📁",
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
		fastForwarded: "⏩",
		rewound: "⏪",
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
	source: "©️",
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
				back: "⬅️",
				forward: "➡️",
				down: "⬇️",
				up: "⬆️",
			},
		},
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
	profile: {
		roles: "💼",
		statistics: {
			statistics: "🧮",
			praises: "🙏",
			warnings: "😖",
		},
	},
	roles,
} as const);
