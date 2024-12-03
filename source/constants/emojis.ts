import commands from "logos:constants/emojis/commands";
import events from "logos:constants/emojis/events";
import flags from "logos:constants/emojis/flags";
import roles from "logos:constants/emojis/roles";

export default Object.freeze({
	commands,
	events,
	roles,
	flags,
	ruleBullet: "💠",
	understood: "✅",
	information: {
		inviteLink: "🔗",
	},
	squares: {
		green: "🟩",
		white: "⬜",
	},
	link: "🔗",
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
	source: "©️",
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
	showInChat: "🗨️",
} as const);
