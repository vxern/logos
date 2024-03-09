export default Object.freeze({
	meta: {
		// ! Responsible for inserting whitespace where a standard space would get filtered out.
		// ! Changing this would break:
		// ! - Empty translations.
		// ! - Indentation on the /word command.
		whitespace: "⠀",
	},
	interaction: {
		// ! Responsible for separating pieces of data in component custom IDs.
		// ! Changing this would break button interactions on all existing prompts/notices.
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
	bullet: "-",
	strings: {
		trail: "...",
		continued: "(...)",
	},
	game: {
		mask: "░",
	},
});
