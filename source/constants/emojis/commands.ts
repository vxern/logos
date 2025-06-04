export default Object.freeze({
	information: {
		bot: {
			features: {
				bot: "🤖",
				function: "🛠️",
				definitions: "🔍",
				translations: "🌍",
				games: "🎮",
				messages: "✍️",
				guides: "🎓",
				languages: "🌍",
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
	},
	word: {
		definitions: "📚",
		translations: "🌐",
		relations: "🌳",
		pronunciation: "🗣️",
		expressions: "💐",
		examples: "🏷️",
		etymology: "🌱",
		notes: "📝",
	},
	profile: {
		roles: {
			directory: "➜",
		},
		view: {
			roles: "💼",
			statistics: "🧮",
			praises: "🙏",
			warnings: "😖",
		},
	},
	cefr: {
		a: "🟩",
		b: "🟨",
		c: "🟥",
	},
	answer: "📜",
	correction: "🖋️",
	recognise: {
		likely: "💯",
		possible: "🤔",
	},
	praise: {
		madeBy: "➜",
	},
	translate: {
		direction: "➜",
	},
} as const);
