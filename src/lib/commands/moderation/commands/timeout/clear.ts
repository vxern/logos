import diagnostics from "../../../../../diagnostics";
import { mention } from "../../../../../formatting";
import { Client } from "../../../../client";
import { Guild } from "../../../../database/guild";

async function handleClearTimeoutAutocomplete(
	client: Client,
	interaction: Logos.Interaction<any, { user: string }>,
): Promise<void> {
	client.autocompleteMembers(interaction, {
		identifier: interaction.parameters.user,
		options: { restrictToNonSelf: true, excludeModerators: true },
	});
}

async function handleClearTimeout(
	client: Client,
	interaction: Logos.Interaction<any, { user: string }>,
): Promise<void> {
	const locale = interaction.locale;

	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return;
	}

	const guildDocument = await Guild.getOrCreate(client, { guildId: guildId.toString() });

	const configuration = guildDocument.timeouts;
	if (configuration === undefined) {
		return;
	}

	const member = client.resolveInteractionToMember(
		interaction,
		{
			identifier: interaction.parameters.user,
			options: { restrictToNonSelf: true, excludeModerators: true },
		},
		{ locale },
	);
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
		const strings = {
			title: client.localise("timeout.strings.notTimedOut.title", locale)(),
			description: client.localise(
				"timeout.strings.notTimedOut.description",
				locale,
			)({ user_mention: mention(user.id, { type: "user" }) }),
		};

		client.reply(interaction, {
			embeds: [
				{
					title: strings.title,
					description: strings.description,
					color: constants.colors.dullYellow,
				},
			],
		});
		return;
	}

	const guild = client.entities.guilds.get(guildId);
	if (guild === undefined) {
		return;
	}

	await client.bot.rest
		.editMember(guildId, member.id, { communicationDisabledUntil: null })
		.catch(() => client.log.warn(`Failed to remove timeout of ${diagnostics.display.member(member)}.`));

	client.tryLog("memberTimeoutRemove", {
		guildId: guild.id,
		args: [member, interaction.user],
	});

	const strings = {
		title: client.localise("timeout.strings.timeoutCleared.title", locale)(),
		description: client.localise(
			"timeout.strings.timeoutCleared.description",
			locale,
		)({ user_mention: mention(user.id, { type: "user" }) }),
	};

	client.reply(interaction, {
		embeds: [
			{
				title: strings.title,
				description: strings.description,
				color: constants.colors.lightGreen,
			},
		],
	});
}

export { handleClearTimeout, handleClearTimeoutAutocomplete };
