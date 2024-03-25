import { Locale } from "logos:constants/languages/localisation";
import { Song, SongCollection } from "logos:constants/music";
import { trim } from "logos:core/formatting";
import { Client } from "logos/client";
import { Page, PaginatedView } from "logos/commands/components/paginated-views/paginated-view";

class SongCollectionView extends PaginatedView<Song> {
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

	build(page: Song[], pageIndex: number, { locale }: { locale: Locale }): Page {
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

export { SongCollectionView };
