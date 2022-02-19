import {
	Guild,
	Interaction,
	Role as DiscordRole,
} from '../../../../../deps.ts';
import { bold } from '../../../../formatting.ts';
import { RoleCategory } from './role-category.ts';
import { getMemberRoles } from './role-collection.ts';

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
	/** When the member is assigned a role from the category. */
	onAssignMessage?: DescriptionGenerator;
	/** When the member is unassigned the role from the category. */
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
	guild: Guild,
	name: string,
): Promise<DiscordRole | undefined> {
	const guildRoles = await guild.roles.array();
	return guildRoles.find((role) => role.name === name);
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
 * Given a {@link Role}, carries out the adequate checks, such as for limits
 * of roles that a member may select from a given category, and proceeds to
 * assign or unassign the role accordingly.
 *
 * @param interaction - The interaction associated with the attempt.
 * @param language - The language of the guild the interaction was made in.
 * @param category - The role category to which the role belongs.
 * @param role - The role to be assigned.
 */
async function tryAssignRole(
	interaction: Interaction,
	language: string,
	category: RoleCategory,
	role: Role,
): Promise<void> {
	const memberRoles = await getMemberRoles(
		interaction.member!,
		language,
		{ within: category.collection! },
	);

	const action: RoleAction = { interaction: interaction, roles: {} };
	const alreadyHasRole = memberRoles.some((memberRole) =>
		memberRole.name === role.name
	);

	if (!alreadyHasRole) {
		if (
			memberRoles.length >= category.limit! && category.limit !== 1 &&
			category.limit !== -1
		) {
			interaction.send({
				embeds: [{
					title: `Reached the role limit in the role category '${
						bold(category.name)
					}'.`,
					description:
						`You have reached the limit of roles you can assign from within the ${
							bold(category.name)
						} category. To choose a new role, unassign one of your roles.`,
				}],
				ephemeral: true,
			});
			return;
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

/**
 * Modifies the member's roles as per the {@link RoleAction}.
 *
 * @param action - Information about the modification.
 * @returns The success of the modification.
 */
async function modifyRoles(action: RoleAction): Promise<boolean> {
	if (!action.interaction.member || !action.interaction.guild) return false;

	if (action.roles.add) {
		console.log(
			`${action.interaction.user.username} assigned roles: ${
				action.roles.add.map((role) => `'${role.name}'`).join(', ')
			}`,
		);
		for (const role of action.roles.add) {
			const guildRole = await resolveGuildRole(
				action.interaction.guild!,
				role.name,
			);
			if (!guildRole) {
				console.error(
					`A role with the name '${role.name}' does not exist in the guild '${action
						.interaction.guild!.name!}'.`,
				);
				continue;
			}
			// Assign role to member
			action.interaction.member.roles.add(guildRole!.id);
			// Fetch Discord role and cache it
			action.interaction.client.cache.set(
				action.interaction.member.roles.cacheName,
				role.name,
				guildRole,
			);
		}
	}

	if (action.roles.remove) {
		console.log(
			`${action.interaction.user.username} unassigned roles: ${
				action.roles.remove.map((role) => `'${role.name}'`).join(', ')
			}`,
		);
		// Fetch Discord role and cache it
		action.interaction.client.cache.delete(
			action.interaction.member.roles.cacheName,
			...action.roles.remove.map((role) => role.name),
		);
		for (const role of action.roles.remove) {
			const guildRole = await resolveGuildRole(
				action.interaction.guild!,
				role.name,
			);
			// Unassign role from member
			action.interaction.member.roles.remove(guildRole!.id);
		}
	}

	return true;
}

export { modifyRoles, resolveGuildRole, tryAssignRole };
export type { Assignable, DescriptionGenerator, Role, RoleAction };
