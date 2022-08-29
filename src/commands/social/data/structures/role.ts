import {
	addRole,
	ApplicationCommandFlags,
	getDmChannel,
	getGuildIconURL,
	Interaction,
	InteractionResponseTypes,
	Member,
	removeRole,
	Role as DiscordRole,
	sendInteractionResponse,
	sendMessage,
	snowflakeToBigint,
} from '../../../../../deps.ts';
import { Client } from '../../../../client.ts';
import configuration from '../../../../configuration.ts';
import { RoleCategory, RoleCategoryTypes } from './role-category.ts';
import { RoleCollectionTypes } from './role-collection.ts';

/**
 * Describes the generator of a description; a function which takes a role name
 * and returns a description created from it.
 *
 * @param roleName - The name of the role.
 * @returns A generated description using the name of the role.
 */
type DescriptionGenerator = (roleName: string) => string;

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
 * Contains information about a role action, where an action can be role
 * assignment, unassignment, or both.
 */
interface ModifyRoles {
	/** Roles to assign to the member. */
	toAdd?: Role[];

	/** Roles to unassign from the member. */
	toRemove?: Role[];
}

/**
 * Given a {@link Role}, carries out the adequate checks, such as for limits
 * of roles that a member may select from a given category, and proceeds to
 * assign or unassign the role accordingly.
 *
 * @param client - The client instance to use.
 * @param interaction - The interaction associated with the attempt.
 * @param category - The role category to which the role belongs.
 * @param role - The role to be assigned.
 */
async function tryAssignRole(
	client: Client,
	interaction: Interaction,
	category: RoleCategory & { type: RoleCategoryTypes.Category },
	role: Role,
): Promise<void> {
	const member = client.members.get(
		snowflakeToBigint(`${interaction.user.id}${interaction.guildId!}`),
	);
	if (!member) return;

	const guild = client.guilds.get(interaction.guildId!);
	if (!guild) return;

	const roleCollection = <typeof category.collection & {
		type: RoleCollectionTypes.Collection;
	}> category.collection;

	const memberRoles = <DiscordRole[]> member.roles.map((roleId) =>
		guild.roles.get(roleId)
	).filter((role) => role);
	const memberRolesInCategory = memberRoles.filter((memberRole) =>
		roleCollection.list.some((role) => memberRole.name === role.name)
	);

	const alreadyHasRole = memberRolesInCategory.some((memberRole) =>
		memberRole.name === role.name
	);

	const modification: ModifyRoles = {};

	if (alreadyHasRole) {
		if (
			(category.isSingle && memberRoles.length > 0) ||
			(!category.isSingle && category.limit &&
				memberRolesInCategory.length > category.limit)
		) {
			return void sendInteractionResponse(
				client.bot,
				interaction.id,
				interaction.token,
				{
					type: InteractionResponseTypes.ChannelMessageWithSource,
					data: {
						embeds: [{
							title:
								`Reached the role limit in the '${category.name}' category.`,
							description:
								`You have reached the limit of roles you can assign from within the '${category.name}' category. To choose a new role, unassign one of your roles.`,
						}],
					},
				},
			);
		}

		modification.toAdd = [role];
	} else {
		modification.toRemove = [role];
	}

	if (category.isSingle && memberRolesInCategory.length > 0) {
		modification.toRemove = memberRolesInCategory;
	}

	modifyRoles(client, member, modification);

	const assignMessage = !modification.toAdd
		? ''
		: (role.onAssignMessage?.call(undefined, role.name) ??
			'' + (modification.toRemove ? '\n\n' : ''));
	const unassignMessage = !modification.toRemove || !category.isSingle
		? ''
		: role.onUnassignMessage?.call(undefined, role.name) ?? '';

	const embed = {
		title: 'Roles updated',
		description: assignMessage + unassignMessage,
		color: configuration.interactions.responses.colors.green,
	};

	const dmChannel = await getDmChannel(client.bot, interaction.user.id);
	if (!dmChannel) return;

	const message = await sendMessage(client.bot, dmChannel.id, {
		embeds: [
			{
				thumbnail: (() => {
					const iconURL = getGuildIconURL(client.bot, guild.id, guild.icon);
					if (!iconURL) return undefined;

					return {
						url: iconURL,
					};
				})(),
				...embed,
			},
		],
	});
	if (!message) return;

	return void sendInteractionResponse(
		client.bot,
		interaction.id,
		interaction.token,
		{
			type: InteractionResponseTypes.UpdateMessage,
			data: {
				flags: ApplicationCommandFlags.Ephemeral,
				embeds: [embed],
			},
		},
	);
}

/**
 * Modifies the member's roles as per the {@link ModifyRoles}.
 *
 * @param client - The client instance to use.
 * @param member - The member to whom to make the role modification.
 * @param modification - Information about the modification.
 * @returns The success of the modification.
 */
function modifyRoles(
	client: Client,
	member: Member,
	modification: ModifyRoles,
): void {
	const guild = client.guilds.get(member.guildId);
	if (!guild) return;

	const guildRoles = guild.roles.array();

	function getDiscordRoles(
		roles: Role[] | undefined,
	): DiscordRole[] | undefined {
		return <DiscordRole[] | undefined> roles?.map((role) =>
			guildRoles.find((guildRole) => guildRole.name === role.name)
		)?.filter((role) => role);
	}

	const rolesToAdd = getDiscordRoles(modification.toAdd) ?? [];
	const rolesToRemove = getDiscordRoles(modification.toRemove) ?? [];

	for (const role of rolesToAdd) {
		addRole(
			client.bot,
			member.guildId,
			member.id,
			role.id,
			'User-requested addition.',
		);
	}

	for (const role of rolesToRemove) {
		removeRole(
			client.bot,
			member.guildId,
			member.id,
			role.id,
			'User-requested removal.',
		);
	}
}

export { modifyRoles, tryAssignRole };
export type { Assignable, DescriptionGenerator, ModifyRoles, Role };
