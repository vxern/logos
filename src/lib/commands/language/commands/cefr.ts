import * as Discord from "@discordeno/bot";
import constants from "../../../../constants/constants";
import { Locale } from "../../../../constants/languages";
import * as Logos from "../../../../types";
import { Client, InteractionCollector } from "../../../client";
import { CefrConfiguration } from "../../../database/guild";
import { Guild } from "../../../database/guild";
import { getShowButton, parseArguments } from "../../../interactions";
import { CommandTemplate } from "../../command";
import { show } from "../../parameters";

const command: CommandTemplate = {
	id: "cefr",
	type: Discord.ApplicationCommandTypes.ChatInput,
	defaultMemberPermissions: ["VIEW_CHANNEL"],
	handle: handleDisplayCefrGuide,
	options: [show],
	flags: {
		isShowable: true,
	},
};

type Bracket = "a" | "b" | "c";
type Tab = "guide" | "examples";

interface Data {
	bracket: Bracket;
	tab: Tab;
}

type BracketButtonMetadata = [bracket: Bracket];
type TabButtonMetadata = [tab: Tab];

async function handleDisplayCefrGuide(client: Client, interaction: Logos.Interaction): Promise<void> {
	const [{ show: showParameter }] = parseArguments(interaction.data?.options, { show: "boolean" });

	const show = interaction.show ?? showParameter ?? false;
	const locale = show ? interaction.guildLocale : interaction.locale;

	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return;
	}

	const guildDocument = await Guild.getOrCreate(client, { guildId: guildId.toString() });

	const levelExamples = guildDocument.features.language.features?.cefr?.examples;
	if (levelExamples === undefined) {
		return;
	}

	const isExtended = guildDocument.features.language.features?.cefr?.extended ?? false;

	const guide = getBracketGuide(client, { isExtended }, { locale });
	const examples = levelExamples.enabled
		? getBracketExamples(client, levelExamples.levels, { isExtended }, { locale })
		: undefined;

	const data: Data = { bracket: "a", tab: "guide" };

	const getEmbed = (): Discord.CamelizedDiscordEmbed => {
		let tab: Record<Bracket, Discord.CamelizedDiscordEmbed>;
		switch (data.tab) {
			case "guide": {
				tab = guide;
				break;
			}
			case "examples": {
				if (examples === undefined) {
					throw Error("StateError: Attempted to display examples when examples haven't been provided.");
				}

				tab = examples;
				break;
			}
		}

		const embed = tab[data.bracket];

		return embed;
	};

	const strings = {
		brackets: {
			a: client.localise("cefr.strings.brackets.a", locale)(),
			b: client.localise("cefr.strings.brackets.b", locale)(),
			c: client.localise("cefr.strings.brackets.c", locale)(),
		},
		tabs: {
			guide: client.localise("cefr.strings.tabs.guide", locale)(),
			examples: client.localise("cefr.strings.tabs.examples", locale)(),
		},
	};

	const showButton = getShowButton(client, interaction, { locale });

	const bracketButtons = new InteractionCollector<BracketButtonMetadata>(client, {
		only: !show ? [interaction.user.id] : undefined,
	});
	const tabButtons = new InteractionCollector<TabButtonMetadata>(client, {
		only: !show ? [interaction.user.id] : undefined,
	});

	const getButtons = (): Discord.MessageComponents => {
		const bracketButtonComponents: [Discord.ButtonComponent, Discord.ButtonComponent, Discord.ButtonComponent] = [
			{
				type: Discord.MessageComponentTypes.Button,
				label: strings.brackets.a,
				customId: bracketButtons.encodeId(["a"]),
				emoji: { name: constants.symbols.cefr.a },
				style: Discord.ButtonStyles.Secondary,
			},
			{
				type: Discord.MessageComponentTypes.Button,
				label: strings.brackets.b,
				customId: bracketButtons.encodeId(["b"]),
				emoji: { name: constants.symbols.cefr.b },
				style: Discord.ButtonStyles.Secondary,
			},
			{
				type: Discord.MessageComponentTypes.Button,
				label: strings.brackets.c,
				customId: bracketButtons.encodeId(["c"]),
				emoji: { name: constants.symbols.cefr.c },
				style: Discord.ButtonStyles.Secondary,
			},
		];

		switch (data.bracket) {
			case "a": {
				bracketButtonComponents[0].disabled = true;
				break;
			}
			case "b": {
				bracketButtonComponents[1].disabled = true;
				break;
			}
			case "c": {
				bracketButtonComponents[2].disabled = true;
				break;
			}
		}

		if (!levelExamples.enabled) {
			return [{ type: Discord.MessageComponentTypes.ActionRow, components: bracketButtonComponents }];
		}

		const tabButtonComponents: [Discord.ButtonComponent, Discord.ButtonComponent] = [
			{
				type: Discord.MessageComponentTypes.Button,
				label: strings.tabs.guide,
				customId: tabButtons.encodeId(["guide"]),
				style: Discord.ButtonStyles.Primary,
			},
			{
				type: Discord.MessageComponentTypes.Button,
				label: strings.tabs.examples,
				customId: tabButtons.encodeId(["examples"]),
				style: Discord.ButtonStyles.Primary,
			},
		];

		switch (data.tab) {
			case "guide": {
				tabButtonComponents[0].disabled = true;
				break;
			}
			case "examples": {
				tabButtonComponents[1].disabled = true;
				break;
			}
		}

		if (!show) {
			tabButtonComponents.push(showButton);
		}

		const rows: Discord.ActionRow[] = [
			{ type: Discord.MessageComponentTypes.ActionRow, components: bracketButtonComponents },
			{ type: Discord.MessageComponentTypes.ActionRow, components: tabButtonComponents },
		];

		return rows;
	};

	const refreshView = async () => {
		client.editReply(interaction, { embeds: [getEmbed()], components: getButtons() });
	};

	bracketButtons.onCollect(async (buttonPress) => {
		client.acknowledge(buttonPress);

		data.bracket = buttonPress.metadata[1];

		refreshView();
	});

	tabButtons.onCollect(async (buttonPress) => {
		client.acknowledge(buttonPress);

		data.tab = buttonPress.metadata[1];

		refreshView();
	});

	client.registerInteractionCollector(bracketButtons);
	client.registerInteractionCollector(tabButtons);

	client.reply(interaction, { embeds: [getEmbed()], components: getButtons() }, { visible: show });
}

