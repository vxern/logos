import { calculatePermissions, Guild } from "discordeno";
import { EntryRequest } from "../../../../database/structs/entry-request.js";
import configuration from "../../../../../configuration.js";

type NecessaryVotes = [
	[requiredAcceptanceVotes: number, requiredRejectionVotes: number],
	[votesToAccept: number, votesToReject: number],
];

function getNecessaryVotes(guild: Guild, entryRequest: EntryRequest): NecessaryVotes {
	const moderatorRoleIds = guild.roles
		.array()
		.filter((role) => calculatePermissions(role.permissions).includes("MODERATE_MEMBERS"))
		.map((role) => role.id);
	const moderatorCount =
		moderatorRoleIds.length !== 0
			? Math.max(
					guild.members
						.array()
						.filter(
							(member) =>
								moderatorRoleIds.some((roleId) => member.roles.includes(roleId)) &&
								!member.user?.toggles.bot &&
								member.user?.username !== guild.name,
						).length,
					1,
			  )
			: configuration.services.entry.verification.defaultVotesRequired;

	const requiredAcceptanceVotes = Math.max(
		1,
		Math.ceil(configuration.services.entry.verification.proportionVotesToAccept * moderatorCount),
	);
	const requiredRejectionVotes = Math.max(
		1,
		Math.ceil(configuration.services.entry.verification.proportionVotesToReject * moderatorCount),
	);

	const votesToAccept = requiredAcceptanceVotes - entryRequest.votedFor.length;
	const votesToReject = requiredRejectionVotes - entryRequest.votedAgainst.length;

	return [
		[requiredAcceptanceVotes, requiredRejectionVotes],
		[votesToAccept, votesToReject],
	];
}

export { getNecessaryVotes };
