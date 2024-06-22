import type { Client } from "logos/client";
import { InteractionCollector } from "logos/collectors.ts";

abstract class SourceNotice {
	readonly client: Client;

	readonly #buttonPresses: InteractionCollector;
	readonly #interaction: Logos.Interaction;
	readonly #sources: string[];
	readonly #notice: string;

	get button(): Discord.ButtonComponent {
		const strings = constants.contexts.source({
			localise: this.client.localise.bind(this.client),
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
		{ interaction, sources, notice }: { interaction: Logos.Interaction; sources: string[]; notice: string },
	) {
		this.client = client;

		this.#buttonPresses = new InteractionCollector(client, { only: [interaction.user.id] });
		this.#interaction = interaction;
		this.#sources = sources;
		this.#notice = notice;
	}

	async #display(buttonPress: Logos.Interaction): Promise<void> {
		const sourcesFormatted = this.#sources.join(constants.special.sigils.separator);

		await this.client.reply(
			buttonPress,
			{
				embeds: [
					{
						description: `${constants.emojis.link} ${sourcesFormatted}`,
						color: constants.colours.blue,
						footer: { text: this.#notice },
					},
				],
			},
			{ visible: this.#interaction.parameters.show },
		);
	}

	async register(): Promise<void> {
		this.#buttonPresses.onInteraction(async (buttonPress) => this.#display(buttonPress));

		await this.client.registerInteractionCollector(this.#buttonPresses);
	}
}

export { SourceNotice };
