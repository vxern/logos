export default Object.freeze({
	// The 'none' custom ID is special: Interactions with this code are auto-acknowledged and discarded, never to be
	// seen again. 😈
	none: "none",
	acceptedRules: "accepted_rules",
	verification: "verification",
	reports: "reports",
	resources: "resources",
	suggestions: "suggestions",
	tickets: "tickets",
	createInquiry: "create_inquiry",
	removePrompt: "remove_prompt",
	selectRoles: "select_roles",
	showInChat: "show_in_chat",
} as const);
