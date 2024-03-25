import { getEmojiBySongListingType } from "logos:constants/emojis";
import { Locale } from "logos:constants/languages/localisation";
import { SongListing } from "logos:constants/music";
import { Client } from "logos/client";
import { Page, PaginatedView } from "logos/commands/components/paginated-views/paginated-view";

class SongListingView extends PaginatedView<SongListing> {
	readonly #title: string;

	constructor(
		client: Client,
		{ interaction, title, listings }: { interaction: Logos.Interaction; title: string; listings: SongListing[] },
	) {
		super(client, { interaction, elements: listings, showable: true });

		this.#title = title;
	}

	build(page: SongListing[], pageIndex: number, { locale }: { locale: Locale }): Page {
		if (page.length === 0) {
			const strings = {
				listEmpty: this.client.localise("music.strings.listEmpty", locale)(),
			};

			return { embed: { title: this.#title, description: strings.listEmpty, color: constants.colours.blue } };
		}

		const listingsFormatted = page
			.map((listing, listingIndex) => {
				const indexDisplayed = pageIndex * 10 + (listingIndex + 1);
				const emoji = getEmojiBySongListingType(listing.content.type);

				return `${indexDisplayed}. ${emoji} ~ ${listing.content.title}`;
			})
			.join("\n");

		return { embed: { title: this.#title, description: listingsFormatted, color: constants.colours.blue } };
	}
}

export { SongListingView };
