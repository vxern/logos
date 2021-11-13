/** Defines the availability of a command to members of the guild. */
enum Availability {
  /** The command is available to every member in the guild. */
  EVERYONE,
  /** The command is restricted to users who have a proficiency role. */
  MEMBERS,
  /** The command is restricted to server guides. */
  GUIDES,
  /** The command is restricted to just the owner. */
  OWNER,
}

export { Availability };
