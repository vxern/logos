import commands from "rost:constants/emojis/commands";
import events from "rost:constants/emojis/events";
import roles from "rost:constants/emojis/roles";

export default Object.freeze({
	commands,
	events,
	roles,
	notices: {
		entry: {
			understood: "✅",
		},
	},
	custom: {
		learnRomanian: {
			name: "LearnRomanian",
			id: 1399737159002357872n,
		},
		discord: { name: "Discord", id: 1399736045452656824n },
		instagram: { name: "Instagram", id: 1399735860479660032n },
		github: { name: "GitHub", id: 1399738535816462336n },
	},
	verification: {
		for: "🟩",
		against: "🟥",
	},
	link: "🔗",
	source: "©️",
	interactions: {
		menu: {
			controls: {
				back: "←",
				forward: "→",
			},
		},
	},
	showInChat: "🗨️",
} as const);
