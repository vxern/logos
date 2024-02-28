import { OptionTemplate } from "./command";

const user: OptionTemplate = {
	id: "user",
	type: Discord.ApplicationCommandOptionTypes.String,
	required: true,
	autocomplete: true,
};

const show: OptionTemplate = {
	id: "show",
	type: Discord.ApplicationCommandOptionTypes.Boolean,
};

const duration: OptionTemplate = {
	id: "duration",
	type: Discord.ApplicationCommandOptionTypes.String,
	required: true,
	autocomplete: true,
};

const reason: OptionTemplate = {
	id: "reason",
	type: Discord.ApplicationCommandOptionTypes.String,
	required: true,
};

const query: OptionTemplate = {
	id: "query",
	type: Discord.ApplicationCommandOptionTypes.String,
	required: true,
};

const timestamp: OptionTemplate = {
	id: "timestamp",
	type: Discord.ApplicationCommandOptionTypes.String,
	required: true,
	autocomplete: true,
};

const collection: OptionTemplate = {
	id: "collection",
	type: Discord.ApplicationCommandOptionTypes.Boolean,
};

const by: OptionTemplate = {
	id: "by",
	type: Discord.ApplicationCommandOptionTypes.Integer,
};

const to: OptionTemplate = {
	id: "to",
	type: Discord.ApplicationCommandOptionTypes.Integer,
};

export { by, collection, duration, query, reason, show, timestamp, to, user };
