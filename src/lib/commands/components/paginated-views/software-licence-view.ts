import { Locale } from "logos:constants/languages/localisation";
import { Client } from "logos/client";
import { Page, PaginatedView } from "logos/commands/components/paginated-views/paginated-view";

class SoftwareLicenceView extends PaginatedView<string> {
	readonly #title: string;

	constructor(
		client: Client,
		{ interaction, title, sections }: { interaction: Logos.Interaction; title: string; sections: string[] },
	) {
		super(client, { interaction, elements: sections });

		this.#title = title;
	}

	build(page: string[], _: number, { locale: __ }: { locale: Locale }): Page {
		return { embed: { title: this.#title, description: `*${page}*` } };
	}
}

export { SoftwareLicenceView };
