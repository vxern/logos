/**
 * Describes the generator of a description; a function which takes a role name
 * and returns a description created from it.
 *
 * @param roleName - The name of the role.
 * @returns A description generated using the name of the role.
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

export type { Assignable, DescriptionGenerator, Role };
