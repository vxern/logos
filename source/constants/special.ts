export default Object.freeze({
	meta: {
		whitespace: " ",
		// Used to insert a blank character where a standard whitespace character would otherwise get filtered out by
		// Discord.
		forcedWhitespace: "⠀",
	},
	interaction: {
		// Acts as a delimeter for pieces of metadata encoded into an interaction custom ID.
		separator: "|",
		divider: "/",
	},
	database: {
		separator: "/",
	},
	sigils: {
		divider: "﹘",
		separator: "・",
		channelSeparator: "︲",
	},
	divider: "—",
	dividerShort: "-",
	bullet: "-",
	strings: {
		trail: "...",
		continued: "(...)",
	},
	missingString: "?",
	roles: {
		back: "..",
	},
	game: {
		mask: "░",
	},
} as const);
