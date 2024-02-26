import * as Discord from "@discordeno/bot";
import constants from "../../constants/constants";
import * as Logos from "../../types";
import { Client, InteractionCollector } from "../client";
import { chunk } from "../utils";
import defaults from "../../defaults";
import { Song, SongCollection, SongListing, listingTypeToEmoji } from "../commands/music/data/types";
import { Locale } from "../../constants/languages";
import { trim } from "../../formatting";

type PageView = Omit<Discord.CamelizedDiscordEmbed, "footer"> & Required<Pick<Discord.CamelizedDiscordEmbed, "title">>;
type PageAction = "previous" | "next";

abstract class PaginatedViewComponent<T> {
	readonly client: Client;

	anchor: Logos.Interaction;

	readonly #pages: T[][];
	readonly #showable: boolean;

	#index: number;

	readonly #_pageButtons: InteractionCollector<[action: PageAction]>;

	get #isOnFirstPage(): boolean {
		return this.#index === 0;
	}

	get #isOnLastPage(): boolean {
		return this.#index === Math.max(this.#pages.length - 1, 0);
	}

	get #hasSinglePage(): boolean {
		return this.#pages.length === 1;
	}

	get #currentPage(): T[] {
		return this.#pages.at(this.#index)!;
	}

	get #view(): Discord.CamelizedDiscordEmbed {
		const locale = this.anchor.parameters.show ? this.anchor.guildLocale : this.anchor.locale;

		const view = this.build(this.#currentPage, this.#index, { locale });

		let title: string;
		if (!this.#hasSinglePage) {
			const strings = {
				page: this.client.localise("interactions.page", locale)(),
			};

			title = `${view.title} ~ ${strings.page} ${this.#index + 1}/${this.#pages.length}`;
		} else {
			title = view.title;
		}

		if (!this.#isOnLastPage) {
			const strings = {
				continuedOnNextPage: this.client.localise("interactions.continuedOnNextPage", locale)(),
			};

			return { ...view, title, footer: { text: strings.continuedOnNextPage } };
		}

		return { ...view, title };
	}

	get #paginationControls(): Discord.MessageComponents {
		const buttons: Discord.ButtonComponent[] = [
			{
				type: Discord.MessageComponentTypes.Button,
				customId: this.#_pageButtons.encodeId(["previous"]),
				disabled: this.#isOnFirstPage,
				style: Discord.ButtonStyles.Secondary,
				label: constants.symbols.interactions.menu.controls.back,
			},
			{
				type: Discord.MessageComponentTypes.Button,
				customId: this.#_pageButtons.encodeId(["next"]),
				disabled: this.#isOnLastPage,
				style: Discord.ButtonStyles.Secondary,
				label: constants.symbols.interactions.menu.controls.forward,
			},
		];

		if (this.#showable && !this.anchor.parameters.show) {
			const showButton = this.client.interactionRepetitionService.getShowButton(this.anchor, {
				locale: this.anchor.locale,
			});

			return [
				{
					type: Discord.MessageComponentTypes.ActionRow,
					components: [...buttons, showButton] as [Discord.ButtonComponent],
				},
			];
		}

		return [
			{
				type: Discord.MessageComponentTypes.ActionRow,
				components: buttons as [Discord.ButtonComponent],
			},
		];
	}

	constructor(
		client: Client,
		{ interaction, elements, showable }: { interaction: Logos.Interaction; elements: T[]; showable?: boolean },
	) {
		this.client = client;
		this.#pages = chunk(elements, defaults.RESULTS_PER_PAGE);
		this.#showable = showable ?? false;
		this.#index = 0;

		this.#_pageButtons = new InteractionCollector<[action: PageAction]>(client, {
			only: interaction.parameters.show ? [interaction.user.id] : undefined,
		});
		this.anchor = interaction;
	}

	abstract build(page: T[], index: number, { locale }: { locale: Locale }): PageView;

	async #display(): Promise<void> {
		await this.client.reply(this.anchor, { embeds: [this.#view], components: this.#paginationControls });
	}

	async refresh(): Promise<void> {
		await this.client.editReply(this.anchor, { embeds: [this.#view], components: this.#paginationControls });
	}

	navigateToPreviousPage(): void {
		if (this.#isOnFirstPage) {
			return;
		}

		this.#index -= 1;
	}

	navigateToNextPage(): void {
		if (this.#isOnLastPage) {
			return;
		}

		this.#index += 1;
	}

	async open(): Promise<void> {
		this.#_pageButtons.onCollect(async (buttonPress) => {
			this.client.acknowledge(buttonPress);

			switch (buttonPress.metadata[1]) {
				case "previous": {
					this.navigateToPreviousPage();
					break;
				}
				case "next": {
					this.navigateToNextPage();
					break;
				}
			}

			await this.refresh();
		});

		this.#_pageButtons.onDone(this.close.bind(this));

		await this.client.registerInteractionCollector(this.#_pageButtons);

		await this.#display();
	}

	async close(): Promise<void> {
		this.#_pageButtons.close();
	}
}

class PaginatedSongListingViewComponent extends PaginatedViewComponent<SongListing> {
	readonly #title: string;

	constructor(
		client: Client,
		{ interaction, title, listings }: { interaction: Logos.Interaction; title: string; listings: SongListing[] },
	) {
		super(client, { interaction, elements: listings, showable: true });

		this.#title = title;
	}

	build(page: SongListing[], pageIndex: number, { locale }: { locale: Locale }): PageView {
		if (page.length === 0) {
			const strings = {
				listEmpty: this.client.localise("music.strings.listEmpty", locale)(),
			};

			return { title: this.#title, description: strings.listEmpty, color: constants.colors.blue };
		}

		const listingsFormatted = page
			.map((listing, listingIndex) => {
				const indexDisplayed = pageIndex * 10 + (listingIndex + 1);
				const emoji = listingTypeToEmoji[listing.content.type];

				return `${indexDisplayed}. ${emoji} ~ ${listing.content.title}`;
			})
			.join("\n");

		return { title: this.#title, description: listingsFormatted, color: constants.colors.blue };
	}
}

class PaginatedSongCollectionViewComponent extends PaginatedViewComponent<Song> {
	readonly #title: string;
	readonly #collection: SongCollection;

	constructor(
		client: Client,
		{ interaction, title, collection }: { interaction: Logos.Interaction; title: string; collection: SongCollection },
	) {
		super(client, { interaction, elements: collection.songs, showable: true });

		this.#title = title;
		this.#collection = collection;
	}

	build(page: Song[], pageIndex: number, { locale }: { locale: Locale }): PageView {
		if (page.length === 0) {
			const strings = {
				listEmpty: this.client.localise("music.strings.listEmpty", locale)(),
			};

			return { title: this.#title, description: strings.listEmpty, color: constants.colors.blue };
		}

		const songsFormatted = page
			.map((song, songIndex) => {
				const isCurrent = pageIndex * 10 + songIndex === this.#collection.position;

				const titleFormatted = trim(
					song.title.replaceAll("(", "❨").replaceAll(")", "❩").replaceAll("[", "⁅").replaceAll("]", "⁆"),
					50,
				);
				const titleHyperlink = `[${titleFormatted}](${song.url})`;
				const titleHighlighted = isCurrent ? `**${titleHyperlink}**` : titleHyperlink;

				return `${pageIndex * 10 + (songIndex + 1)}. ${titleHighlighted}`;
			})
			.join("\n");

		return { title: this.#title, description: songsFormatted, color: constants.colors.blue };
	}
}

class PaginatedSoftwareLicenceViewComponent extends PaginatedViewComponent<string> {
	readonly #title: string;

	constructor(
		client: Client,
		{ interaction, title, sections }: { interaction: Logos.Interaction; title: string; sections: string[] },
	) {
		super(client, { interaction, elements: sections });

		this.#title = title;
	}

	build(page: string[], _: number, { locale: __ }: { locale: Locale }): PageView {
		return { title: this.#title, description: `*${page}*` };
	}
}

export {
	PaginatedViewComponent,
	PaginatedSongListingViewComponent,
	PaginatedSongCollectionViewComponent,
	PaginatedSoftwareLicenceViewComponent,
};
