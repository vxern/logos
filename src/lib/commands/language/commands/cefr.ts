import * as Discord from "@discordeno/bot";
import constants from "../../../../constants/constants";
import { Locale } from "../../../../constants/languages";
import * as Logos from "../../../../types";
import { Client, localise } from "../../../client";
import { CefrConfiguration } from "../../../database/structs/guild";
import {
	acknowledge,
	createInteractionCollector,
	decodeId,
	editReply,
	encodeId,
	getShowButton,
	parseArguments,
	reply,
} from "../../../interactions";
import { CommandTemplate } from "../../command";
import { show } from "../../parameters";

const command: CommandTemplate = {
	name: "cefr",
	type: Discord.ApplicationCommandTypes.ChatInput,
	defaultMemberPermissions: ["VIEW_CHANNEL"],
	isShowable: true,
	handle: handleDisplayCefrGuide,
	options: [show],
};

type Bracket = "a" | "b" | "c";
type Tab = "guide" | "examples";

interface Data {
	bracket: Bracket;
	tab: Tab;
}

type BracketButtonMetadata = [bracket: Bracket];
type TabButtonMetadata = [tab: Tab];

async function handleDisplayCefrGuide(
	[client, bot]: [Client, Discord.Bot],
	interaction: Logos.Interaction,
): Promise<void> {
	const [{ show: showParameter }] = parseArguments(interaction.data?.options, { show: "boolean" });

	const show = interaction.show ?? showParameter ?? false;
	const locale = show ? interaction.guildLocale : interaction.locale;

	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return;
	}

	const guildDocument = await client.database.adapters.guilds.getOrFetch(client, "id", guildId.toString());
	if (guildDocument === undefined) {
		return;
	}

	const levelExamples = guildDocument.data.features.language.features?.cefr?.examples;
	if (levelExamples === undefined) {
		return;
	}

	const isExtended = guildDocument.data.features.language.features?.cefr?.extended ?? false;

	const guide = getBracketGuide(client, { isExtended }, { locale });
	const examples = levelExamples.enabled
		? getBracketExamples(client, levelExamples.levels, { isExtended }, { locale })
		: undefined;

	const data: Data = { bracket: "a", tab: "guide" };

	const getEmbed = (): Discord.CamelizedDiscordEmbed => {
		let tab;
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
			a: localise(client, "cefr.strings.brackets.a", locale)(),
			b: localise(client, "cefr.strings.brackets.b", locale)(),
			c: localise(client, "cefr.strings.brackets.c", locale)(),
		},
		tabs: {
			guide: localise(client, "cefr.strings.tabs.guide", locale)(),
			examples: localise(client, "cefr.strings.tabs.examples", locale)(),
		},
	};

	const showButton = getShowButton(client, interaction, { locale });

	const getButtons = (): Discord.MessageComponents => {
		const bracketButtons: [Discord.ButtonComponent, Discord.ButtonComponent, Discord.ButtonComponent] = [
			{
				type: Discord.MessageComponentTypes.Button,
				label: strings.brackets.a,
				customId: encodeId<BracketButtonMetadata>(bracketButtonId, ["a"]),
				emoji: { name: constants.symbols.cefr.a },
				style: Discord.ButtonStyles.Secondary,
			},
			{
				type: Discord.MessageComponentTypes.Button,
				label: strings.brackets.b,
				customId: encodeId<BracketButtonMetadata>(bracketButtonId, ["b"]),
				emoji: { name: constants.symbols.cefr.b },
				style: Discord.ButtonStyles.Secondary,
			},
			{
				type: Discord.MessageComponentTypes.Button,
				label: strings.brackets.c,
				customId: encodeId<BracketButtonMetadata>(bracketButtonId, ["c"]),
				emoji: { name: constants.symbols.cefr.c },
				style: Discord.ButtonStyles.Secondary,
			},
		];
		switch (data.bracket) {
			case "a": {
				bracketButtons[0].disabled = true;
				break;
			}
			case "b": {
				bracketButtons[1].disabled = true;
				break;
			}
			case "c": {
				bracketButtons[2].disabled = true;
				break;
			}
		}

		if (!levelExamples.enabled) {
			return [{ type: Discord.MessageComponentTypes.ActionRow, components: bracketButtons }];
		}

		const tabButtons: [Discord.ButtonComponent, Discord.ButtonComponent] = [
			{
				type: Discord.MessageComponentTypes.Button,
				label: strings.tabs.guide,
				customId: encodeId<TabButtonMetadata>(tabButtonId, ["guide"]),
				style: Discord.ButtonStyles.Primary,
			},
			{
				type: Discord.MessageComponentTypes.Button,
				label: strings.tabs.examples,
				customId: encodeId<TabButtonMetadata>(tabButtonId, ["examples"]),
				style: Discord.ButtonStyles.Primary,
			},
		];
		switch (data.tab) {
			case "guide": {
				tabButtons[0].disabled = true;
				break;
			}
			case "examples": {
				tabButtons[1].disabled = true;
				break;
			}
		}

		if (!show) {
			tabButtons.push(showButton);
		}

		const rows: Discord.ActionRow[] = [
			{ type: Discord.MessageComponentTypes.ActionRow, components: bracketButtons },
			{ type: Discord.MessageComponentTypes.ActionRow, components: tabButtons },
		];

		return rows;
	};

	const refreshView = async () => {
		editReply([client, bot], interaction, { embeds: [getEmbed()], components: getButtons() });
	};

	const bracketButtonId = createInteractionCollector([client, bot], {
		type: Discord.InteractionTypes.MessageComponent,
		userId: interaction.user.id,
		onCollect: async (selection) => {
			acknowledge([client, bot], selection);

			const selectionCustomId = selection.data?.customId;
			if (selectionCustomId === undefined) {
				return;
			}

			const [__, bracketRaw] = decodeId<BracketButtonMetadata>(selectionCustomId);
			if (bracketRaw === undefined) {
				return;
			}

			if (!Object.keys(guide).includes(bracketRaw)) {
				return;
			}

			const bracket = bracketRaw as Bracket;

			data.bracket = bracket;

			refreshView();
		},
	});

	const tabButtonId = createInteractionCollector([client, bot], {
		type: Discord.InteractionTypes.MessageComponent,
		userId: interaction.user.id,
		onCollect: async (selection) => {
			acknowledge([client, bot], selection);

			const selectionCustomId = selection.data?.customId;
			if (selectionCustomId === undefined) {
				return;
			}

			const [__, tabRaw] = decodeId<TabButtonMetadata>(selectionCustomId);
			if (tabRaw === undefined) {
				return;
			}

			if (!["guide", "examples"].includes(tabRaw)) {
				return;
			}

			const tab = tabRaw as Tab;

			data.tab = tab;

			refreshView();
		},
	});

	reply([client, bot], interaction, { embeds: [getEmbed()], components: getButtons() }, { visible: show });
}

