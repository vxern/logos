import { mention, timestamp, trim } from "logos:core/formatting";
import { Client } from "logos/client";
import { parseTimeExpression } from "logos/commands/interactions";
import { Guild } from "logos/database/guild";

async function handleSetTimeoutAutocomplete(
	client: Client,
	interaction: Logos.Interaction<any, { user: string; duration: string }>,
): Promise<void> {
	if (interaction.parameters.focused === undefined) {
		return;
	}

	switch (interaction.parameters.focused) {
		case "user": {
			await client.autocompleteMembers(interaction, {
				identifier: interaction.parameters.user,
				options: { restrictToNonSelf: true, excludeModerators: true },
			});
			return;
		}
		case "duration": {
			const timestamp = parseTimeExpression(client, interaction, interaction.parameters.duration);
			if (timestamp === undefined) {
				const strings = constants.contexts.autocompleteTimestamp({
					localise: client.localise.bind(client),
					locale: interaction.locale,
				});

				await client.respond(interaction, [{ name: trim(strings.autocomplete, 100), value: "" }]);
				return;
			}

			await client.respond(interaction, [{ name: timestamp[0], value: timestamp[1].toString() }]);
		}
	}
}

async function handleSetTimeout(
	client: Client,
	interaction: Logos.Interaction<any, { user: string; duration: string; reason: string }>,
): Promise<void> {
	const guildDocument = await Guild.getOrCreate(client, { guildId: interaction.guildId.toString() });

	const configuration = guildDocument.timeouts;
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

	let durationParsed = Number(interaction.parameters.duration);
	if (!Number.isSafeInteger(durationParsed)) {
		const timestamp = parseTimeExpression(client, interaction, interaction.parameters.duration);
		if (timestamp === undefined) {
			await displayDurationInvalidError(client, interaction);
			return;
		}

		durationParsed = timestamp[1];
	}

	if (durationParsed < constants.time.minute) {
		await displayTooShortWarning(client, interaction);
		return;
	}

	if (durationParsed > constants.time.week) {
		await displayTooLongWarning(client, interaction);
		return;
	}

	const until = Date.now() + durationParsed;

	const guild = client.entities.guilds.get(interaction.guildId);
	if (guild === undefined) {
		return;
	}

	await client.bot.rest
		.editMember(interaction.guildId, member.id, { communicationDisabledUntil: new Date(until).toISOString() })
		.catch((reason) => client.log.warn(`Failed to time ${client.diagnostics.member(member)} out:`, reason));

	await client.tryLog("memberTimeoutAdd", {
		guildId: guild.id,
		journalling: configuration.journaling,
		args: [member, until, interaction.parameters.reason, interaction.user],
	});

	const strings = constants.contexts.timedOut({ localise: client.localise.bind(client), locale: interaction.locale });
	await client.notice(interaction, {
		title: strings.title,
		description: strings.description({
			user_mention: mention(member.id, { type: "user" }),
			relative_timestamp: timestamp(until, { format: "relative" }),
		}),
	});
}

async function displayDurationInvalidError(client: Client, interaction: Logos.Interaction): Promise<void> {
	const strings = constants.contexts.timeoutDurationInvalid({
		localise: client.localise.bind(client),
		locale: interaction.locale,
	});
	await client.error(interaction, {
		title: strings.title,
		description: strings.description,
	});
}

async function displayTooShortWarning(client: Client, interaction: Logos.Interaction): Promise<void> {
	const strings = constants.contexts.timeoutDurationTooShort({
		localise: client.localise.bind(client),
		locale: interaction.locale,
	});
	await client.warning(interaction, {
		title: strings.title,
		description: strings.description,
	});
}

async function displayTooLongWarning(client: Client, interaction: Logos.Interaction): Promise<void> {
	const strings = constants.contexts.timeoutDurationTooLong({
		localise: client.localise.bind(client),
		locale: interaction.locale,
	});
	await client.warning(interaction, {
		title: strings.title,
		description: strings.description,
	});
}

export { handleSetTimeout, handleSetTimeoutAutocomplete };
