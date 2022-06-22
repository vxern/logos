/** Defines the availability of a command to members of the guild. */
enum Availability {
	/** The command is only available to every member in the guild. */
	EVERYONE,

	/** The command is only available to users who have a proficiency role. */
	MEMBERS,

	/** The command is only available to server guides. */
	MODERATORS,

	/** The command is only available to the owner. */
	OWNER,
}

export { Availability };
