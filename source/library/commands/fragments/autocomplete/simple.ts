import type { Client } from "logos/client.ts";

async function handleSimpleAutocomplete<T>(
	client: Client,
	interaction: Logos.Interaction,
	{
		query,
		elements,
		getOption,
	}: { query: string; elements: T[]; getOption: (element: T) => Discord.ApplicationCommandOptionChoice },
): Promise<void> {
	const queryLowercase = query.trim().toLowerCase();
	const choices = elements
		.map((element) => getOption(element))
		.filter((choice) => choice.name.toLowerCase().includes(queryLowercase));

	await client.respond(interaction, choices);
}

export { handleSimpleAutocomplete };
