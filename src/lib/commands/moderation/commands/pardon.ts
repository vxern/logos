import { Locale } from "logos:constants/languages";
import { mention } from "logos:core/formatting";
import { Client } from "logos/client";
import { Guild, timeStructToMilliseconds } from "logos/database/guild";
import { Warning } from "logos/database/warning";

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
			await client.autocompleteMembers(interaction, {
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
				await client.respond(interaction, []);
				return;
			}

			const warningDocumentsActive = await Warning.getActiveWarnings(client, {
				timeRangeMilliseconds: timeStructToMilliseconds(configuration.expiration ?? constants.defaults.WARN_EXPIRY),
			});

			const warningLowercase = interaction.parameters.warning.toLowerCase();
			const choices = warningDocumentsActive
				.map<Discord.ApplicationCommandOptionChoice>((warning) => ({
					name: warning.reason,
					value: warning.partialId,
				}))
				.filter((choice) => choice.name.toLowerCase().includes(warningLowercase));

			await client.respond(interaction, choices);
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

	const warningDocumentsActive = await Warning.getActiveWarnings(client, {
		timeRangeMilliseconds: timeStructToMilliseconds(configuration.expiration ?? constants.defaults.WARN_EXPIRY),
	});

	// TODO(vxern): Fetch the document directly.
	const warningDocument = warningDocumentsActive.find(
		(warningDocument) => warningDocument.partialId === interaction.parameters.warning,
	);
	if (warningDocument === undefined) {
		await displayInvalidWarningError(client, interaction, { locale });
		return;
	}

	await warningDocument.delete(client);

	const guild = client.entities.guilds.get(guildId);
	if (guild === undefined) {
		return;
	}

	await client.tryLog("memberWarnRemove", {
		guildId: guild.id,
		journalling: configuration.journaling,
		args: [member, warningDocument, interaction.user],
	});

	const strings = {
		title: client.localise("pardon.strings.pardoned.title", locale)(),
		description: client.localise(
			"pardon.strings.pardoned.description",
			locale,
		)({
			user_mention: mention(member.id, { type: "user" }),
			reason: warningDocument.reason,
		}),
	};

	await client.reply(interaction, {
		embeds: [
			{
				title: strings.title,
				description: strings.description,
				color: constants.colours.lightGreen,
			},
		],
	});
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

	await client.reply(interaction, {
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
