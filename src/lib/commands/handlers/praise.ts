import { mention } from "logos:core/formatting";
import { Client } from "logos/client";
import { Guild } from "logos/database/guild";
import { Praise } from "logos/database/praise";

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
	const locale = interaction.locale;

	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return;
	}

	const guildDocument = await Guild.getOrCreate(client, { guildId: guildId.toString() });

	const configuration = guildDocument.praises;
	if (configuration === undefined) {
		return;
	}

	const member = client.resolveInteractionToMember(
		interaction,
		{ identifier: interaction.parameters.user },
		{ locale },
	);
	if (member === undefined) {
		return;
	}

	if (member.id === interaction.member?.id) {
		const strings = {
			title: client.localise("praise.strings.cannotPraiseSelf.title", locale)(),
			description: client.localise("praise.strings.cannotPraiseSelf.description", locale)(),
		};

		await client.warning(interaction, {
			title: strings.title,
			description: strings.description,
		});

		return;
	}

	await client.postponeReply(interaction);

	const crossesRateLimit = Guild.crossesRateLimit(
		await Praise.getAll(client, { where: { authorId: interaction.user.id.toString() } }),
		configuration.rateLimit ?? constants.defaults.PRAISE_RATE_LIMIT,
	);
	if (crossesRateLimit) {
		const strings = {
			title: client.localise("praise.strings.tooMany.title", locale)(),
			description: client.localise("praise.strings.tooMany.description", locale)(),
		};

		await client.pushedBack(interaction, {
			title: strings.title,
			description: strings.description,
		});

		return;
	}

	const guild = client.entities.guilds.get(guildId);
	if (guild === undefined) {
		return;
	}

	const praiseDocument = await Praise.create(client, {
		guildId: guildId.toString(),
		authorId: interaction.user.id.toString(),
		targetId: member.id.toString(),
		comment: interaction.parameters.comment,
	});

	await client.tryLog("praiseAdd", {
		guildId: guild.id,
		journalling: configuration.journaling,
		args: [member, praiseDocument, interaction.user],
	});

	const strings = {
		title: client.localise("praise.strings.praised.title", locale)(),
		description: client.localise(
			"praise.strings.praised.description",
			locale,
		)({ user_mention: mention(member.id, { type: "user" }) }),
	};

	await client.succeeded(interaction, {
		title: strings.title,
		description: strings.description,
	});
}

export { handlePraiseUser, handlePraiseUserAutocomplete };
