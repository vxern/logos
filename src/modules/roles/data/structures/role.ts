import {
	colors,
	Guild,
	Interaction,
	Member,
	Role as DiscordRole,
} from '../../../../../deps.ts';
import configuration from '../../../../configuration.ts';
import { messageUser } from '../../../../utils.ts';
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
	const guildRoles = await guild.roles.array().catch(() => undefined);
	if (!guildRoles) {
		console.error(
			`Failed to fetch roles for guild ${colors.bold(guild.name!)}.`,
		);
		return undefined;
	}

	const role = guildRoles.find((role) => role.name === name);
	if (!role) {
		console.error(
			`Failed to fetch role with name '${name}' for guild ${
				colors.bold(guild.name!)
			}.`,
		);
		return undefined;
	}

	return role;
}

/**
 * Contains information about a role action, where an action can be role
 * assignment, unassignment, or both.
 */
interface RoleAction {
	/** The member subject to this action. */
	member: Member;

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
	if (!memberRoles) return;

	const alreadyHasRole = memberRoles.some((memberRole) =>
		memberRole.name === role.name
	);

	const action: RoleAction = { member: interaction.member!, roles: {} };

	if (!alreadyHasRole) {
		if (
			memberRoles.length >= category.limit! && category.limit !== 1 &&
			category.limit !== -1
		) {
			interaction.send({
				ephemeral: true,
				embeds: [{
					title: `Reached the role limit in the '${category.name}' category.`,
					description:
						`You have reached the limit of roles you can assign from within the '${category.name}' category. To choose a new role, unassign one of your roles.`,
				}],
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

	const assignMessage = !action.roles.add
		? ''
		: (role.onAssignMessage!(role.name) + (action.roles.remove ? '\n\n' : ''));
	const unassignMessage = !action.roles.remove || category.limit === 1
		? ''
		: role.onUnassignMessage!(role.name);

	const embed = {
		description: assignMessage + unassignMessage,
		color: configuration.interactions.responses.colors.green,
	};

	const message = await messageUser(
		interaction.user,
		interaction.guild!,
		embed,
	);
	if (message) return;

	interaction.send({
		ephemeral: true,
		embeds: [embed],
	});
}

/**
 * Modifies the member's roles as per the {@link RoleAction}.
 *
 * @param action - Information about the modification.
 * @returns The success of the modification.
 */
async function modifyRoles(action: RoleAction): Promise<boolean> {
	const unresolvedRolesToAdd = action.roles.add?.map((role) =>
		resolveGuildRole(action.member.guild!, role.name)
	);

	if (unresolvedRolesToAdd) {
		console.log(
			`${action.member.user.username} assigned roles: ${
				action.roles.add!.map((role) => `'${role.name}'`).join(', ')
			}`,
		);

		const resolvedRolesToAdd = await Promise.all(unresolvedRolesToAdd);

		const unresolvedRoles = resolvedRolesToAdd.map<
			[DiscordRole | undefined, number]
		>((role, index) => [role, index]).filter(([role, _index]) => !role).map((
			[_role, index],
		) => action.roles.add![index]!);

		for (const role of unresolvedRoles) {
			console.error(
				`A role with the name '${role.name}' does not exist in the guild '${action
					.member.guild!.name!}'.`,
			);
		}

		for (
			const role of <DiscordRole[]> resolvedRolesToAdd.filter((role) => role)
		) {
			// Assign role to member.
			action.member.roles.add(role!.id).catch();
			// Fetch Discord role and cache it.
			action.member.client.cache.set(
				action.member.roles.cacheName,
				role.name,
				role,
			);
		}
	}

	const unresolvedRolesToRemove = action.roles.remove?.map((role) =>
		resolveGuildRole(action.member.guild!, role.name)
	);

	if (unresolvedRolesToRemove) {
		console.log(
			`${action.member!.user.username} unassigned roles: ${
				action.roles.remove!.map((role) => `'${role.name}'`).join(', ')
			}`,
		);

		const resolvedRolesToRemove = await Promise.all(unresolvedRolesToRemove);

		const unresolvedRoles = resolvedRolesToRemove.map<
			[DiscordRole | undefined, number]
		>((role, index) => [role, index]).filter(([role, _index]) => !role).map((
			[_role, index],
		) => action.roles.add![index]!);

		for (const role of unresolvedRoles) {
			console.error(
				`A role with the name '${role.name}' does not exist in the guild '${action
					.member.guild!.name!}'.`,
			);
		}

		const resolvedRoles = <DiscordRole[]> resolvedRolesToRemove.filter((role) =>
			role
		);

		// Remove cached roles for a member.
		action.member.client.cache.delete(
			action.member.roles.cacheName,
			...resolvedRoles.map((role) => role.name),
		);

		for (const role of resolvedRoles) {
			// Unassign role from member.
			action.member.roles.remove(role!.id).catch();
		}
	}

	return true;
}

export { modifyRoles, resolveGuildRole, tryAssignRole };
export type { Assignable, DescriptionGenerator, Role, RoleAction };
