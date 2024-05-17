import { Client } from "logos/client";
import { PaginatedView, View } from "logos/commands/components/paginated-views/paginated-view";

class SoftwareLicenceView extends PaginatedView<string> {
	readonly #title: string;

	constructor(
		client: Client,
		{ interaction, title, sections }: { interaction: Logos.Interaction; title: string; sections: string[] },
	) {
		super(client, { interaction, elements: sections, entriesPerPage: 1 });

		this.#title = title;
	}

	build(_interaction: Logos.Interaction, page: string[], _: number): View {
		return { embed: { title: this.#title, description: `*${page.at(0)}*` } };
	}
}

export { SoftwareLicenceView };
