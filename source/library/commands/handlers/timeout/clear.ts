import { mention } from "logos:core/formatting";
import type { Client } from "logos/client";
import { Guild } from "logos/database/guild";

async function handleClearTimeoutAutocomplete(
	client: Client,
	interaction: Logos.Interaction<any, { user: string }>,
): Promise<void> {
	await client.autocompleteMembers(interaction, {
		identifier: interaction.parameters.user,
		options: { restrictToNonSelf: true, excludeModerators: true },
	});
}

async function handleClearTimeout(
	client: Client,
	interaction: Logos.Interaction<any, { user: string }>,
): Promise<void> {
	const guildDocument = await Guild.getOrCreate(client, { guildId: interaction.guildId.toString() });

	const configuration = guildDocument.timeouts;
	if (configuration === undefined) {
		return;
	}

	const member = client.resolveInteractionToMember(interaction, {
		identifier: interaction.parameters.user,
		options: { restrictToNonSelf: true, excludeModerators: true },
	});
	if (member === undefined) {
		return;
	}

	const user = member.user;
	if (user === undefined) {
		return;
	}

	const timedOutUntil = member.communicationDisabledUntil ?? undefined;

	const notTimedOut = timedOutUntil === undefined || timedOutUntil < Date.now();
	if (notTimedOut) {
		const strings = constants.contexts.notTimedOut({
			localise: client.localise.bind(client),
			locale: interaction.locale,
		});
		await client.warning(interaction, {
			title: strings.title,
			description: strings.description({ user_mention: mention(user.id, { type: "user" }) }),
		});

		return;
	}

	const guild = client.entities.guilds.get(interaction.guildId);
	if (guild === undefined) {
		return;
	}

	await client.bot.helpers
		.editMember(interaction.guildId, member.id, { communicationDisabledUntil: null })
		.catch(() => client.log.warn(`Failed to remove timeout of ${client.diagnostics.member(member)}.`));

	await client.tryLog("memberTimeoutRemove", {
		guildId: guild.id,
		journalling: configuration.journaling,
		args: [member, interaction.user],
	});

	const strings = constants.contexts.timeoutCleared({
		localise: client.localise.bind(client),
		locale: interaction.locale,
	});
	await client.success(interaction, {
		title: strings.title,
		description: strings.description({ user_mention: mention(user.id, { type: "user" }) }),
	});
}

export { handleClearTimeout, handleClearTimeoutAutocomplete };