function getBracketGuide(
	client: Client,
	options: { isExtended: boolean },
	{ locale }: { locale: Locale },
): Record<Bracket, Discord.CamelizedDiscordEmbed> {
	const strings = {
		brackets: {
			a: client.localise("cefr.strings.brackets.a", locale)(),
			b: client.localise("cefr.strings.brackets.b", locale)(),
			c: client.localise("cefr.strings.brackets.c", locale)(),
		},
		levels: {
			a0: {
				title: client.localise("cefr.strings.levels.a0.title", locale)(),
				description: client.localise("cefr.strings.levels.a0.description", locale)(),
			},
			a1: {
				title: client.localise("cefr.strings.levels.a1.title", locale)(),
				description: client.localise("cefr.strings.levels.a1.description", locale)(),
			},
			a2: {
				title: client.localise("cefr.strings.levels.a2.title", locale)(),
				description: client.localise("cefr.strings.levels.a2.description", locale)(),
			},
			b1: {
				title: client.localise("cefr.strings.levels.b1.title", locale)(),
				description: client.localise("cefr.strings.levels.b1.description", locale)(),
			},
			b2: {
				title: client.localise("cefr.strings.levels.b2.title", locale)(),
				description: client.localise("cefr.strings.levels.b2.description", locale)(),
			},
			c1: {
				title: client.localise("cefr.strings.levels.c1.title", locale)(),
				description: client.localise("cefr.strings.levels.c1.description", locale)(),
			},
			c2: {
				title: client.localise("cefr.strings.levels.c2.title", locale)(),
				description: client.localise("cefr.strings.levels.c2.description", locale)(),
			},
			c3: {
				title: client.localise("cefr.strings.levels.c3.title", locale)(),
				description: client.localise("cefr.strings.levels.c3.description", locale)(),
			},
		},
	};

	return {
		a: {
			title: strings.brackets.a,
			color: constants.colors.green,
			fields: [
				...(options.isExtended
					? [
							{
								name: strings.levels.a0.title,
								value: strings.levels.a0.description,
							},
					  ]
					: []),
				{
					name: strings.levels.a1.title,
					value: strings.levels.a1.description,
				},
				{
					name: strings.levels.a2.title,
					value: strings.levels.a2.description,
				},
			],
		},
		b: {
			title: strings.brackets.b,
			color: constants.colors.yellow,
			fields: [
				{
					name: strings.levels.b1.title,
					value: strings.levels.b1.description,
				},
				{
					name: strings.levels.b2.title,
					value: strings.levels.b2.description,
				},
			],
		},
		c: {
			title: strings.brackets.c,
			color: constants.colors.red,
			fields: [
				{
					name: strings.levels.c1.title,
					value: strings.levels.c1.description,
				},
				{
					name: strings.levels.c2.title,
					value: strings.levels.c2.description,
				},
				...(options.isExtended
					? [
							{
								name: strings.levels.c3.title,
								value: strings.levels.c3.description,
							},
					  ]
					: []),
			],
		},
	};
}

