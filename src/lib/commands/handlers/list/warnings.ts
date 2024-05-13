import { timestamp } from "logos:core/formatting";
import { Client } from "logos/client";
import { getRuleTitleFormatted } from "logos/commands/rules";
import { Warning } from "logos/database/warning";

async function handleDisplayWarningsAutocomplete(
	client: Client,
	interaction: Logos.Interaction<any, { user: string | undefined }>,
): Promise<void> {
	if (interaction.parameters.user === undefined) {
		return;
	}

	const permissions = interaction.member?.permissions;
	if (permissions === undefined) {
		return;
	}

	const isModerator = permissions.has("MODERATE_MEMBERS");

	await client.autocompleteMembers(interaction, {
		identifier: interaction.parameters.user,
		options: {
			// Stops normal members from viewing other people's warnings.
			restrictToSelf: !isModerator,
		},
	});
}

async function handleDisplayWarnings(
	client: Client,
	interaction: Logos.Interaction<any, { user: string | undefined }>,
): Promise<void> {
	const permissions = interaction.member?.permissions;
	if (permissions === undefined) {
		return;
	}

	const isModerator = permissions.has("MODERATE_MEMBERS");

	const member = client.resolveInteractionToMember(interaction, {
		identifier: interaction.parameters.user ?? interaction.user.id.toString(),
		options: {
			// Stops normal members from viewing other people's warnings.
			restrictToSelf: !isModerator,
		},
	});
	if (member === undefined) {
		return;
	}

	const isSelf = member.id === interaction.user.id;

	const warningDocuments = await Warning.getAll(client, { where: { guildId: interaction.guildId.toString(), targetId: member.id.toString() } });

	await client.notice(interaction, getWarningPage(client, interaction, warningDocuments, isSelf));
}

function getWarningPage(
	client: Client,
	interaction: Logos.Interaction,
	warnings: Warning[],
	isSelf: boolean,
): Discord.CamelizedDiscordEmbed {
	if (warnings.length === 0) {
		if (isSelf) {
			const strings = constants.contexts.noWarningsForSelf({
				localise: client.localise.bind(client),
				locale: interaction.locale,
			});

			return {
				title: strings.title,
				description: strings.description,
			};
		}

		const strings = constants.contexts.noWarningsForOther({
			localise: client.localise.bind(client),
			locale: interaction.locale,
		});

		return {
			title: strings.title,
			description: strings.description,
		};
	}

	const strings = constants.contexts.warnings({ localise: client.localise.bind(client), locale: interaction.locale });

	return {
		title: strings.title,
		fields: warnings.map((warning, index) => {
			const warningString = strings.warning({
				index: index + 1,
				relative_timestamp: timestamp(warning.createdAt, { format: "relative" }),
			});

			const ruleTitle = getRuleTitleFormatted(client, interaction, {
				rule: warning.rule ?? "other",
				mode: "option",
			});

			return { name: warningString, value: `${ruleTitle}\n> *${warning.reason}*` };
		}),
	};
}

export { getWarningPage, handleDisplayWarnings, handleDisplayWarningsAutocomplete };
