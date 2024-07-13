import type { Client } from "logos/client";
import { SuggestionComposer } from "logos/commands/components/modal-composers/suggestion-composer";
import { Guild } from "logos/models/guild";
import { Suggestion } from "logos/models/suggestion";

async function handleMakeSuggestion(client: Client, interaction: Logos.Interaction): Promise<void> {
	const guildDocument = await Guild.getOrCreate(client, { guildId: interaction.guildId.toString() });

	const configuration = guildDocument.suggestions;
	if (configuration === undefined) {
		return;
	}

	const guild = client.entities.guilds.get(interaction.guildId);
	if (guild === undefined) {
		return;
	}

	const member = interaction.member;
	if (member === undefined) {
		return;
	}

	const crossesRateLimit = Guild.crossesRateLimit(
		await Suggestion.getAll(client, {
			where: { guildId: interaction.guildId.toString(), authorId: interaction.user.id.toString() },
		}),
		configuration.rateLimit ?? constants.defaults.SUGGESTION_RATE_LIMIT,
	);
	if (crossesRateLimit) {
		const strings = constants.contexts.tooManySuggestions({
			localise: client.localise,
			locale: interaction.locale,
		});
		await client.pushback(interaction, {
			title: strings.title,
			description: strings.description,
		});
		return;
	}

	const suggestionService = client.getPromptService(guild.id, { type: "suggestions" });
	if (suggestionService === undefined) {
		return;
	}

	const composer = new SuggestionComposer(client, { interaction });

	composer.onSubmit(async (submission, { formData }) => {
		await client.postponeReply(submission);

		const suggestionDocument = await Suggestion.create(client, {
			guildId: guild.id.toString(),
			authorId: interaction.user.id.toString(),
			formData,
		});

		await client.tryLog("suggestionSend", {
			guildId: guild.id,
			journalling: configuration.journaling,
			args: [member, suggestionDocument],
		});

		const user = client.entities.users.get(interaction.user.id);
		if (user === undefined) {
			return;
		}

		const prompt = await suggestionService.savePrompt(user, suggestionDocument);
		if (prompt === undefined) {
			return;
		}

		suggestionService.registerDocument(suggestionDocument);
		suggestionService.registerPrompt(prompt, interaction.user.id, suggestionDocument);
		suggestionService.registerHandler(suggestionDocument);

		const strings = constants.contexts.suggestionSent({ localise: client.localise, locale: interaction.locale });
		await client.succeeded(submission, {
			title: strings.title,
			description: strings.description,
		});
	});

	await composer.open();
}

export { handleMakeSuggestion };
