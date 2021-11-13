import { Guild, Interaction, Role as DiscordRole } from "../../../../deps.ts";

/**
 * Describes the generator of a description; a function which takes a role name
 * and returns a description created from it.
 *
 * @param name - The name of the role.
 * @returns A generated description using the name of the role.
 */
type DescriptionGenerator = (name: string) => string;

/**
 * Defines a list of functions required to generate messages shown during role
 * assignment and unassignment.
 */
interface Assignable {
  /** When the user is assigned a role from the category. */
  onAssignMessage?: DescriptionGenerator;
  /** When the user is unassigned the role from the category. */
  onUnassignMessage?: DescriptionGenerator;
}

/** Represents a selectable role within a role selection menu.  */
interface Role extends Assignable {
  /** Role name corresponding to the guild role name. */
  name: string;
  /** Description of this role's purpose. */
  description?: string;
  /** Emoji to be displayed next to its selection. */
  emoji?: string;
}

/**
 * Taking the {@link Guild} within which to find the role and the role's name,
 * returns the Discord role object associated with that name.
 *
 * @param guild - The guild within which to find the role.
 * @param name - The name of the role.
 * @returns The Discord role object.
 */
async function resolveGuildRole(
  { guild, name }: { guild: Guild; name: string },
): Promise<DiscordRole> {
  const guildRoles = await guild.roles.array();
  return guildRoles.find((role) => role.name === name)!;
}

/**
 * Contains information about a role action, where an action can be role
 * assignment, unassignment, or both.
 */
interface RoleAction {
  /** The interaction associated with this action. */
  interaction: Interaction;
  /** Roles to modify. */
  roles: {
    /** Roles to assign to the member. */
    add?: Role[];
    /** Roles to unassign from the member. */
    remove?: Role[];
  };
}

/**
 * Modifies the member's roles as per the {@link RoleAction}.
 *
 * @param action - Information about the modification.
 * @returns The success of the modification.
 */
async function modifyRoles(action: RoleAction): Promise<boolean> {
  if (!action.interaction.member || !action.interaction.guild) return false;

  if (action.roles.add) {
    for (const role of action.roles.add) {
      const guildRole = await resolveGuildRole({
        guild: action.interaction.guild!,
        name: role.name,
      });
      // Assign role to member
      action.interaction.member.roles.add(guildRole.id);
      // Fetch Discord role and cache it
      action.interaction.client.cache.set(
        action.interaction.member.roles.cacheName,
        role.name,
        guildRole,
      );
    }
  }

  if (action.roles.remove) {
    // Fetch Discord role and cache it
    action.interaction.client.cache.delete(
      action.interaction.member.roles.cacheName,
      ...action.roles.remove.map((role) => role.name),
    );
    for (const role of action.roles.remove) {
      const guildRole = await resolveGuildRole({
        guild: action.interaction.guild!,
        name: role.name,
      });
      // Unassign role from member
      action.interaction.member.roles.remove(guildRole.id);
    }
  }

  return true;
}

export { modifyRoles, resolveGuildRole };
export type { Assignable, DescriptionGenerator, Role, RoleAction };
