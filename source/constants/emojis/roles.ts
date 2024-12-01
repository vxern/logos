export default Object.freeze({
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
			correctMe: "✍️",
			doNotCorrectMe: "🙅",
			classroomAttendee: "📖",
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
} as const);
