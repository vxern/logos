import { OptionTemplate } from "./command.js";
import { ApplicationCommandOptionTypes } from "discordeno";

const user: OptionTemplate = {
	name: "user",
	type: ApplicationCommandOptionTypes.String,
	required: true,
	autocomplete: true,
};

const show: OptionTemplate = {
	name: "show",
	type: ApplicationCommandOptionTypes.Boolean,
};

const duration: OptionTemplate = {
	name: "duration",
	type: ApplicationCommandOptionTypes.String,
	required: true,
	autocomplete: true,
};

const reason: OptionTemplate = {
	name: "reason",
	type: ApplicationCommandOptionTypes.String,
	required: true,
};

const query: OptionTemplate = {
	name: "query",
	type: ApplicationCommandOptionTypes.String,
	required: true,
};

const timestamp: OptionTemplate = {
	name: "timestamp",
	type: ApplicationCommandOptionTypes.String,
	required: true,
	autocomplete: true,
};

const collection: OptionTemplate = {
	name: "collection",
	type: ApplicationCommandOptionTypes.Boolean,
};

const by: OptionTemplate = {
	name: "by",
	type: ApplicationCommandOptionTypes.Integer,
};

const to: OptionTemplate = {
	name: "to",
	type: ApplicationCommandOptionTypes.Integer,
};

export { by, collection, duration, query, reason, show, timestamp, to, user };
