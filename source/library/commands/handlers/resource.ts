import type { Client } from "logos/client";
import { ResourceComposer } from "logos/commands/components/modal-composers/resource-composer";
import { Guild } from "logos/models/guild";
import { Resource } from "logos/models/resource";

async function handleSubmitResource(client: Client, interaction: Logos.Interaction): Promise<void> {
	const guildDocument = await Guild.getOrCreate(client, { guildId: interaction.guildId.toString() });

	const configuration = guildDocument.resourceSubmissions;
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
		await Resource.getAll(client, {
			where: { guildId: interaction.guildId.toString(), authorId: interaction.user.id.toString() },
		}),
		configuration.rateLimit ?? constants.defaults.RESOURCE_RATE_LIMIT,
	);
	if (crossesRateLimit) {
		const strings = constants.contexts.tooManyResources({
			localise: client.localise.bind(client),
			locale: interaction.locale,
		});

		await client.warning(interaction, {
			title: strings.title,
			description: strings.description,
		});

		return;
	}

	const resourceService = client.getPromptService(guild.id, { type: "resources" });
	if (resourceService === undefined) {
		return;
	}

	const composer = new ResourceComposer(client, { interaction });

	composer.onSubmit(async (submission, { formData }) => {
		await client.postponeReply(submission);

		const resourceDocument = await Resource.create(client, {
			guildId: guild.id.toString(),
			authorId: interaction.user.id.toString(),
			formData,
		});

		await client.tryLog("resourceSend", {
			guildId: guild.id,
			journalling: configuration.journaling,
			args: [member, resourceDocument],
		});

		const user = client.entities.users.get(interaction.user.id);
		if (user === undefined) {
			return;
		}

		const prompt = await resourceService.savePrompt(user, resourceDocument);
		if (prompt === undefined) {
			return;
		}

		const strings = constants.contexts.resourceSent({
			localise: client.localise.bind(client),
			locale: interaction.locale,
		});

		await client.succeeded(submission, {
			title: strings.title,
			description: strings.description,
		});
	});

	await composer.open();
}

export { handleSubmitResource };