function getBracketExamples(
	client: Client,
	levels: NonNullable<CefrConfiguration["examples"]["levels"]>,
	options: { isExtended: boolean },
	{ locale }: { locale: Locale },
): Record<Bracket, Discord.CamelizedDiscordEmbed> {
	const strings = {
		brackets: {
			a: client.localise("cefr.strings.brackets.a", locale)(),
			b: client.localise("cefr.strings.brackets.b", locale)(),
			c: client.localise("cefr.strings.brackets.c", locale)(),
		},
		levels: {
			a0: {
				title: client.localise("cefr.strings.levels.a0.title", locale)(),
			},
			a1: {
				title: client.localise("cefr.strings.levels.a1.title", locale)(),
			},
			a2: {
				title: client.localise("cefr.strings.levels.a2.title", locale)(),
			},
			b1: {
				title: client.localise("cefr.strings.levels.b1.title", locale)(),
			},
			b2: {
				title: client.localise("cefr.strings.levels.b2.title", locale)(),
			},
			c1: {
				title: client.localise("cefr.strings.levels.c1.title", locale)(),
			},
			c2: {
				title: client.localise("cefr.strings.levels.c2.title", locale)(),
			},
			c3: {
				title: client.localise("cefr.strings.levels.c3.title", locale)(),
			},
		},
	};

	return {
		a: {
			title: strings.brackets.a,
			color: constants.colors.green,
			fields: [
				...(options.isExtended
					? [
							{
								name: strings.levels.a0.title,
								value: levels.a0,
							},
					  ]
					: []),
				{
					name: strings.levels.a1.title,
					value: levels.a1,
				},
				{
					name: strings.levels.a2.title,
					value: levels.a2,
				},
			],
		},
		b: {
			title: strings.brackets.b,
			color: constants.colors.yellow,
			fields: [
				{
					name: strings.levels.b1.title,
					value: levels.b1,
				},
				{
					name: strings.levels.b2.title,
					value: levels.b2,
				},
			],
		},
		c: {
			title: strings.brackets.c,
			color: constants.colors.red,
			fields: [
				{
					name: strings.levels.c1.title,
					value: levels.c1,
				},
				{
					name: strings.levels.c2.title,
					value: levels.c2,
				},
				...(options.isExtended
					? [
							{
								name: strings.levels.c3.title,
								value: levels.c3,
							},
					  ]
					: []),
			],
		},
	};
}

export default command;
