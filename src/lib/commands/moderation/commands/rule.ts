import { Locale } from "../../../../constants/languages";
import { Client } from "../../../client";
import { Guild } from "../../../database/guild";
import { Rule } from "../../../database/warning";
import { CommandTemplate } from "../../command";
import { show } from "../../parameters";

const command: CommandTemplate = {
	id: "rule",
	type: Discord.ApplicationCommandTypes.ChatInput,
	defaultMemberPermissions: ["VIEW_CHANNEL"],
	handle: handleCiteRule,
	handleAutocomplete: handleCiteRuleAutocomplete,
	options: [
		{
			id: "rule",
			type: Discord.ApplicationCommandOptionTypes.String,
			required: true,
			autocomplete: true,
		},
		show,
	],
	flags: {
		isShowable: true,
	},
};

const rules: Rule[] = ["behaviour", "quality", "relevance", "suitability", "exclusivity", "adherence"];

async function handleCiteRuleAutocomplete(
	client: Client,
	interaction: Logos.Interaction<any, { rule: string }>,
): Promise<void> {
	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return;
	}

	const guildDocument = await Guild.getOrCreate(client, { guildId: guildId.toString() });

	const configuration = guildDocument.warns;
	if (configuration === undefined) {
		return;
	}

	const locale = interaction.locale;

	const ruleLowercase = interaction.parameters.rule.trim().toLowerCase();
	const choices = rules
		.map((ruleId, index) => {
			return {
				name: getRuleTitleFormatted(client, ruleId, index, "option", { locale }),
				value: index.toString(),
			};
		})
		.filter((choice) => choice.name.toLowerCase().includes(ruleLowercase));

	client.respond(interaction, choices);
}

async function handleCiteRule(client: Client, interaction: Logos.Interaction<any, { rule: string }>): Promise<void> {
	const locale = interaction.parameters.show ? interaction.guildLocale : interaction.locale;

	const ruleIndex = Number(interaction.parameters.rule);
	if (!Number.isSafeInteger(ruleIndex)) {
		return;
	}

	const ruleId = rules.at(ruleIndex);
	if (ruleId === undefined) {
		displayError(client, interaction, { locale: interaction.locale });
		return;
	}

	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return;
	}

	const guild = client.entities.guilds.get(guildId);
	if (guild === undefined) {
		return;
	}

	const strings = {
		tldr: client.localise("rules.tldr", locale)(),
		summary: client.localise(`rules.${ruleId}.summary`, locale)(),
		content: client.localise(`rules.${ruleId}.content`, locale)(),
	};

	const components: Discord.ActionRow[] | undefined = interaction.parameters.show
		? undefined
		: [
				{
					type: Discord.MessageComponentTypes.ActionRow,
					components: [client.interactionRepetitionService.getShowButton(interaction, { locale })],
				},
		  ];

	client.reply(
		interaction,
		{
			embeds: [
				{
					title: getRuleTitleFormatted(client, ruleId, ruleIndex, "display", { locale }),
					description: strings.content,
					footer: { text: `${strings.tldr}: ${strings.summary}` },
					image: { url: constants.gifs.chaosWithoutRules },
					color: constants.colours.blue,
				},
			],
			components,
		},
		{ visible: interaction.parameters.show },
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
		title: client.localise(`rules.${ruleId}.title`, locale)(),
		summary: client.localise(`rules.${ruleId}.summary`, locale)(),
	};

	switch (mode) {
		case "option":
			return `#${ruleIndex + 1} ${strings.title} ~ ${strings.summary}`;
		case "display":
			return `${ruleIndex + 1} - ${strings.title}`;
	}
}

async function displayError(
	client: Client,
	interaction: Logos.Interaction,
	{ locale }: { locale: Locale },
): Promise<void> {
	const strings = {
		title: client.localise("rule.strings.invalid.title", locale)(),
		description: client.localise("rule.strings.invalid.description", locale)(),
	};

	client.reply(interaction, {
		embeds: [
			{
				title: strings.title,
				description: strings.description,
				color: constants.colours.red,
			},
		],
	});
}

export default command;
export { rules, getRuleTitleFormatted };
