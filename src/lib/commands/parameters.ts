import * as Discord from "@discordeno/bot";
import { OptionTemplate } from "./command";

const user: OptionTemplate = {
	name: "parameters.user",
	type: Discord.ApplicationCommandOptionTypes.String,
	required: true,
	autocomplete: true,
};

const show: OptionTemplate = {
	name: "parameters.show",
	type: Discord.ApplicationCommandOptionTypes.Boolean,
};

const duration: OptionTemplate = {
	name: "parameters.duration",
	type: Discord.ApplicationCommandOptionTypes.String,
	required: true,
	autocomplete: true,
};

const reason: OptionTemplate = {
	name: "parameters.reason",
	type: Discord.ApplicationCommandOptionTypes.String,
	required: true,
};

const query: OptionTemplate = {
	name: "parameters.query",
	type: Discord.ApplicationCommandOptionTypes.String,
	required: true,
};

const timestamp: OptionTemplate = {
	name: "parameters.timestamp",
	type: Discord.ApplicationCommandOptionTypes.String,
	required: true,
	autocomplete: true,
};

const collection: OptionTemplate = {
	name: "parameters.collection",
	type: Discord.ApplicationCommandOptionTypes.Boolean,
};

const by: OptionTemplate = {
	name: "parameters.by",
	type: Discord.ApplicationCommandOptionTypes.Integer,
};

const to: OptionTemplate = {
	name: "parameters.to",
	type: Discord.ApplicationCommandOptionTypes.Integer,
};

const word: OptionTemplate = {
	name: "parameters.word",
	type: Discord.ApplicationCommandOptionTypes.String,
	required: true,
};

const language: OptionTemplate = {
	name: "parameters.language",
	type: Discord.ApplicationCommandOptionTypes.String,
	autocomplete: true,
};

export { by, collection, duration, query, reason, show, timestamp, to, user, word, language };
