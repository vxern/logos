import { Locale } from "logos:constants/languages/localisation";
import { Client } from "logos/client";
import { TabbedView, View } from "logos/commands/components/tabbed-views/tabbed-view";
import { Guild } from "logos/database/guild";

type Bracket = "a" | "b" | "c";
type Mode = "guide" | "examples";
interface TabGroups {
	bracket: Bracket;
	mode: Mode;
	[key: string]: string;
}

class CefrGuideView extends TabbedView<{ groups: TabGroups }> {
	readonly #_guildDocument: Guild;

	get #configuration(): NonNullable<Guild["cefr"]> {
		return this.#_guildDocument.cefr!;
	}

	constructor(
		client: Client,
		{
			interaction,
			showable,
			guildDocument,
		}: { interaction: Logos.Interaction; showable: boolean; guildDocument: Guild },
	) {
		super(client, { interaction, showable, tabs: { bracket: "a", mode: "guide" } });

		this.#_guildDocument = guildDocument;
	}

	build({ tabs }: { tabs: TabGroups }, { locale }: { locale: Locale }): View {
		const embed = this.getEmbed(tabs, { locale });
		const buttons = this.getButtons(tabs, { locale });

		return { embed, components: buttons };
	}

	getEmbed({ bracket, mode }: TabGroups, { locale }: { locale: Locale }): Discord.CamelizedDiscordEmbed {
		switch (mode) {
			case "guide": {
				return this.getGuideEmbed({ bracket }, { locale });
			}
			case "examples": {
				return this.getExampleEmbed({ bracket }, { locale });
			}
		}
	}

	getGuideEmbed({ bracket }: { bracket: Bracket }, { locale }: { locale: Locale }): Discord.CamelizedDiscordEmbed {
		switch (bracket) {
			case "a": {
				const strings = {
					brackets: {
						a: this.client.localise("cefr.strings.brackets.a", locale)(),
					},
					levels: {
						a0: {
							title: this.client.localise("cefr.strings.levels.a0.title", locale)(),
							description: this.client.localise("cefr.strings.levels.a0.description", locale)(),
						},
						a1: {
							title: this.client.localise("cefr.strings.levels.a1.title", locale)(),
							description: this.client.localise("cefr.strings.levels.a1.description", locale)(),
						},
						a2: {
							title: this.client.localise("cefr.strings.levels.a2.title", locale)(),
							description: this.client.localise("cefr.strings.levels.a2.description", locale)(),
						},
					},
				};

				return {
					title: strings.brackets.a,
					color: constants.colours.green,
					fields: [
						...(this.#configuration.extended
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
				};
			}
			case "b": {
				const strings = {
					brackets: {
						b: this.client.localise("cefr.strings.brackets.b", locale)(),
					},
					levels: {
						b1: {
							title: this.client.localise("cefr.strings.levels.b1.title", locale)(),
							description: this.client.localise("cefr.strings.levels.b1.description", locale)(),
						},
						b2: {
							title: this.client.localise("cefr.strings.levels.b2.title", locale)(),
							description: this.client.localise("cefr.strings.levels.b2.description", locale)(),
						},
					},
				};

				return {
					title: strings.brackets.b,
					color: constants.colours.yellow,
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
				};
			}
			case "c": {
				const strings = {
					brackets: {
						c: this.client.localise("cefr.strings.brackets.c", locale)(),
					},
					levels: {
						c1: {
							title: this.client.localise("cefr.strings.levels.c1.title", locale)(),
							description: this.client.localise("cefr.strings.levels.c1.description", locale)(),
						},
						c2: {
							title: this.client.localise("cefr.strings.levels.c2.title", locale)(),
							description: this.client.localise("cefr.strings.levels.c2.description", locale)(),
						},
						c3: {
							title: this.client.localise("cefr.strings.levels.c3.title", locale)(),
							description: this.client.localise("cefr.strings.levels.c3.description", locale)(),
						},
					},
				};

				return {
					title: strings.brackets.c,
					color: constants.colours.red,
					fields: [
						{
							name: strings.levels.c1.title,
							value: strings.levels.c1.description,
						},
						{
							name: strings.levels.c2.title,
							value: strings.levels.c2.description,
						},
						...(this.#configuration.extended
							? [
									{
										name: strings.levels.c3.title,
										value: strings.levels.c3.description,
									},
							  ]
							: []),
					],
				};
			}
		}
	}

	getExampleEmbed({ bracket }: { bracket: Bracket }, { locale }: { locale: Locale }): Discord.CamelizedDiscordEmbed {
		const examples = this.#configuration.examples?.levels;
		if (examples === undefined) {
			throw "StateError: Attempted to get example embed when the CEFR configuration was missing examples.";
		}

		switch (bracket) {
			case "a": {
				const strings = {
					brackets: {
						a: this.client.localise("cefr.strings.brackets.a", locale)(),
					},
					levels: {
						a0: {
							title: this.client.localise("cefr.strings.levels.a0.title", locale)(),
						},
						a1: {
							title: this.client.localise("cefr.strings.levels.a1.title", locale)(),
						},
						a2: {
							title: this.client.localise("cefr.strings.levels.a2.title", locale)(),
						},
					},
				};

				return {
					title: strings.brackets.a,
					color: constants.colours.green,
					fields: [
						...(this.#configuration.extended
							? [
									{
										name: strings.levels.a0.title,
										value: examples.a0,
									},
							  ]
							: []),
						{
							name: strings.levels.a1.title,
							value: examples.a1,
						},
						{
							name: strings.levels.a2.title,
							value: examples.a2,
						},
					],
				};
			}
			case "b": {
				const strings = {
					brackets: {
						b: this.client.localise("cefr.strings.brackets.b", locale)(),
					},
					levels: {
						b1: {
							title: this.client.localise("cefr.strings.levels.b1.title", locale)(),
						},
						b2: {
							title: this.client.localise("cefr.strings.levels.b2.title", locale)(),
						},
					},
				};

				return {
					title: strings.brackets.b,
					color: constants.colours.yellow,
					fields: [
						{
							name: strings.levels.b1.title,
							value: examples.b1,
						},
						{
							name: strings.levels.b2.title,
							value: examples.b2,
						},
					],
				};
			}
			case "c": {
				const strings = {
					brackets: {
						c: this.client.localise("cefr.strings.brackets.c", locale)(),
					},
					levels: {
						c1: {
							title: this.client.localise("cefr.strings.levels.c1.title", locale)(),
						},
						c2: {
							title: this.client.localise("cefr.strings.levels.c2.title", locale)(),
						},
						c3: {
							title: this.client.localise("cefr.strings.levels.c3.title", locale)(),
						},
					},
				};

				return {
					title: strings.brackets.c,
					color: constants.colours.red,
					fields: [
						{
							name: strings.levels.c1.title,
							value: examples.c1,
						},
						{
							name: strings.levels.c2.title,
							value: examples.c2,
						},
						...(this.#configuration.extended
							? [
									{
										name: strings.levels.c3.title,
										value: examples.c3,
									},
							  ]
							: []),
					],
				};
			}
		}
	}

	getButtons(
		{ bracket, mode }: { bracket: Bracket; mode: Mode },
		{ locale }: { locale: Locale },
	): Discord.MessageComponents {
		const strings = {
			brackets: {
				a: this.client.localise("cefr.strings.brackets.a", locale)(),
				b: this.client.localise("cefr.strings.brackets.b", locale)(),
				c: this.client.localise("cefr.strings.brackets.c", locale)(),
			},
			tabs: {
				guide: this.client.localise("cefr.strings.tabs.guide", locale)(),
				examples: this.client.localise("cefr.strings.tabs.examples", locale)(),
			},
		};

		const bracketButtonComponents = [
			{
				type: Discord.MessageComponentTypes.Button,
				label: strings.brackets.a,
				customId: this.buttonPresses.encodeId(["brackets", "a"]),
				disabled: bracket === "a",
				emoji: { name: constants.emojis.cefr.a },
				style: Discord.ButtonStyles.Secondary,
			},
			{
				type: Discord.MessageComponentTypes.Button,
				label: strings.brackets.b,
				customId: this.buttonPresses.encodeId(["brackets", "b"]),
				disabled: bracket === "b",
				emoji: { name: constants.emojis.cefr.b },
				style: Discord.ButtonStyles.Secondary,
			},
			{
				type: Discord.MessageComponentTypes.Button,
				label: strings.brackets.c,
				customId: this.buttonPresses.encodeId(["brackets", "c"]),
				disabled: bracket === "c",
				emoji: { name: constants.emojis.cefr.c },
				style: Discord.ButtonStyles.Secondary,
			},
		] as const satisfies Discord.ButtonComponent[];

		if (!this.#configuration.examples?.enabled) {
			return [
				{
					type: Discord.MessageComponentTypes.ActionRow,
					components: bracketButtonComponents,
				},
			];
		}

		const tabButtonComponents = [
			{
				type: Discord.MessageComponentTypes.Button,
				label: strings.tabs.guide,
				customId: this.buttonPresses.encodeId(["mode", "guide"]),
				disabled: mode === "guide",
				style: Discord.ButtonStyles.Primary,
			},
			{
				type: Discord.MessageComponentTypes.Button,
				label: strings.tabs.examples,
				customId: this.buttonPresses.encodeId(["mode", "examples"]),
				disabled: mode === "examples",
				style: Discord.ButtonStyles.Primary,
			},
		] as const satisfies Discord.ButtonComponent[];

		return [
			{ type: Discord.MessageComponentTypes.ActionRow, components: bracketButtonComponents },
			{ type: Discord.MessageComponentTypes.ActionRow, components: tabButtonComponents },
		];
	}
}

export { CefrGuideView };
