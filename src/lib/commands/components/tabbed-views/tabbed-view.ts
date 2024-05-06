import { Client } from "logos/client";
import { InteractionCollector } from "logos/collectors";

interface View {
	embed: Discord.CamelizedDiscordEmbed;
	components?: Discord.MessageComponents;
}

abstract class TabbedView<Generic extends { groups: Record<string, string> }> {
	readonly client: Client;
	readonly buttonPresses: InteractionCollector<[group: string, tab: string]>;

	readonly #tabs: Generic["groups"];
	readonly #showable: boolean;

	readonly #_anchor: Logos.Interaction;

	get #view(): View {
		const view = this.build(this.#_anchor, { tabs: this.#tabs });

		if (this.#showable && !this.#_anchor.parameters.show) {
			const showButton = this.client.interactionRepetitionService.getShowButton(this.#_anchor);

			for (const { components } of view.components ?? []) {
				if (components.length >= 5) {
					continue;
				}

				components.push(showButton);
				break;
			}

			return view;
		}

		return view;
	}

	constructor(
		client: Client,
		{
			interaction,
			tabs,
			showable,
		}: { interaction: Logos.Interaction; tabs: Generic["groups"]; showable?: boolean },
	) {
		this.client = client;
		this.buttonPresses = new InteractionCollector(client, { guildId: interaction.guildId });

		this.#tabs = tabs;
		this.#showable = showable ?? false;

		this.#_anchor = interaction;
	}

	abstract build(interaction: Logos.Interaction, { tabs }: { tabs: Generic["groups"] }): View;

	async #display(): Promise<void> {
		const view = this.#view;

		await this.client.reply(this.#_anchor, {
			embeds: [view.embed],
			components: view.components,
		});
	}

	async refresh(): Promise<void> {
		const view = this.#view;

		await this.client.editReply(this.#_anchor, {
			embeds: [view.embed],
			components: view.components,
		});
	}

	async open(): Promise<void> {
		this.buttonPresses.onInteraction(async (buttonPress) => {
			await this.client.acknowledge(buttonPress);

			const group = buttonPress.metadata[1] as keyof Generic["groups"];
			const tab = buttonPress.metadata[2] as Generic["groups"][typeof group];

			this.#tabs[group] = tab;

			await this.refresh();
		});

		this.buttonPresses.onDone(this.close.bind(this));

		await this.client.registerInteractionCollector(this.buttonPresses);

		await this.#display();
	}

	async close(): Promise<void> {
		await this.buttonPresses.close();
	}
}

export { TabbedView, View };
