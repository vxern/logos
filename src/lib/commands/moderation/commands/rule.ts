import constants from "../../../../constants/constants";
import { Locale } from "../../../../constants/languages";
import * as Logos from "../../../../types";
import { Client, localise } from "../../../client";
import { getShowButton, parseArguments, reply, respond } from "../../../interactions";
import { CommandTemplate } from "../../command";
import { show } from "../../parameters";
import * as Discord from "@discordeno/bot";

const command: CommandTemplate = {
	name: "rule",
	type: Discord.ApplicationCommandTypes.ChatInput,
	defaultMemberPermissions: ["VIEW_CHANNEL"],
	isShowable: true,
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

const ruleIds = ["behaviour", "quality", "relevance", "suitability", "exclusivity", "adherence"] as const;

async function handleCiteRuleAutocomplete(
	[client, bot]: [Client, Discord.Bot],
	interaction: Logos.Interaction,
): Promise<void> {
	const locale = interaction.locale;

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
				name: getRuleTitleFormatted(client, ruleId, index, "option", { locale }),
				value: index.toString(),
			};
		})
		.filter((choice) => choice.name.toLowerCase().includes(ruleQueryLowercase));

	respond([client, bot], interaction, choices);
}

async function handleCiteRule([client, bot]: [Client, Discord.Bot], interaction: Logos.Interaction): Promise<void> {
	const [{ rule: ruleIndex, show: showParameter }] = parseArguments(interaction.data?.options, {
		rule: "number",
		show: "boolean",
	});
	if (ruleIndex === undefined) {
		displayError([client, bot], interaction, { locale: interaction.locale });
		return;
	}

	const show = interaction.show ?? showParameter;
	const locale = show ? interaction.guildLocale : interaction.locale;

	const ruleId = ruleIds.at(ruleIndex);
	if (ruleId === undefined) {
		displayError([client, bot], interaction, { locale: interaction.locale });
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

	const strings = {
		tldr: localise(client, "rules.tldr", locale)(),
		summary: localise(client, `rules.${ruleId}.summary`, locale)(),
		content: localise(client, `rules.${ruleId}.content`, locale)(),
	};

	const showButton = getShowButton(client, interaction, { locale });

	const components: Discord.ActionRow[] | undefined = show
		? undefined
		: [{ type: Discord.MessageComponentTypes.ActionRow, components: [showButton] }];

	reply(
		[client, bot],
		interaction,
		{
			embeds: [
				{
					title: getRuleTitleFormatted(client, ruleId, ruleIndex, "display", { locale }),
					description: strings.content,
					footer: { text: `${strings.tldr}: ${strings.summary}` },
					image: { url: constants.gifs.chaosWithoutRules },
					color: constants.colors.blue,
				},
			],
			components,
		},
		{ visible: show },
	);
}

function getRuleTitleFormatted(
	client: Client,
	ruleId: string,
	ruleIndex: number,
	mode: "option" | "display",
	{ locale }: { locale: Locale },
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

async function displayError(
	[client, bot]: [Client, Discord.Bot],
	interaction: Logos.Interaction,
	{ locale }: { locale: Locale },
): Promise<void> {
	const strings = {
		title: localise(client, "rule.strings.invalid.title", locale)(),
		description: localise(client, "rule.strings.invalid.description", locale)(),
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
