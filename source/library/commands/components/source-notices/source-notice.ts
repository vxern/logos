import type { Client } from "logos/client";
import { InteractionCollector } from "logos/collectors";

abstract class SourceNotice {
	readonly client: Client;
	readonly sources: string[];
	readonly notice?: string;

	readonly #buttonPresses: InteractionCollector;
	readonly #interaction: Logos.Interaction;

	get button(): Discord.ButtonComponent {
		const strings = constants.contexts.source({
			localise: this.client.localise,
			locale: this.#interaction.displayLocale,
		});

		return {
			type: Discord.MessageComponentTypes.Button,
			label: `${constants.emojis.source} ${strings.source}`,
			customId: this.#buttonPresses.customId,
			style: Discord.ButtonStyles.Secondary,
		};
	}

	constructor(
		client: Client,
		{ interaction, sources, notice }: { interaction: Logos.Interaction; sources: string[]; notice?: string },
	) {
		this.client = client;
		this.sources = sources;
		this.notice = notice;

		this.#buttonPresses = new InteractionCollector(client, { only: [interaction.user.id] });
		this.#interaction = interaction;
	}

	async display(buttonPress: Logos.Interaction): Promise<void> {
		const sourcesFormatted = this.sources.join(constants.special.sigils.separator);

		await this.client.reply(buttonPress, {
			embeds: [
				{
					description: `${constants.emojis.link} ${sourcesFormatted}`,
					color: constants.colours.blue,
					footer: this.notice !== undefined ? { text: this.notice } : undefined,
				},
			],
		});
	}

	async register(): Promise<void> {
		this.#buttonPresses.onInteraction(async (buttonPress) => this.display(buttonPress));

		await this.client.registerInteractionCollector(this.#buttonPresses);
	}
}

export { SourceNotice };
