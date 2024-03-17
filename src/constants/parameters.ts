import * as Discord from "@discordeno/bot";
import { OptionTemplate } from "../lib/commands/command";

export default Object.freeze({
	user: {
		id: "user",
		type: Discord.ApplicationCommandOptionTypes.String,
		required: true,
		autocomplete: true,
	},
	show: {
		id: "show",
		type: Discord.ApplicationCommandOptionTypes.Boolean,
	},
	duration: {
		id: "duration",
		type: Discord.ApplicationCommandOptionTypes.String,
		required: true,
		autocomplete: true,
	},
	reason: {
		id: "reason",
		type: Discord.ApplicationCommandOptionTypes.String,
		required: true,
	},
	query: {
		id: "query",
		type: Discord.ApplicationCommandOptionTypes.String,
		required: true,
	},
	timestamp: {
		id: "timestamp",
		type: Discord.ApplicationCommandOptionTypes.String,
		required: true,
		autocomplete: true,
	},
	collection: {
		id: "collection",
		type: Discord.ApplicationCommandOptionTypes.Boolean,
	},
	by: {
		id: "by",
		type: Discord.ApplicationCommandOptionTypes.Integer,
	},
	to: {
		id: "to",
		type: Discord.ApplicationCommandOptionTypes.Integer,
	},
} as const satisfies Record<string, OptionTemplate>);
