import { Interaction } from "../../../../../deps.ts";
import { Client } from "../../../../client.ts";
import { Availability } from "../../../../commands/availability.ts";
import { Command } from "../../../../commands/command.ts";
import { OptionType } from "../../../../commands/option.ts";
import { bold } from "../../../../formatting.ts";
import { fromHex } from "../../../../utils.ts";
import { roles } from "../../module.ts";
import { RoleCategory, RoleCategoryType } from "../../structures/category.ts";
import { getMemberRoles } from "../../structures/collection.ts";
import { modifyRoles, RoleAction } from "../../structures/role.ts";
import { browse } from "./selection/browse.ts";

const command: Command = {
  name: "profile",
  availability: Availability.MEMBERS,
  options: [{
    name: "roles",
    type: OptionType.SUB_COMMAND,
    description: "Opens the role selection menu.",
    handle: selectRoles,
  }],
};

/**
 * Displays a role selection menu to the user and allows them to assign or unassign roles
 * from within it.
 *
 * @param interaction - The interaction made by the user.
 */
async function selectRoles(interaction: Interaction): Promise<void> {
  const navigation = {
    root: {
      type: RoleCategoryType.CATEGORY_GROUP,
      name: "No Category Selected",
      description:
        "Please select a role category to obtain a list of available roles within it.",
      color: fromHex("#303434"),
      emoji: "💭",
      limit: -1,
      categories: Client.isManagedGuild(interaction.guild!)
        ? Array<RoleCategory>().concat(...Object.values(roles.scopes))
        : roles.scopes.global,
    },
    indexes: [],
    index: 0,
  };

  const language = Client.managed.get(interaction.guild!.id) || undefined;

  const browsing = {
    interaction: interaction,
    navigation: navigation,
    language: language,
  };

  for await (const [role, category] of browse(browsing)) {
    const memberRoles = await getMemberRoles(
      interaction.member!,
      language,
      { within: category.collection! },
    );

    const action: RoleAction = { interaction: interaction, roles: {} };
    const alreadyHasRole = memberRoles.some((memberRole) =>
      memberRole.name === role.name
    );

    console.log(alreadyHasRole);

    if (!alreadyHasRole) {
      if (
        memberRoles.length >= category.limit! && category.limit !== 1 &&
        category.limit !== -1
      ) {
        interaction.send({
          embeds: [{
            title: `Reached the role limit in ${bold(category.name)}.`,
            description:
              `You have reached the limit of roles you can assign from within the ${
                bold(category.name)
              } category. To choose a new role, unassign one of your roles.`,
          }],
          ephemeral: true,
        });
        continue;
      }

      action.roles.add = [role];
    } else {
      action.roles.remove = [role];
    }

    if (category.limit === 1 && memberRoles.length > 0) {
      action.roles.remove = memberRoles;
    }

    modifyRoles(action);
  }
}

export default command;
