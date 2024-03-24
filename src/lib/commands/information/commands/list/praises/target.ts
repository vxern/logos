import { Client } from "logos/client";
import { getPraisePage } from "logos/commands/information/commands/list/praises";
import { Praise } from "logos/database/praise";

async function handleDisplayPraisesByTargetAutocomplete(
	client: Client,
	interaction: Logos.Interaction<any, { user: string | undefined }>,
): Promise<void> {
	if (interaction.parameters.user === undefined) {
		return;
	}

	await client.autocompleteMembers(interaction, { identifier: interaction.parameters.user });
}

async function handleDisplayPraisesByTarget(
	client: Client,
	interaction: Logos.Interaction<any, { user: string | undefined }>,
): Promise<void> {
	const locale = interaction.locale;

	const member = client.resolveInteractionToMember(
		interaction,
		{ identifier: interaction.parameters.user ?? interaction.user.id.toString() },
		{ locale },
	);
	if (member === undefined) {
		return;
	}

	const user = member.user;
	if (user === undefined) {
		return;
	}

	const isSelf = member.id === interaction.user.id;

	const praiseDocuments = await Praise.getAll(client, { where: { targetId: member.id.toString() } });

	await client.reply(interaction, {
		embeds: [getPraisePage(client, praiseDocuments, isSelf, "target", { locale })],
	});
}

export { handleDisplayPraisesByTarget, handleDisplayPraisesByTargetAutocomplete };
