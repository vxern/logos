import type { Client } from "logos/client";
import { getPraisePage } from "logos/commands/praises";
import { Praise } from "logos/database/praise";

async function handleDisplayPraisesAutocomplete(
	client: Client,
	interaction: Logos.Interaction<any, { user: string | undefined }>,
): Promise<void> {
	if (interaction.parameters.user === undefined) {
		return;
	}

	await client.autocompleteMembers(interaction, { identifier: interaction.parameters.user });
}

async function handleDisplayAuthorPraises(client: Client, interaction: Logos.Interaction): Promise<void> {
	await handleDisplayPraises(client, interaction, { mode: "author" });
}

async function handleDisplayTargetPraises(client: Client, interaction: Logos.Interaction): Promise<void> {
	await handleDisplayPraises(client, interaction, { mode: "target" });
}

type PraiseSearchMode = "author" | "target";
const propertyByUserSearchMode = Object.freeze({
	author: "authorId",
	target: "targetId",
} satisfies Record<PraiseSearchMode, keyof Praise>);

async function handleDisplayPraises(
	client: Client,
	interaction: Logos.Interaction<any, { user: string | undefined }>,
	{ mode }: { mode: PraiseSearchMode },
): Promise<void> {
	const member = client.resolveInteractionToMember(interaction, {
		identifier: interaction.parameters.user ?? interaction.user.id.toString(),
	});
	if (member === undefined) {
		return;
	}

	const user = member.user;
	if (user === undefined) {
		return;
	}

	const isSelf = member.id === interaction.user.id;

	const propertyName = propertyByUserSearchMode[mode];
	const praiseDocuments = await Praise.getAll(client, {
		where: { guildId: interaction.guildId.toString(), [propertyName]: member.id.toString() },
	});

	await client.notice(interaction, getPraisePage(client, interaction, praiseDocuments, isSelf, mode));
}

export { handleDisplayAuthorPraises, handleDisplayTargetPraises, handleDisplayPraisesAutocomplete };