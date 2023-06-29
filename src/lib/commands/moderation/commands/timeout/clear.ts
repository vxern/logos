import { Bot, editMember, Interaction } from "discordeno";
import { logEvent } from "../../../../controllers/logging/logging.js";
import { autocompleteMembers, Client, localise, resolveInteractionToMember } from "../../../../client.js";
import { parseArguments, reply } from "../../../../interactions.js";
import { diagnosticMentionUser } from "../../../../utils.js";
import constants from "../../../../../constants.js";

async function handleClearTimeoutAutocomplete([client, bot]: [Client, Bot], interaction: Interaction): Promise<void> {
	const [{ user }] = parseArguments(interaction.data?.options, {});

	autocompleteMembers([client, bot], interaction, user!, { restrictToNonSelf: true, excludeModerators: true });
}

async function handleClearTimeout([client, bot]: [Client, Bot], interaction: Interaction): Promise<void> {
	const [{ user }] = parseArguments(interaction.data?.options, {});
	if (user === undefined) {
		return;
	}

	const member = resolveInteractionToMember([client, bot], interaction, user, {
		restrictToNonSelf: true,
		excludeModerators: true,
	});
	if (member === undefined) {
		return;
	}

	const timedOutUntil = member.communicationDisabledUntil ?? undefined;

	const notTimedOut = timedOutUntil === undefined || timedOutUntil < Date.now();

	if (notTimedOut) {
		const strings = {
			title: localise(client, "timeout.strings.notTimedOut.title", interaction.locale)(),
			description: localise(
				client,
				"timeout.strings.notTimedOut.description",
				interaction.locale,
			)({ user_mention: diagnosticMentionUser(member.user!) }),
		};

		reply([client, bot], interaction, {
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

	const guild = client.cache.guilds.get(interaction.guildId!);
	if (guild === undefined) {
		return;
	}

	await editMember(bot, interaction.guildId!, member.id, { communicationDisabledUntil: null }).catch(() =>
		client.log.warn(`Failed to remove timeout of member with ID ${member.id}`),
	);

	logEvent([client, bot], guild, "memberTimeoutRemove", [member, interaction.user]);

	const strings = {
		title: localise(client, "timeout.strings.timeoutCleared.title", interaction.locale)(),
		description: localise(
			client,
			"timeout.strings.timeoutCleared.description",
			interaction.locale,
		)({ user_mention: diagnosticMentionUser(member.user!) }),
	};

	reply([client, bot], interaction, {
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
