import { SelectComponentOption } from '../../../../../deps.ts';
import { RoleCollection } from './role-collection.ts';

/** Defines the type of a role category. */
enum RoleCategoryType {
	/** A category group containing other categories or category groups. */
	CATEGORY_GROUP,

	/** A category containing a list of roles. */
	CATEGORY,
}

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
 * @returns The created selections.
 */
function createSelectionsFromCategories(
	categories: RoleCategory[],
): SelectComponentOption[] {
	return categories.map((category, index) => ({
		label: category.name,
		value: index.toString(),
		description: category.description.length > 100
			? category.description.slice(0, 97) + '...'
			: category.description,
		emoji: { name: category.emoji },
		disabled: true,
	}));
}

export { createSelectionsFromCategories, RoleCategoryType };
export type { RoleCategory };
