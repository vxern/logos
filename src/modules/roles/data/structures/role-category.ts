import { SelectComponentOption } from '../../../../../deps.ts';
import { trim } from '../../../../utils.ts';
import { RoleCollection } from './role-collection.ts';

/** Defines the type of a role category. */
type RoleCategoryType = 'CATEGORY' | 'CATEGORY_GROUP';

/** Represents a thematic selection of {@link Role}s. */
interface RoleCategory {
	/** The type of this category. */
	type: RoleCategoryType;

	/** The name of this category. */
	name: string;

	/** The description for the roles contained within this category. */
	description: string;

	/** The colour to be displayed in the embed message when this category is selected. */
	color: number;

	/** The emoji to be displayed next to this category in a selection menu. */
	emoji: string;

	/**
	 * The maximum number of roles from within this group that a user can assign.
	 *
	 * @remarks
	 * -1 = No limit
	 */
	limit?: number;

	/** The subcategories of this category. */
	categories?: RoleCategory[];

	/** The collection of roles defined within this category. */
	collection?: RoleCollection;
}

/**
 * Taking an array of categories, create a list of options for it.
 *
 * @param categories - The role categories.
 * @param language - The language of the guild.
 * @returns The created selections.
 */
function createSelectionsFromCategories(
	categories: RoleCategory[],
	language: string | undefined,
): SelectComponentOption[] {
	const categorySelections = getCategorySelections(categories, language);

	const options = categorySelections.map(([category, shouldDisplay], index) =>
		!shouldDisplay ? undefined : ({
			label: category.name,
			value: index.toString(),
			description: trim(category.description, 100),
			emoji: { name: category.emoji },
			disabled: true,
		})
	);

	return <SelectComponentOption[]> options.filter((option) => option);
}

function getCategorySelections(
	categories: RoleCategory[],
	language: string | undefined,
): [RoleCategory, boolean][] {
	return categories.map<[RoleCategory, boolean]>(
		(category) => {
			const shouldDisplay = !!category.categories ||
				category.collection!.type === 'COLLECTION' ||
				(category.collection!.type === 'COLLECTION_LOCALISED' && !!language &&
					Object.keys(category.collection!.lists!).includes(language));

			return [category, shouldDisplay];
		},
	);
}

export { createSelectionsFromCategories, getCategorySelections };
export type { RoleCategory };
