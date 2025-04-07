import type { Client } from "logos/client";
import { TabbedView, type View } from "logos/commands/components/tabbed-views/tabbed-view";
import type { Guild } from "logos/models/guild";

type Bracket = "a" | "b" | "c";
type Mode = "guide" | "examples";
interface TabGroups {
	bracket: Bracket;
	mode: Mode;
	[key: string]: string;
}

class CefrGuideView extends TabbedView<{ groups: TabGroups }> {
	readonly #guildDocument: Guild;

	get #configuration(): NonNullable<Guild["features"]["cefr"]> {
		return this.#guildDocument.feature("cefr");
	}

	get #examplesEnabled(): boolean {
		return this.#configuration.examples !== undefined;
	}

	constructor(
		client: Client,
		{ interaction, guildDocument }: { interaction: Logos.Interaction; guildDocument: Guild },
	) {
		super(client, { interaction, tabs: { bracket: "a", mode: "guide" }, showable: true });

		this.#guildDocument = guildDocument;
	}

	build(interaction: Logos.Interaction, { tabs }: { tabs: TabGroups }): View {
		const embed = this.getEmbed(interaction, tabs);
		const buttons = this.getButtons(interaction, tabs);

		return { embed, components: buttons };
	}

	getEmbed(interaction: Logos.Interaction, { bracket, mode }: TabGroups): Discord.Camelize<Discord.DiscordEmbed> {
		switch (mode) {
			case "guide": {
				return this.getGuideEmbed(interaction, { bracket });
			}
			case "examples": {
				return this.getExampleEmbed(interaction, { bracket });
			}
		}
	}

	getGuideEmbed(
		interaction: Logos.Interaction,
		{ bracket }: { bracket: Bracket },
	): Discord.Camelize<Discord.DiscordEmbed> {
		switch (bracket) {
			case "a": {
				const strings = constants.contexts.cefrGuideBracketA({
					localise: this.client.localise,
					locale: interaction.locale,
				});

				return {
					title: strings.brackets.a,
					color: constants.colours.green,
					fields: [
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
				const strings = constants.contexts.cefrGuideBracketB({
					localise: this.client.localise,
					locale: interaction.locale,
				});

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
				const strings = constants.contexts.cefrGuideBracketC({
					localise: this.client.localise,
					locale: interaction.locale,
				});

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
					],
				};
			}
		}
	}

	getExampleEmbed(
		interaction: Logos.Interaction,
		{ bracket }: { bracket: Bracket },
	): Discord.Camelize<Discord.DiscordEmbed> {
		const examples = this.#configuration.examples!;

		switch (bracket) {
			case "a": {
				const strings = constants.contexts.cefrExamplesBracketA({
					localise: this.client.localise,
					locale: interaction.locale,
				});

				return {
					title: strings.brackets.a,
					color: constants.colours.green,
					fields: [
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
				const strings = constants.contexts.cefrExamplesBracketB({
					localise: this.client.localise,
					locale: interaction.locale,
				});

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
				const strings = constants.contexts.cefrExamplesBracketC({
					localise: this.client.localise,
					locale: interaction.locale,
				});

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
					],
				};
			}
		}
	}

	getButtons(
		interaction: Logos.Interaction,
		{ bracket, mode }: { bracket: Bracket; mode: Mode },
	): Discord.ActionRow[] {
		const strings = constants.contexts.cefrButtons({
			localise: this.client.localise,
			locale: interaction.locale,
		});

		return [
			{
				type: Discord.MessageComponentTypes.ActionRow,
				components: [
					{
						type: Discord.MessageComponentTypes.Button,
						label: strings.brackets.a,
						customId: this.buttonPresses.encodeId(["bracket", "a"]),
						disabled: bracket === "a",
						emoji: { name: constants.emojis.commands.cefr.a },
						style: Discord.ButtonStyles.Secondary,
					},
					{
						type: Discord.MessageComponentTypes.Button,
						label: strings.brackets.b,
						customId: this.buttonPresses.encodeId(["bracket", "b"]),
						disabled: bracket === "b",
						emoji: { name: constants.emojis.commands.cefr.b },
						style: Discord.ButtonStyles.Secondary,
					},
					{
						type: Discord.MessageComponentTypes.Button,
						label: strings.brackets.c,
						customId: this.buttonPresses.encodeId(["bracket", "c"]),
						disabled: bracket === "c",
						emoji: { name: constants.emojis.commands.cefr.c },
						style: Discord.ButtonStyles.Secondary,
					},
				],
			},
			{
				type: Discord.MessageComponentTypes.ActionRow,
				components: [
					{
						type: Discord.MessageComponentTypes.Button,
						label: strings.tabs.guide,
						customId: this.buttonPresses.encodeId(["mode", "guide"]),
						disabled: mode === "guide",
						style: Discord.ButtonStyles.Primary,
					},
					...((this.#examplesEnabled
						? [
								{
									type: Discord.MessageComponentTypes.Button,
									label: strings.tabs.examples,
									customId: this.buttonPresses.encodeId(["mode", "examples"]),
									disabled: mode === "examples",
									style: Discord.ButtonStyles.Primary,
								},
							]
						: []) as [Discord.ButtonComponent]),
				],
			},
		];
	}
}

export { CefrGuideView };
