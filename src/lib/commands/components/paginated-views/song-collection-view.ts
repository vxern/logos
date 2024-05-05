import { trim } from "logos:core/formatting";
import { Client } from "logos/client";
import { PaginatedView, View } from "logos/commands/components/paginated-views/paginated-view";
import { Song, SongCollection } from "logos/services/music";

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

	build(interaction: Logos.Interaction, page: Song[], pageIndex: number): View {
		if (page.length === 0) {
			const strings = constants.contexts.listEmpty({ localise: this.client.localise, locale: interaction.locale });
			return { embed: { title: this.#title, description: strings.listEmpty, color: constants.colours.notice } };
		}

		const songsFormatted = page
			.map((song, songIndex) => {
				const isCurrent = pageIndex * 10 + songIndex === this.#collection.index;

				const titleFormatted = trim(
					song.title.replaceAll("(", "❨").replaceAll(")", "❩").replaceAll("[", "⁅").replaceAll("]", "⁆"),
					50,
				);
				const titleHyperlink = `[${titleFormatted}](${song.url})`;
				const titleHighlighted = isCurrent ? `**${titleHyperlink}**` : titleHyperlink;

				return `${pageIndex * 10 + (songIndex + 1)}. ${titleHighlighted}`;
			})
			.join("\n");

		return { embed: { title: this.#title, description: songsFormatted, color: constants.colours.notice } };
	}
}

export { SongCollectionView };
