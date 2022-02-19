import { RoleCollection } from './role-collection.ts';

/**
 * The type of a category helps determine how it should be managed in a
 * role navigation tree.
 */
enum RoleCategoryType {
	/** A category with subcategories. */
	CATEGORY_GROUP,
	/** A category with a list of roles. */
	CATEGORY,
}

/** Represents a thematic selection of {@link Role}s. */
interface RoleCategory {
	/** The type of this category. */
	type: RoleCategoryType;
	/** Name of this group of roles. */
	name: string;
	/** Description of the roles this group of roles comprises. */
	description: string;
	/** Colour to be displayed in the embed when this category is selected. */
	color: number;
	/** Emoji to be displayed next to this selection in a selection menu. */
	emoji: string;
	/**
	 * Limit of roles from within this group that a user can assign.
	 *
	 * @remarks
	 * -1 = No limit
	 */
	limit?: number;
	/** Subcategories of this category. */
	categories?: RoleCategory[];
	/** This category's role collection. */
	collection?: RoleCollection;
}

export { RoleCategoryType };
export type { RoleCategory };
