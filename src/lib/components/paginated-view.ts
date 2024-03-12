import { Locale } from "../../constants/languages";
import { trim } from "../../formatting";
import { toChunked } from "../../utilities";
import { Client } from "../client";
import { InteractionCollector } from "../collectors";
import { Song, SongCollection, SongListing, listingTypeToEmoji } from "../commands/music/data/types";

type PageView = { embed: Discord.CamelizedDiscordEmbed; components?: Discord.MessageComponents };
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

	get #view(): PageView {
		const locale = this.anchor.parameters.show ? this.anchor.guildLocale : this.anchor.locale;

		const { embed, components } = this.build(this.#currentPage, this.#index, { locale });

		let title: string | undefined;
		if (!this.#hasSinglePage) {
			const strings = {
				page: this.client.localise("interactions.page", locale)(),
			};

			title = `${embed.title} ~ ${strings.page} ${this.#index + 1}/${this.#pages.length}`;
		} else {
			title = embed.title;
		}

		if (!this.#isOnLastPage) {
			const strings = {
				continuedOnNextPage: this.client.localise("interactions.continuedOnNextPage", locale)(),
			};

			return { embed: { ...embed, title, footer: { text: strings.continuedOnNextPage } }, components };
		}

		return { embed: { ...embed, title }, components };
	}

	get #paginationControls(): Discord.MessageComponents {
		const buttons: Discord.ButtonComponent[] = [
			{
				type: Discord.MessageComponentTypes.Button,
				customId: this.#_pageButtons.encodeId(["previous"]),
				disabled: this.#isOnFirstPage,
				style: Discord.ButtonStyles.Secondary,
				label: constants.emojis.interactions.menu.controls.back,
			},
			{
				type: Discord.MessageComponentTypes.Button,
				customId: this.#_pageButtons.encodeId(["next"]),
				disabled: this.#isOnLastPage,
				style: Discord.ButtonStyles.Secondary,
				label: constants.emojis.interactions.menu.controls.forward,
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
		this.#pages = toChunked(elements, constants.RESULTS_PER_PAGE);
		this.#showable = showable ?? false;
		this.#index = 0;

		this.#_pageButtons = new InteractionCollector<[action: PageAction]>(client, {
			only: interaction.parameters.show ? [interaction.user.id] : undefined,
		});
		this.anchor = interaction;
	}

	abstract build(page: T[], index: number, { locale }: { locale: Locale }): PageView;

	async #display(): Promise<void> {
		await this.client.reply(this.anchor, { embeds: [this.#view.embed], components: this.#paginationControls });
	}

	async refresh(): Promise<void> {
		const view = this.#view;

		await this.client.editReply(this.anchor, {
			embeds: [view.embed],
			components: [...(view.components ?? []), ...this.#paginationControls],
		});
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

			return { embed: { title: this.#title, description: strings.listEmpty, color: constants.colours.blue } };
		}

		const listingsFormatted = page
			.map((listing, listingIndex) => {
				const indexDisplayed = pageIndex * 10 + (listingIndex + 1);
				const emoji = listingTypeToEmoji[listing.content.type];

				return `${indexDisplayed}. ${emoji} ~ ${listing.content.title}`;
			})
			.join("\n");

		return { embed: { title: this.#title, description: listingsFormatted, color: constants.colours.blue } };
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

			return { embed: { title: this.#title, description: strings.listEmpty, color: constants.colours.blue } };
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

		return { embed: { title: this.#title, description: songsFormatted, color: constants.colours.blue } };
	}
}

class PaginatedRemoveSongListingViewComponent extends PaginatedViewComponent<SongListing> {
	readonly #_selectMenuSelection: InteractionCollector;

	constructor(client: Client, { interaction, listings }: { interaction: Logos.Interaction; listings: SongListing[] }) {
		super(client, { interaction, elements: listings, showable: true });

		this.#_selectMenuSelection = new InteractionCollector(client, { only: [interaction.user.id] });
	}

	#buildSelectMenu(page: SongListing[], pageIndex: number): Discord.ActionRow {
		const options = page.map<Discord.SelectOption>((songListing, index) => ({
			emoji: { name: listingTypeToEmoji[songListing.content.type] },
			label: trim(songListing.content.title, 100),
			value: (pageIndex * constants.RESULTS_PER_PAGE + index).toString(),
		}));

		return {
			type: Discord.MessageComponentTypes.ActionRow,
			components: [
				{
					type: Discord.MessageComponentTypes.SelectMenu,
					customId: this.#_selectMenuSelection.customId,
					minValues: 1,
					maxValues: 1,
					options,
				},
			],
		};
	}

	build(page: SongListing[], pageIndex: number, { locale }: { locale: Locale }): PageView {
		if (page.length === 0) {
			const strings = {
				title: this.client.localise("music.options.remove.strings.queueEmpty.title", locale)(),
				description: this.client.localise("music.options.remove.strings.queueEmpty.description", locale)(),
			};

			return { embed: { title: strings.title, description: strings.description, color: constants.colours.blue } };
		}

		const selectMenu = this.#buildSelectMenu(page, pageIndex);

		const strings = {
			title: this.client.localise("music.options.remove.strings.selectSong.title", locale)(),
			description: this.client.localise("music.options.remove.strings.selectSong.description", locale)(),
		};

		return {
			embed: { title: strings.title, description: strings.description, color: constants.colours.blue },
			components: [selectMenu],
		};
	}

	onCollect(callback: (buttonPress: Logos.Interaction) => Promise<void>): void {
		this.#_selectMenuSelection.onCollect(callback);
	}

	async open(): Promise<void> {
		await super.open();

		this.client.registerInteractionCollector(this.#_selectMenuSelection);
	}

	async close(): Promise<void> {
		await super.close();

		this.#_selectMenuSelection.close();
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
		return { embed: { title: this.#title, description: `*${page}*` } };
	}
}

export {
	PaginatedViewComponent,
	PaginatedSongListingViewComponent,
	PaginatedSongCollectionViewComponent,
	PaginatedRemoveSongListingViewComponent,
	PaginatedSoftwareLicenceViewComponent,
};
