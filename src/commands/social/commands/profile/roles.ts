import {
	ApplicationCommandFlags,
	ApplicationCommandOptionTypes,
	editInteractionResponse,
	Interaction,
	InteractionResponse,
	InteractionResponseTypes,
	InteractionTypes,
	Member,
	MessageComponentTypes,
	SelectOption,
	sendInteractionResponse,
} from '../../../../../deps.ts';
import { Client, getLanguage, isManagedGuild } from '../../../../client.ts';
import { Language } from '../../../../types.ts';
import { createInteractionCollector } from '../../../../utils.ts';
import configuration from '../../../../configuration.ts';
import {
	createSelectionsFromCategories,
	getCategorySelections,
	RoleCategory,
	RoleCategoryTypes,
} from '../../data/structures/role-category.ts';
import {
	createSelectionsFromCollection,
	resolveRoles,
} from '../../data/structures/role-collection.ts';
import { Role, tryAssignRole } from '../../data/structures/role.ts';
import { roles } from '../../module.ts';
import { OptionBuilder } from '../../../command.ts';

const command: OptionBuilder = {
	name: 'roles',
	nameLocalizations: {
		pl: 'role',
		ro: 'roluri',
	},
	description: 'Opens the role selection menu.',
	descriptionLocalizations: {
		pl: 'Otwiera menu wybierania ról.',
		ro: 'Deschide meniul selectării rolurilor.',
	},
	type: ApplicationCommandOptionTypes.SubCommand,
	handle: selectRoles,
};

/**
 * Displays a role selection menu to the user and allows them to assign or unassign roles
 * from within it.
 */
function selectRoles(
	client: Client,
	interaction: Interaction,
): void {
	const language = getLanguage(client, interaction.guildId!);
	if (!language) return;

	const isManaged = isManagedGuild(client, interaction.guildId!);

	let availableRoleCategories = [];
	if (isManaged) {
		availableRoleCategories = [
			...roles.scopes.global,
			...getCategorySelections(roles.scopes.local, language).filter((
				[_category, shouldDisplay],
			) => shouldDisplay).map(([category, _shouldDisplay]) => category),
		];
	} else {
		availableRoleCategories = roles.scopes.global;
	}

	const navigation: NavigationData = {
		root: {
			type: RoleCategoryTypes.CategoryGroup,
			name: 'No Category Selected',
			description:
				'Please select a role category to obtain a list of available roles within it.',
			color: configuration.interactions.responses.colors.invisible,
			emoji: '💭',
			categories: availableRoleCategories,
		},
		indexes: [],
		index: 0,
	};

	return browse(
		client,
		{
			client: client,
			interaction: interaction,
			navigation: navigation,
			language: language,
		},
		(role, category) => tryAssignRole(client, interaction, category, role),
	);
}

/**
 * Represents a template for data used in browsing through the selection menu and
 * managing the interaction that requested it.
 */
interface BrowsingData {
	/** The client associated with this interaction. */
	client: Client;

	/** The interaction that requested this menu. */
	interaction: Interaction;

	/**
	 * The navigation data associated with this menu required for the
	 * ability to browse through it.
	 */
	navigation: NavigationData;

	/** The language of the guild where the interaction was made. */
	language?: Language;
}

/**
 * Represents a template for data used in navigation between sections of the
 * role selection menu.
 */
interface NavigationData {
	/**
	 * The root category, which is not part of another category's list of
	 * categories.
	 */
	root: RoleCategory;

	/**
	 * Array of indexes to be accessed successively to arrive at the current
	 * view within the selection menu.
	 */
	indexes: number[];

	/** The index being followed during traversal. */
	index: number;
}

/**
 * Traverses the role category tree and returns the role category the user is
 * viewing currently.
 *
 * @param data - Navigation data for the selection menu.
 * @returns The category the user is now viewing.
 */
function traverse(
	data: NavigationData,
): RoleCategory {
	let category = data.root;
	for (const index of data.indexes) {
		category =
			(<RoleCategory & { type: RoleCategoryTypes.CategoryGroup }> category)
				.categories![index]!;
	}
	return category;
}

/**
 * Creates a browsing menu for selecting roles.
 */
function browse(
	client: Client,
	data: BrowsingData,
	onSelectRole: (
		role: Role,
		category: RoleCategory & { type: RoleCategoryTypes.Category },
	) => void,
): void {
	let roleCategory: RoleCategory;

	function traverseAndDisplay(
		interaction: Interaction,
		editResponse = true,
	): void {
		roleCategory = traverse(data.navigation);

		const menu = displaySelectMenu(client, data, customId, roleCategory);

		if (editResponse) {
			return void editInteractionResponse(
				client.bot,
				interaction.token,
				menu.data!,
			);
		}

		return void sendInteractionResponse(
			client.bot,
			interaction.id,
			interaction.token,
			menu,
		);
	}

	traverseAndDisplay(data.interaction, false);

	const customId = createInteractionCollector(
		data.client,
		{
			type: InteractionTypes.MessageComponent,
			userId: data.interaction.user.id,
			onCollect: (bot, interaction) => {
				sendInteractionResponse(bot, interaction.id, interaction.token, {
					type: InteractionResponseTypes.DeferredUpdateMessage,
				});

				const indexString = interaction.data?.values?.at(0);
				if (!indexString) return;

				const index = Number(indexString);
				if (isNaN(index)) return;

				traverseAndDisplay(interaction);

				if (index === -1) {
					data.navigation.indexes.pop();
					return;
				}

				if (roleCategory.type === RoleCategoryTypes.CategoryGroup) {
					data.navigation.indexes.push(index);
					return;
				}

				const roles = resolveRoles(roleCategory.collection, data.language);
				const role = roles[index]!;
				onSelectRole(role, roleCategory);
			},
		},
	);
}

/**
 * Taking a member, language and category, gets a list of selections for the select menu.
 *
 * @param member - The member to get the selections for.
 * @param language - The language of the menu.
 * @param category - The role category to display.
 * @returns An array of selections.
 */
function getSelections(
	client: Client,
	member: Member,
	language: Language | undefined,
	category: RoleCategory,
): SelectOption[] {
	if (category.type === RoleCategoryTypes.CategoryGroup) {
		return createSelectionsFromCategories(category.categories!, language);
	}

	return createSelectionsFromCollection(
		client,
		member,
		language,
		category.collection!,
	)!;
}

/**
 * Creates a selection menu and returns its object.
 *
 * @param client - The client instance to use.
 * @param data - The data used for dispalying the selection menu.
 * @param customId - The ID of the selection menu.
 * @param category - The role category shown.
 * @returns A promise resolving to an interaction response.
 */
function displaySelectMenu(
	client: Client,
	data: BrowsingData,
	customId: string,
	category: RoleCategory,
): InteractionResponse {
	const selections = getSelections(
		client,
		data.interaction.member!,
		data.language,
		category,
	);
	if (data.navigation.indexes.length !== 0) {
		selections.push({
			label: 'Back',
			value: (-1).toString(),
		});
	}

	return {
		type: InteractionResponseTypes.ChannelMessageWithSource,
		data: {
			flags: ApplicationCommandFlags.Ephemeral,
			embeds: [{
				title: `${category.emoji}  ${category.name}`,
				description: category.description,
				color: category.color,
			}],
			components: [{
				type: MessageComponentTypes.ActionRow,
				components: [{
					type: MessageComponentTypes.SelectMenu,
					customId: customId,
					options: selections,
					placeholder: category.type === RoleCategoryTypes.CategoryGroup
						? 'Choose a role category.'
						: 'Choose a role.',
				}],
			}],
		},
	};
}

export default command;
