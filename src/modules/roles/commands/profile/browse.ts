import {
	Interaction,
	InteractionResponse,
	InteractionResponseType,
	InteractionType,
	Member,
	MessageComponentInteraction,
	MessageComponentType,
	SelectComponentOption,
} from '../../../../../deps.ts';
import { Client } from '../../../../client.ts';
import { createInteractionCollector } from '../../../../utils.ts';
import {
	createSelectionsFromCategories,
	RoleCategory,
	RoleCategoryType,
} from '../../data/structures/role-category.ts';
import {
	createSelectionsFromCollection,
	resolveRoles,
} from '../../data/structures/role-collection.ts';
import { Role } from '../../data/structures/role.ts';

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
	language?: string;
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
		category = category.categories![index]!;
	}
	return category;
}

/**
 * Creates a browsing menu for selecting roles.
 *
 * @returns An asynchronous generator returning a tuple of a {@link Role} and a
 * {@link RoleCategory} when a selection has been made.
 */
async function* browse(
	data: BrowsingData,
): AsyncGenerator<[Role, RoleCategory], void, unknown> {
	const [collector, customID, isEnded] = createInteractionCollector(
		data.client,
		{
			type: InteractionType.MESSAGE_COMPONENT,
			user: data.interaction.user,
		},
	);

	while (!isEnded()) {
		try {
			const category = traverse(data.navigation);
			const method = <(
				data: InteractionResponse,
			) => Promise<Interaction>> (data.interaction.responded
				? data.interaction.editResponse
				: data.interaction.respond);

			// deno-lint-ignore no-await-in-loop
			const menu = await displaySelectionMenu(data, customID, category);
			method.call(data.interaction, menu);

			const selection =
				// deno-lint-ignore no-await-in-loop
				<MessageComponentInteraction> (await collector.waitFor('collect'))[0];
			selection.respond({
				type: InteractionResponseType.DEFERRED_MESSAGE_UPDATE,
			});

			const index = Number(selection.data!.values![0]!);

			if (index === -1) {
				data.navigation.indexes.pop();
				continue;
			}

			if (category.type === RoleCategoryType.CATEGORY) {
				yield [
					resolveRoles(category!.collection!, data.language)[index]!,
					category,
				];
				continue;
			}

			data.navigation.indexes.push(index);
		} catch (error) {
			console.error(error);
			break;
		}
	}
}

/**
 * Taking a member, language and category, gets a list of selections for the select menu.
 *
 * @param member - The member to get the selections for.
 * @param language - The language of the menu.
 * @param category - The role category to display.
 * @returns An array of selections.
 */
async function getSelections(
	member: Member,
	language: string | undefined,
	category: RoleCategory,
): Promise<SelectComponentOption[]> {
	if (category.type === RoleCategoryType.CATEGORY_GROUP) {
		return createSelectionsFromCategories(category.categories!);
	}

	return await createSelectionsFromCollection(
		member,
		language,
		category.collection!,
	);
}

/**
 * Creates a selection menu and returns its object.
 *
 * @param data - The data used for dispalying the selection menu.
 * @param customID - The ID of the selection menu.
 * @param category - The role category shown.
 * @returns A promise resolving to an interaction response.
 */
async function displaySelectionMenu(
	data: BrowsingData,
	customID: string,
	category: RoleCategory,
): Promise<InteractionResponse> {
	const selections = await getSelections(
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
		embeds: [{
			title: `${category.emoji}  ${category.name}`,
			description: category.description,
			color: category.color,
		}],
		components: [{
			type: MessageComponentType.ACTION_ROW,
			components: [{
				type: MessageComponentType.SELECT,
				customID: customID,
				options: selections,
				placeholder: category.type === RoleCategoryType.CATEGORY_GROUP
					? 'Choose a role category.'
					: 'Choose a role.',
			}],
		}],
		ephemeral: true,
	};
}

export { browse };
