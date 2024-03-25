import { Client } from "logos/client";
import { ResourceComposer } from "logos/commands/components/modal-composers/resource-composer";
import { Guild } from "logos/database/guild";
import { Resource } from "logos/database/resource";

async function handleSubmitResource(client: Client, interaction: Logos.Interaction): Promise<void> {
	const locale = interaction.locale;

	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return;
	}

	const guildDocument = await Guild.getOrCreate(client, { guildId: guildId.toString() });

	const configuration = guildDocument.resourceSubmissions;
	if (configuration === undefined) {
		return;
	}

	const guild = client.entities.guilds.get(guildId);
	if (guild === undefined) {
		return;
	}

	const member = interaction.member;
	if (member === undefined) {
		return;
	}

	const crossesRateLimit = Guild.crossesRateLimit(
		await Resource.getAll(client, { where: { authorId: interaction.user.id.toString() } }),
		configuration.rateLimit ?? constants.defaults.RESOURCE_RATE_LIMIT,
	);
	if (!crossesRateLimit) {
		const strings = {
			title: client.localise("resource.strings.tooMany.title", locale)(),
			description: client.localise("resource.strings.tooMany.description", locale)(),
		};

		client.reply(interaction, {
			embeds: [
				{
					title: strings.title,
					description: strings.description,
					color: constants.colours.dullYellow,
				},
			],
		});
		return;
	}

	const resourceService = client.getPromptService(guild.id, { type: "resources" });
	if (resourceService === undefined) {
		return;
	}

	const composer = new ResourceComposer(client, { interaction });

	composer.onSubmit(async (submission, { locale }, { formData }) => {
		await client.postponeReply(submission);

		const resourceDocument = await Resource.create(client, {
			guildId: guild.id.toString(),
			authorId: interaction.user.id.toString(),
			answers: formData,
		});

		client.tryLog("resourceSend", {
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

		resourceService.registerDocument(resourceDocument);
		resourceService.registerPrompt(prompt, interaction.user.id, resourceDocument);
		resourceService.registerHandler(resourceDocument);

		const strings = {
			title: client.localise("resource.strings.sent.title", locale)(),
			description: client.localise("resource.strings.sent.description", locale)(),
		};

		client.editReply(submission, {
			embeds: [
				{
					title: strings.title,
					description: strings.description,
					color: constants.colours.lightGreen,
				},
			],
		});
	});
}

export { handleSubmitResource };
