import { timeStructToMilliseconds } from "logos:constants/time";
import { mention } from "logos:core/formatting";
import type { Client } from "logos/client";
import { Guild } from "logos/models/guild";
import { Warning } from "logos/models/warning";

async function handlePardonUserAutocomplete(
	client: Client,
	interaction: Logos.Interaction<any, { user: string; warning: string }>,
): Promise<void> {
	const guildDocument = await Guild.getOrCreate(client, { guildId: interaction.guildId.toString() });

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
			const member = client.resolveInteractionToMember(interaction, {
				identifier: interaction.parameters.user,
				options: {
					restrictToNonSelf: true,
					excludeModerators: true,
				},
			});
			if (member === undefined) {
				await client.respond(interaction, []);
				return;
			}

			const warningDocumentsActive = await Warning.getActiveWarnings(client, {
				guildId: interaction.guildId.toString(),
				targetId: member.id.toString(),
				timeRangeMilliseconds: timeStructToMilliseconds(
					configuration.expiration ?? constants.defaults.WARN_EXPIRY,
				),
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
	const guildDocument = await Guild.getOrCreate(client, { guildId: interaction.guildId.toString() });

	const configuration = guildDocument.warns;
	if (configuration === undefined) {
		return;
	}

	const member = client.resolveInteractionToMember(interaction, {
		identifier: interaction.parameters.user,
		options: {
			restrictToNonSelf: true,
			excludeModerators: true,
		},
	});
	if (member === undefined) {
		return;
	}

	const warningDocumentsActive = await Warning.getActiveWarnings(client, {
		guildId: interaction.guildId.toString(),
		targetId: member.id.toString(),
		timeRangeMilliseconds: timeStructToMilliseconds(configuration.expiration ?? constants.defaults.WARN_EXPIRY),
	});

	const warningDocument = warningDocumentsActive.find(
		(warningDocument) => warningDocument.partialId === interaction.parameters.warning,
	);
	if (warningDocument === undefined) {
		await displayInvalidWarningError(client, interaction);
		return;
	}

	await warningDocument.delete(client);

	const guild = client.entities.guilds.get(interaction.guildId);
	if (guild === undefined) {
		return;
	}

	await client.tryLog("memberWarnRemove", {
		guildId: guild.id,
		journalling: configuration.journaling,
		args: [member, warningDocument, interaction.user],
	});

	const strings = constants.contexts.pardoned({ localise: client.localise.bind(client), locale: interaction.locale });
	await client.success(interaction, {
		title: strings.title,
		description: strings.description({
			user_mention: mention(member.id, { type: "user" }),
			reason: warningDocument.reason,
		}),
	});
}

async function displayInvalidWarningError(client: Client, interaction: Logos.Interaction): Promise<void> {
	const strings = constants.contexts.invalidWarning({
		localise: client.localise.bind(client),
		locale: interaction.locale,
	});
	await client.error(interaction, {
		title: strings.title,
		description: strings.description,
	});
}

export { handlePardonUser, handlePardonUserAutocomplete };
