import { mention } from "logos:core/formatting";
import type { Client } from "logos/client";
import { Guild } from "logos/models/guild";
import { Praise } from "logos/models/praise";

async function handlePraiseUserAutocomplete(
	client: Client,
	interaction: Logos.Interaction<any, { user: string }>,
): Promise<void> {
	await client.autocompleteMembers(interaction, { identifier: interaction.parameters.user });
}

async function handlePraiseUser(
	client: Client,
	interaction: Logos.Interaction<any, { user: string; comment: string | undefined }>,
): Promise<void> {
	const guildDocument = await Guild.getOrCreate(client, { guildId: interaction.guildId.toString() });

	const configuration = guildDocument.praises;
	if (configuration === undefined) {
		return;
	}

	const member = client.resolveInteractionToMember(interaction, { identifier: interaction.parameters.user });
	if (member === undefined) {
		return;
	}

	if (member.id === interaction.member?.id) {
		const strings = constants.contexts.cannotPraiseSelf({ localise: client.localise, locale: interaction.locale });
		await client.warning(interaction, {
			title: strings.title,
			description: strings.description,
		});
		return;
	}

	await client.postponeReply(interaction);

	const crossesRateLimit = Guild.crossesRateLimit(
		await Praise.getAll(client, {
			where: { guildId: interaction.guildId.toString(), authorId: interaction.user.id.toString() },
		}),
		configuration.rateLimit ?? constants.defaults.PRAISE_RATE_LIMIT,
	);
	if (crossesRateLimit) {
		const strings = constants.contexts.tooManyPraises({ localise: client.localise, locale: interaction.locale });
		await client.pushedBack(interaction, {
			title: strings.title,
			description: strings.description,
		});
		return;
	}

	const guild = client.entities.guilds.get(interaction.guildId);
	if (guild === undefined) {
		return;
	}

	const praiseDocument = await Praise.create(client, {
		guildId: interaction.guildId.toString(),
		authorId: interaction.user.id.toString(),
		targetId: member.id.toString(),
		comment: interaction.parameters.comment,
	});

	await client.tryLog("praiseAdd", {
		guildId: guild.id,
		journalling: configuration.journaling,
		args: [member, praiseDocument, interaction.user],
	});

	const strings = constants.contexts.praised({ localise: client.localise, locale: interaction.locale });
	await client.succeeded(interaction, {
		title: strings.title,
		description: strings.description({ user_mention: mention(member.id, { type: "user" }) }),
	});
}

export { handlePraiseUser, handlePraiseUserAutocomplete };
