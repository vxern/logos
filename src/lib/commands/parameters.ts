import { OptionTemplate } from "./command";
import * as Discord from "@discordeno/bot";

const user: OptionTemplate = {
	name: "user",
	type: Discord.ApplicationCommandOptionTypes.String,
	required: true,
	autocomplete: true,
};

const show: OptionTemplate = {
	name: "show",
	type: Discord.ApplicationCommandOptionTypes.Boolean,
};

const duration: OptionTemplate = {
	name: "duration",
	type: Discord.ApplicationCommandOptionTypes.String,
	required: true,
	autocomplete: true,
};

const reason: OptionTemplate = {
	name: "reason",
	type: Discord.ApplicationCommandOptionTypes.String,
	required: true,
};

const query: OptionTemplate = {
	name: "query",
	type: Discord.ApplicationCommandOptionTypes.String,
	required: true,
};

const timestamp: OptionTemplate = {
	name: "timestamp",
	type: Discord.ApplicationCommandOptionTypes.String,
	required: true,
	autocomplete: true,
};

const collection: OptionTemplate = {
	name: "collection",
	type: Discord.ApplicationCommandOptionTypes.Boolean,
};

const by: OptionTemplate = {
	name: "by",
	type: Discord.ApplicationCommandOptionTypes.Integer,
};

const to: OptionTemplate = {
	name: "to",
	type: Discord.ApplicationCommandOptionTypes.Integer,
};

export { by, collection, duration, query, reason, show, timestamp, to, user };
