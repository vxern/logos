import constants from "../../../../constants.js";
import { defaultLocale } from "../../../../types.js";
import { Client, localise } from "../../../client.js";
import { parseArguments, reply, respond } from "../../../interactions.js";
import { CommandTemplate } from "../../command.js";
import { show } from "../../parameters.js";
import * as Discord from "discordeno";

const command: CommandTemplate = {
	name: "rule",
	type: Discord.ApplicationCommandTypes.ChatInput,
	defaultMemberPermissions: ["VIEW_CHANNEL"],
	handle: handleCiteRule,
	handleAutocomplete: handleCiteRuleAutocomplete,
	options: [
		{
			name: "rule",
			type: Discord.ApplicationCommandOptionTypes.String,
			required: true,
			autocomplete: true,
		},
		show,
	],
};

const ruleIds = ["behaviour", "quality", "relevance", "suitability", "exclusivity", "adherence"];

async function handleCiteRuleAutocomplete(
	[client, bot]: [Client, Discord.Bot],
	interaction: Discord.Interaction,
): Promise<void> {
	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return;
	}

	const guildDocument = await client.database.adapters.guilds.getOrFetchOrCreate(
		client,
		"id",
		guildId.toString(),
		guildId,
	);
	if (guildDocument === undefined) {
		return;
	}

	const configuration = guildDocument.data.features.moderation.features?.rules;
	if (configuration === undefined || !configuration.enabled) {
		return;
	}

	const [{ rule: ruleOrUndefined }] = parseArguments(interaction.data?.options, {});
	const ruleQuery = ruleOrUndefined ?? "";

	const ruleQueryLowercase = ruleQuery.toLowerCase();
	const choices = ruleIds
		.map((ruleId, index) => {
			return {
				name: getRuleTitleFormatted(client, ruleId, index, "option", interaction.locale),
				value: index.toString(),
			};
		})
		.filter((choice) => choice.name.toLowerCase().includes(ruleQueryLowercase));

	respond([client, bot], interaction, choices);
}

async function handleCiteRule([client, bot]: [Client, Discord.Bot], interaction: Discord.Interaction): Promise<void> {
	const [{ rule: ruleIndex, show }] = parseArguments(interaction.data?.options, { rule: "number", show: "boolean" });
	if (ruleIndex === undefined) {
		displayError([client, bot], interaction);
		return;
	}

	const ruleId = ruleIds.at(ruleIndex);
	if (ruleId === undefined) {
		displayError([client, bot], interaction);
		return;
	}

	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return;
	}

	const guild = client.cache.guilds.get(guildId);
	if (guild === undefined) {
		return;
	}

	const locale = show ? defaultLocale : interaction.locale;

	const strings = {
		tldr: localise(client, "rules.tldr", locale)(),
		summary: localise(client, `rules.${ruleId}.summary`, locale)(),
		content: localise(client, `rules.${ruleId}.content`, locale)(),
	};

	reply(
		[client, bot],
		interaction,
		{
			embeds: [
				{
					title: getRuleTitleFormatted(client, ruleId, ruleIndex, "display", locale),
					description: strings.content,
					footer: { text: `${strings.tldr}: ${strings.summary}` },
					image: { url: constants.gifs.chaosWithoutRules },
					color: constants.colors.blue,
				},
			],
		},
		{ visible: show },
	);
}

function getRuleTitleFormatted(
	client: Client,
	ruleId: string,
	ruleIndex: number,
	mode: "option" | "display",
	locale: string | undefined,
): string {
	const strings = {
		title: localise(client, `rules.${ruleId}.title`, locale)(),
		summary: localise(client, `rules.${ruleId}.summary`, locale)(),
	};

	switch (mode) {
		case "option":
			return `#${ruleIndex + 1} ${strings.title} ~ ${strings.summary}`;
		case "display":
			return `${ruleIndex + 1} - ${strings.title}`;
	}
}

async function displayError([client, bot]: [Client, Discord.Bot], interaction: Discord.Interaction): Promise<void> {
	const strings = {
		title: localise(client, "rule.strings.invalid.title", interaction.locale)(),
		description: localise(client, "rule.strings.invalid.description", interaction.locale)(),
	};

	reply([client, bot], interaction, {
		embeds: [
			{
				title: strings.title,
				description: strings.description,
				color: constants.colors.red,
			},
		],
	});
}

export default command;
export { ruleIds };