function getBracketGuide(
	client: Client,
	options: { isExtended: boolean },
	{ locale }: { locale: Locale },
): Record<Bracket, Discord.CamelizedDiscordEmbed> {
	const strings = {
		brackets: {
			a: localise(client, "cefr.strings.brackets.a", locale)(),
			b: localise(client, "cefr.strings.brackets.b", locale)(),
			c: localise(client, "cefr.strings.brackets.c", locale)(),
		},
		levels: {
			a0: {
				title: localise(client, "cefr.strings.levels.a0.title", locale)(),
				description: localise(client, "cefr.strings.levels.a0.description", locale)(),
			},
			a1: {
				title: localise(client, "cefr.strings.levels.a1.title", locale)(),
				description: localise(client, "cefr.strings.levels.a1.description", locale)(),
			},
			a2: {
				title: localise(client, "cefr.strings.levels.a2.title", locale)(),
				description: localise(client, "cefr.strings.levels.a2.description", locale)(),
			},
			b1: {
				title: localise(client, "cefr.strings.levels.b1.title", locale)(),
				description: localise(client, "cefr.strings.levels.b1.description", locale)(),
			},
			b2: {
				title: localise(client, "cefr.strings.levels.b2.title", locale)(),
				description: localise(client, "cefr.strings.levels.b2.description", locale)(),
			},
			c1: {
				title: localise(client, "cefr.strings.levels.c1.title", locale)(),
				description: localise(client, "cefr.strings.levels.c1.description", locale)(),
			},
			c2: {
				title: localise(client, "cefr.strings.levels.c2.title", locale)(),
				description: localise(client, "cefr.strings.levels.c2.description", locale)(),
			},
			c3: {
				title: localise(client, "cefr.strings.levels.c3.title", locale)(),
				description: localise(client, "cefr.strings.levels.c3.description", locale)(),
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
			a: localise(client, "cefr.strings.brackets.a", locale)(),
			b: localise(client, "cefr.strings.brackets.b", locale)(),
			c: localise(client, "cefr.strings.brackets.c", locale)(),
		},
		levels: {
			a0: {
				title: localise(client, "cefr.strings.levels.a0.title", locale)(),
			},
			a1: {
				title: localise(client, "cefr.strings.levels.a1.title", locale)(),
			},
			a2: {
				title: localise(client, "cefr.strings.levels.a2.title", locale)(),
			},
			b1: {
				title: localise(client, "cefr.strings.levels.b1.title", locale)(),
			},
			b2: {
				title: localise(client, "cefr.strings.levels.b2.title", locale)(),
			},
			c1: {
				title: localise(client, "cefr.strings.levels.c1.title", locale)(),
			},
			c2: {
				title: localise(client, "cefr.strings.levels.c2.title", locale)(),
			},
			c3: {
				title: localise(client, "cefr.strings.levels.c3.title", locale)(),
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
