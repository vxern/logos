import { trim } from "logos:constants/formatting";
import type { Client } from "logos/client";
import { parseTimeExpression } from "logos/commands/interactions";

async function handleAutocompleteTimestamp(
	client: Client,
	interaction: Logos.Interaction<any, { timestamp: string }>,
): Promise<void> {
	const timestamp = parseTimeExpression(client, interaction, interaction.parameters.timestamp);
	if (timestamp === undefined) {
		const strings = constants.contexts.autocompleteTimestamp({
			localise: client.localise,
			locale: interaction.locale,
		});
		client.respond(interaction, [{ name: trim(strings.autocomplete, 100), value: "" }]).ignore();

		return;
	}

	client.respond(interaction, [{ name: timestamp[0], value: timestamp[1].toString() }]).ignore();
}

export { handleAutocompleteTimestamp };
