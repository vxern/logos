import { Client } from "logos/client";
import { getPraisePage } from "logos/commands/praises";
import { Praise } from "logos/database/praise";
import {InteractionHandler} from "logos/commands/handlers/handler";

type PraiseSearchMode = "author" | "target";
const propertyByUserSearchMode = Object.freeze({
    author: "authorId",
    target: "targetId",
} satisfies Record<PraiseSearchMode, keyof Praise>);

const handleDisplayAuthorPraises: InteractionHandler = (...args) => handleDisplayPraises(...args, { mode: "author" });
const handleDisplayTargetPraises: InteractionHandler = (...args) => handleDisplayPraises(...args, { mode: "target" });

async function handleDisplayPraisesAutocomplete(
    client: Client,
    interaction: Logos.Interaction<any, { user: string | undefined }>,
): Promise<void> {
    if (interaction.parameters.user === undefined) {
        return;
    }

    await client.autocompleteMembers(interaction, { identifier: interaction.parameters.user });
}

async function handleDisplayPraises(
    client: Client,
    interaction: Logos.Interaction<any, { user: string | undefined }>,
    _: Logos.InteractionLocaleData,
    { mode }: { mode: PraiseSearchMode },
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

    const propertyName = propertyByUserSearchMode[mode];
    const praiseDocuments = await Praise.getAll(client, { where: { [propertyName]: member.id.toString() } });

    await client.notice(interaction, getPraisePage(client, praiseDocuments, isSelf, mode, { locale }));
}

export { handleDisplayAuthorPraises, handleDisplayTargetPraises, handleDisplayPraisesAutocomplete };
