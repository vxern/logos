import * as Discord from "@discordeno/bot";
import constants from "../../../constants/constants";
import symbols from "../../../constants/types/symbols";
import * as Logos from "../../../types";
import { Guild, RoleWithIndicator } from "../../database/guild";
import { LocalService } from "../service";

class RoleIndicatorService extends LocalService {
	get configuration(): Guild["roleIndicators"] {
		return this.guildDocument?.roleIndicators;
	}

	async start(): Promise<void> {
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
	}

	async stop(): Promise<void> {}

	async guildMemberUpdate(member: Discord.Member | Logos.Member, user: Discord.User | Logos.User): Promise<void> {
		const [configuration, guild] = [this.configuration, this.guild];
		if (configuration === undefined || guild === undefined) {
			return;
		}

		// Owners cannot have their nicknames changed, for some reason.
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

			const nickname = applyIndicators(user.username, applicableIndicators);
			this.client.bot.rest
				.editMember(member.guildId, user.id, { nick: nickname })
				.catch(() => console.warn("Failed to set member's role indicators."));

			return;
		}

		const matchResult = constants.patterns.roleIndicators.exec(member.nick) ?? undefined;
		const hasIndicators = matchResult !== undefined;
		if (!hasIndicators) {
			if (!hasApplicableIndicators) {
				return;
			}

			const nickname = applyIndicators(member.nick, applicableIndicators);
			this.client.bot.rest
				.editMember(member.guildId, user.id, { nick: nickname })
				.catch(() => console.warn("Failed to set member's role indicators."));

			return;
		}

		const [_, username, indicatorsFormatted] = matchResult;
		if (username === undefined || indicatorsFormatted === undefined) {
			return;
		}

		if (!hasApplicableIndicators) {
			this.client.bot.rest
				.editMember(member.guildId, user.id, { nick: username })
				.catch(() => console.warn("Failed to reset member's role indicators."));

			return;
		}

		const indicators = indicatorsFormatted.split(symbols.sigils.separator);
		const hasNoChange =
			indicators.length === applicableIndicators.length &&
			applicableIndicators.every((applicableIndicator, index) => indicators[index] === applicableIndicator);
		if (hasNoChange) {
			return;
		}

		const nicknameModified = applyIndicators(username, applicableIndicators);
		this.client.bot.rest
			.editMember(member.guildId, user.id, { nick: nicknameModified })
			.catch(() => console.warn("Failed to update member's role indicators."));
	}
}

function applyIndicators(username: string, sigils: string[]): string {
	const modification = `${symbols.sigils.divider}${sigils.join(symbols.sigils.separator)}`;
	const usernameSlice = username.slice(0, constants.MAXIMUM_USERNAME_LENGTH - modification.length);

	return `${usernameSlice}${modification}`;
}

export { RoleIndicatorService };
