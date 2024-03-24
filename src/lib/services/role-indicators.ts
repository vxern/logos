import { Client } from "logos/client";
import { Collector } from "logos/collectors";
import { Guild, RoleWithIndicator } from "logos/database/guild";
import { LocalService } from "logos/services/service";

class RoleIndicatorService extends LocalService {
	readonly #_guildMemberUpdates: Collector<"guildMemberUpdate">;

	get configuration(): Guild["roleIndicators"] {
		return this.guildDocument?.roleIndicators;
	}

	constructor(client: Client, { guildId }: { guildId: bigint }) {
		super(client, { identifier: "RoleIndicatorService", guildId });

		this.#_guildMemberUpdates = new Collector();
	}

	async start(): Promise<void> {
		// TODO(vxern): Get rid of all this nullability all over the place.
		const [configuration, guild] = [this.configuration, this.guild];
		if (configuration === undefined || guild === undefined) {
			return;
		}

		for (const member of guild.members.array()) {
			if (member.user === undefined) {
				continue;
			}

			await this.guildMemberUpdate(member, member.user);
		}

		this.#_guildMemberUpdates.onCollect(this.guildMemberUpdate.bind(this));

		await this.client.registerCollector("guildMemberUpdate", this.#_guildMemberUpdates);
	}

	async stop(): Promise<void> {}

	async guildMemberUpdate(member: Discord.Member | Logos.Member, user: Discord.User | Logos.User): Promise<void> {
		const [configuration, guild] = [this.configuration, this.guild];
		if (configuration === undefined || guild === undefined) {
			return;
		}

		// Bots cannot change the guild owner's nickname.
		if (member.id === guild.ownerId) {
			return;
		}

		const applicableRolesAll: RoleWithIndicator[] = [];
		for (const role of configuration.roles) {
			if (!member.roles.includes(BigInt(role.roleId))) {
				continue;
			}

			applicableRolesAll.push(role);
		}

		const applicableRoles = applicableRolesAll.slice(0, configuration.limit ?? applicableRolesAll.length);
		const applicableIndicators = applicableRoles.map((role) => role.indicator);

		const hasApplicableIndicators = applicableIndicators.length !== 0;

		if (member.nick === undefined) {
			if (!hasApplicableIndicators) {
				return;
			}

			const nickname = getNicknameWithRoleIndicators(user.username, applicableIndicators);
			this.client.bot.rest
				.editMember(member.guildId, user.id, { nick: nickname })
				.catch(() => this.log.warn("Failed to set member's role indicators."));

			return;
		}

		const matchResult = constants.patterns.roleIndicators.exec(member.nick) ?? undefined;
		const hasIndicators = matchResult !== undefined;
		if (!hasIndicators) {
			if (!hasApplicableIndicators) {
				return;
			}

			const nickname = getNicknameWithRoleIndicators(member.nick, applicableIndicators);
			this.client.bot.rest
				.editMember(member.guildId, user.id, { nick: nickname })
				.catch(() => this.log.warn("Failed to set member's role indicators."));

			return;
		}

		const [_, username, indicatorsFormatted] = matchResult;
		if (username === undefined || indicatorsFormatted === undefined) {
			return;
		}

		if (!hasApplicableIndicators) {
			this.client.bot.rest
				.editMember(member.guildId, user.id, { nick: username })
				.catch(() => this.log.warn("Failed to reset member's role indicators."));

			return;
		}

		const indicators = indicatorsFormatted.split(constants.special.sigils.separator);
		const hasNoChange =
			indicators.length === applicableIndicators.length &&
			applicableIndicators.every((applicableIndicator, index) => indicators[index] === applicableIndicator);
		if (hasNoChange) {
			return;
		}

		const nicknameModified = getNicknameWithRoleIndicators(username, applicableIndicators);
		this.client.bot.rest
			.editMember(member.guildId, user.id, { nick: nicknameModified })
			.catch(() => this.log.warn("Failed to update member's role indicators."));
	}
}

function getNicknameWithRoleIndicators(username: string, indicators: string[]): string {
	const indicatorsFormatted = indicators.join(constants.special.sigils.separator);
	const modification = `${constants.special.sigils.divider}${indicatorsFormatted}`;
	const usernameSlice = username.slice(0, constants.MAXIMUM_USERNAME_LENGTH - modification.length);

	return `${usernameSlice}${modification}`;
}

export { RoleIndicatorService };
