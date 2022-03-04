import {
	Collector,
	Interaction,
	InteractionMessageComponentData,
	InteractionResponse,
	InteractionResponseType,
	MessageComponentType,
} from '../../../../../../deps.ts';
import {
	RoleCategory,
	RoleCategoryType,
} from '../../../data/structures/role-category.ts';
import { resolveRoles } from '../../../data/structures/role-collection.ts';
import { Role } from '../../../data/structures/role.ts';
import { displaySelections } from './selections.ts';

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
	 * view within the selection menu. */
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
		category = category.categories![index];
	}
	return category;
}

/**
 * Represents a template for data used in browsing through the selection menu and
 * managing the interaction which requested it.
 */
interface BrowsingData {
	/** The interaction which requested this menu. */
	interaction: Interaction;
	/**
	 * The navigation data associated with this menu required for the
	 * ability to browse through it.
	 */
	navigation: NavigationData;
	/**The language concerning the guild where the interaction was made. */
	language: string | undefined;
}

/**
 * Creates a browsing menu for selecting roles.
 *
 * @param interaction - The interaction which requested this menu.
 *
 * @returns An asynchronous generator returning a tuple of a {@link Role} and a
 * {@link RoleCategory} when a selection has been made.
 */
async function* browse(
	data: BrowsingData,
): AsyncGenerator<[Role, RoleCategory], void, unknown> {
	const collector = new Collector({
		event: 'interactionCreate',
		client: data.interaction.client,
		filter: (selection: Interaction) => {
			if (!selection.isMessageComponent()) {
				return false;
			}
			if (selection.user.id !== data.interaction.user.id) return false;
			if (
				selection.message.interaction?.id !==
					data.interaction.id
			) {
				return false;
			}
			return true;
		},
		deinitOnEnd: true,
		timeout: 10 * 60 * 1000, // 10 minutes
	});

	collector.collect();

	while (true) {
		try {
			const category = traverse(data.navigation);
			const method = (data.interaction.responded
				? data.interaction.editResponse
				: data.interaction.respond) as (
					data: InteractionResponse,
				) => Promise<Interaction>;
			const menu = await displaySelectionMenu(data, category);
			method.call(data.interaction, menu);

			const collected = await collector.waitFor('collect');

			const selection = collected[0] as Interaction;
			selection.respond({
				type: InteractionResponseType.DEFERRED_MESSAGE_UPDATE,
			});
			const index = Number(
				(selection.data! as InteractionMessageComponentData).values![0],
			);
			if (isNaN(index)) {
				throw new Error('The index provided by the user was not numerical.');
			}
			// TODO(vxern): Check if the index is out of bounds.

			if (index === -1) {
				data.navigation.indexes.pop();
				continue;
			}

			if (category.type === RoleCategoryType.CATEGORY) {
				yield [
					resolveRoles(category!.collection!, data.language)[index],
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
 * Creates a selection menu and returns its object.
 *
 * @param interaction -
 */
async function displaySelectionMenu(
	data: BrowsingData,
	category: RoleCategory,
): Promise<InteractionResponse> {
	const selections = await displaySelections(
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
				customID: 'ROLE_SELECTION_MENU',
				options: selections,
				placeholder: category.type === RoleCategoryType.CATEGORY_GROUP
					? 'Choose a category.'
					: 'Choose a role.',
			}],
		}],
		ephemeral: true,
	};
}

export { browse };
