import { Client } from "logos/client";
import { PaginatedView, View } from "logos/commands/components/paginated-views/paginated-view";
import { SongListing } from "logos/services/music";

class SongListingView extends PaginatedView<SongListing> {
	readonly #title: string;

	constructor(
		client: Client,
		{ interaction, title, listings }: { interaction: Logos.Interaction; title: string; listings: SongListing[] },
	) {
		super(client, { interaction, elements: listings, showable: true });

		this.#title = title;
	}

	build(interaction: Logos.Interaction, page: SongListing[], pageIndex: number): View {
		if (page.length === 0) {
			const strings = {
				listEmpty: this.client.localise("music.strings.listEmpty", interaction.locale)(),
			};

			return { embed: { title: this.#title, description: strings.listEmpty, color: constants.colours.notice } };
		}

		const listingsFormatted = page
			.map((listing, listingIndex) => {
				const indexDisplayed = pageIndex * 10 + (listingIndex + 1);

				return `${indexDisplayed}. ${listing.queueable.emoji} ~ ${listing.queueable.title}`;
			})
			.join("\n");

		return { embed: { title: this.#title, description: listingsFormatted, color: constants.colours.notice } };
	}
}

export { SongListingView };
