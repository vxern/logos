import { Localisations } from 'logos/assets/localisations/mod.ts';
import { Language } from 'logos/types.ts';

/** Represents a selectable role within a role selection menu.  */
interface Role {
	/** Role name corresponding to the guild role name. */
	name: Localisations<string>;

	/** Description of this role's purpose. */
	description?: Localisations<string>;

	/** Emoji to be displayed next to the role name. */
	emoji?: string;
}

/** The type of role category. */
enum RoleCategoryTypes {
	/** A role category acting as a thematic grouping for other role categories. */
	CategoryGroup,

	/** A standalone role category. */
	Category,
}

/**
 * The base of a role category.
 *
 * This type defines the core properties that all role categories must define.
 */
type RoleCategoryBase = {
	/** The type of this category. */
	type: RoleCategoryTypes;

	/** The display name of this category. */
	name: Localisations<string>;

	/** A description for what roles or role categories this role category contains. */
	description: Localisations<string>;

	/** The colour to be displayed in the embed message when this category is selected. */
	color: number;

	/** The emoji to be displayed next to this category in the select menu. */
	emoji: string;
};

/** The base of a group of role categories. */
type RoleCategoryGroup = {
	type: RoleCategoryTypes.CategoryGroup;

	/** The subcategories in this role category. */
	categories: RoleCategory[];
};

/** The base of a standalone role category. */
type RoleCategoryStandalone<
	T = SingleAssignableRoleCategory | MultipleAssignableRoleCategory,
> = {
	type: RoleCategoryTypes.Category;

	/** Whether or not only one role can be selected from this category. */
	restrictToOneRole: boolean;
} & T;

/** A role category that allows only one role to be selected from it at any one time. */
type SingleAssignableRoleCategory = {
	// Because only one role can be selected at any one time from this category, and
	// once a role has been selected, it cannot be unselected again, the message to be
	// shown when a role is unassigned will never be shown to the user.
	collection: RoleCollection;

	restrictToOneRole: true;
};

/** A role category that allows more than one role to be selected from it. */
type MultipleAssignableRoleCategory = {
	collection: RoleCollection;

	restrictToOneRole: false;

	/** The maximum number of roles that can be selected from this category. */
	limit?: number;
};

/** Represents a thematic selection of {@link Role}s. */
type RoleCategory =
	& RoleCategoryBase
	& (
		| RoleCategoryGroup
		| RoleCategoryStandalone
	);

/** The type of role collection. */
enum RoleCollectionTypes {
	/** A collection of roles. */
	Collection,

	/** A group of role collections that differ depending on the language. */
	CollectionLocalised,
}

/**
 * The base of a role collection.
 *
 * This type defines the core properties that all role collections must define.
 */
type RoleCollectionBase = {
	/** The type of this collection. */
	type: RoleCollectionTypes;
};

/** The base of a role collection with a standalone group of roles. */
type RoleCollectionStandalone = {
	type: RoleCollectionTypes.Collection;

	/** The roles in this role collection. */
	list: Role[];
};

/** The base of a role collection with localised groups of roles. */
type RoleCollectionLocalised = {
	type: RoleCollectionTypes.CollectionLocalised;

	/** Groups of roles defined by language in this role collection. */
	lists: Partial<Record<Language, Role[]>>;
};

/** Represents a grouping of roles. */
type RoleCollection =
	& RoleCollectionBase
	& (RoleCollectionStandalone | RoleCollectionLocalised);

export { RoleCategoryTypes, RoleCollectionTypes };
export type { Role, RoleCategory, RoleCategoryBase, RoleCategoryStandalone, RoleCollection };
