import { Member } from "../../../../deps.ts";
import { Assignable, DescriptionGenerator, Role } from "./role.ts";

/**
 * The type of a role list helps determine how it should be managed in a
 * role navigation tree.
 */
enum RoleCollectionType {
  /** A role collection whose list of roles is determined through its key. */
  COLLECTION_LOCALISED,
  /** A role collection whose list of roles applies to all servers. */
  COLLECTION,
}

/**
 * Represents a collection of {@link Role}s with an optional description applied
 * to each in case a {@link Role} does not have a description.
 */
interface RoleCollection extends Assignable {
  /** The type of this collection. */
  type: RoleCollectionType;
  /** Description applied to roles in this collection without a description. */
  description?: DescriptionGenerator;
  /**
   * Whether the roles in this collection are to be characterised by graduality.
   */
  isGradual?: boolean;
  /** List of roles within this collection. */
  list?: Role[];
  /** Lists of roles with languages as keys. */
  lists?: Record<string, Role[]>;
}

/**
 * Extracts the list of roles from within a role collection and returns it.
 *
 * @param collection - The collection from which to read the list of roles.
 * @param language - The language concerning the guild.
 * @returns The list of roles within the collection.
 */
function resolveRoles(
  collection: RoleCollection,
  language: string | undefined,
): Role[] {
  if (collection.type === RoleCollectionType.COLLECTION_LOCALISED) {
    return collection.lists![language!];
  }
  return collection.list!;
}

/**
 * Gets a list of the member's roles, and optionally omits those not present
 * within the {@link RoleCollection}.
 *
 * @param member - The member whose roles to get.
 * @param language - The language concerning the guild.
 */
async function getMemberRoles(
  member: Member,
  language: string | undefined,
  options: { within: RoleCollection },
): Promise<Role[]> {
  const memberRoles = (await member.roles.array()) ?? [];
  return resolveRoles(options.within, language).filter((role) =>
    memberRoles.some((memberRole) => memberRole.name === role.name)
  );
}

export { getMemberRoles, resolveRoles, RoleCollectionType };
export type { RoleCollection };
