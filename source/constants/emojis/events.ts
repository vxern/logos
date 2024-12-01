export default Object.freeze({
	user: {
		banned: "⚔️",
		unbanned: "😇",
		joined: "😁",
		left: "😔",
		kicked: "🚪",
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
	report: "💢",
	resource: "🎓",
	suggestion: "🌿",
	ticket: "🎫",
	purging: {
		begin: "⚔️",
		end: "✅",
	},
} as const);
