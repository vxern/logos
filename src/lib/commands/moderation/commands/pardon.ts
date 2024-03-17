import { Locale } from "../../../../constants/languages";
import { mention } from "../../../../formatting";
import { Client } from "../../../client";
import { Guild, timeStructToMilliseconds } from "../../../database/guild";
import { Warning } from "../../../database/warning";
import { getActiveWarnings } from "../module";

async function handlePardonUserAutocomplete(
	client: Client,
	interaction: Logos.Interaction<any, { user: string; warning: string }>,
): Promise<void> {
	const locale = interaction.locale;

	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return;
	}

	const guildDocument = await Guild.getOrCreate(client, { guildId: guildId.toString() });

	const configuration = guildDocument.warns;
	if (configuration === undefined) {
		return;
	}

	if (interaction.parameters.focused === undefined) {
		return;
	}

	switch (interaction.parameters.focused) {
		case "user": {
			client.autocompleteMembers(interaction, {
				identifier: interaction.parameters.user,
				options: {
					restrictToNonSelf: true,
					excludeModerators: true,
				},
			});
			break;
		}
		case "warning": {
			const member = client.resolveInteractionToMember(
				interaction,
				{
					identifier: interaction.parameters.user,
					options: {
						restrictToNonSelf: true,
						excludeModerators: true,
					},
				},
				{ locale },
			);
			if (member === undefined) {
				client.respond(interaction, []);
				return;
			}

			const expiryMilliseconds = timeStructToMilliseconds(configuration.expiration ?? constants.defaults.WARN_EXPIRY);

			const relevantWarnings = await getRelevantWarnings(client, member, expiryMilliseconds);
			if (relevantWarnings === undefined) {
				client.respond(interaction, []);
				return;
			}

			const warningLowercase = interaction.parameters.warning.toLowerCase();
			const choices = relevantWarnings
				.map<Discord.ApplicationCommandOptionChoice>((warning) => ({
					name: warning.reason,
					value: warning.partialId,
				}))
				.filter((choice) => choice.name.toLowerCase().includes(warningLowercase));

			client.respond(interaction, choices);
			break;
		}
	}
}

async function handlePardonUser(
	client: Client,
	interaction: Logos.Interaction<any, { user: string; warning: string }>,
): Promise<void> {
	const locale = interaction.locale;

	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return;
	}

	const guildDocument = await Guild.getOrCreate(client, { guildId: guildId.toString() });

	const configuration = guildDocument.warns;
	if (configuration === undefined) {
		return;
	}

	const member = client.resolveInteractionToMember(
		interaction,
		{
			identifier: interaction.parameters.user,
			options: {
				restrictToNonSelf: true,
				excludeModerators: true,
			},
		},
		{ locale },
	);
	if (member === undefined) {
		return;
	}

	const expiryMilliseconds = timeStructToMilliseconds(configuration.expiration ?? constants.defaults.WARN_EXPIRY);

	const relevantWarnings = await getRelevantWarnings(client, member, expiryMilliseconds);
	if (relevantWarnings === undefined) {
		displayFailedError(client, interaction, { locale });
		return;
	}

	const warning = relevantWarnings.find(
		(relevantWarning) => relevantWarning.partialId === interaction.parameters.warning,
	);
	if (warning === undefined) {
		displayInvalidWarningError(client, interaction, { locale });
		return;
	}

	await warning.delete(client);

	const guild = client.entities.guilds.get(guildId);
	if (guild === undefined) {
		return;
	}

	client.tryLog("memberWarnRemove", {
		guildId: guild.id,
		journalling: configuration.journaling,
		args: [member, warning, interaction.user],
	});

	const strings = {
		title: client.localise("pardon.strings.pardoned.title", locale)(),
		description: client.localise(
			"pardon.strings.pardoned.description",
			locale,
		)({
			user_mention: mention(member.id, { type: "user" }),
			reason: warning.reason,
		}),
	};

	client.reply(interaction, {
		embeds: [
			{
				title: strings.title,
				description: strings.description,
				color: constants.colours.lightGreen,
			},
		],
	});
}

async function getRelevantWarnings(
	client: Client,
	member: Logos.Member,
	expirationMilliseconds: number,
): Promise<Warning[] | undefined> {
	const warningDocuments = await Warning.getAll(client, { where: { targetId: member.id.toString() } });

	const relevantWarnings = getActiveWarnings(warningDocuments, expirationMilliseconds).reverse();
	return relevantWarnings;
}

async function displayInvalidWarningError(
	client: Client,
	interaction: Logos.Interaction,
	{ locale }: { locale: Locale },
): Promise<void> {
	const strings = {
		title: client.localise("pardon.strings.invalidWarning.title", locale)(),
		description: client.localise("pardon.strings.invalidWarning.description", locale)(),
	};

	client.reply(interaction, {
		embeds: [
			{
				title: strings.title,
				description: strings.description,
				color: constants.colours.red,
			},
		],
	});
}

async function displayFailedError(
	client: Client,
	interaction: Logos.Interaction,
	{ locale }: { locale: Locale },
): Promise<void> {
	const strings = {
		title: client.localise("pardon.strings.failed.title", locale)(),
		description: client.localise("pardon.strings.failed.description", locale)(),
	};

	client.reply(interaction, {
		embeds: [
			{
				title: strings.title,
				description: strings.description,
				color: constants.colours.red,
			},
		],
	});
}

export { handlePardonUser, handlePardonUserAutocomplete };
