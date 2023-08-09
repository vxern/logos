import { Guild, RoleWithIndicator } from "../../database/structs/guild";
import { LocalService } from "../service";
import * as Discord from "discordeno";
import * as Logos from "../../../types";
import symbols from "../../../constants/types/symbols";
import constants from "../../../constants/constants";

type Configuration = NonNullable<NonNullable<Guild["features"]["server"]["features"]>["roleIndicators"]>;

class RoleIndicatorService extends LocalService {
	get configuration(): Configuration | undefined {
		const guildDocument = this.guildDocument;
		if (guildDocument === undefined) {
			return undefined;
		}

		return guildDocument.data.features.server.features?.roleIndicators;
	}

	async start(bot: Discord.Bot): Promise<void> {
		const [configuration, guild] = [this.configuration, this.guild];
		if (configuration === undefined || guild === undefined) {
			return;
		}

		if (!configuration.enabled) {
			return;
		}

		for (const member of guild.members.array()) {
			if (member.user === undefined) {
				continue;
			}

			await this.guildMemberUpdate(bot, member, member.user);
		}
	}

	async guildMemberUpdate(
		bot: Discord.Bot,
		member: Discord.Member | Logos.Member,
		user: Discord.User | Logos.User,
	): Promise<void> {
		const [configuration, guild] = [this.configuration, this.guild];
		if (configuration === undefined || guild === undefined) {
			return;
		}

		if (!configuration.enabled) {
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
			Discord.editMember(bot, member.guildId, user.id, { nick: nickname }).catch(() =>
				console.warn("Failed to set member's role indicators."),
			);

			// Fix for Discordeno rate-limiting being broken.
			await new Promise((resolve) => setTimeout(resolve, 3000));

			return;
		}

		const matchResult = constants.patterns.roleIndicators.exec(member.nick) ?? undefined;
		const hasIndicators = matchResult !== undefined;
		if (!hasIndicators) {
			if (!hasApplicableIndicators) {
				return;
			}

			const nickname = applyIndicators(member.nick, applicableIndicators);
			Discord.editMember(bot, member.guildId, user.id, { nick: nickname }).catch(() =>
				console.warn("Failed to set member's role indicators."),
			);

			// Fix for Discordeno rate-limiting being broken.
			await new Promise((resolve) => setTimeout(resolve, 3000));

			return;
		}

		const [_, username, indicatorsFormatted] = matchResult;
		if (username === undefined || indicatorsFormatted === undefined) {
			return;
		}

		if (!hasApplicableIndicators) {
			Discord.editMember(bot, member.guildId, user.id, { nick: username }).catch(() =>
				console.warn("Failed to reset member's role indicators."),
			);

			// Fix for Discordeno rate-limiting being broken.
			await new Promise((resolve) => setTimeout(resolve, 3000));

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
		Discord.editMember(bot, member.guildId, user.id, { nick: nicknameModified }).catch(() =>
			console.warn("Failed to update member's role indicators."),
		);

		// Fix for Discordeno rate-limiting being broken.
		await new Promise((resolve) => setTimeout(resolve, 3000));
	}
}

const MAXIMUM_USERNAME_LENGTH = 32;

function applyIndicators(username: string, sigils: string[]): string {
	const modification = `${symbols.sigils.divider}${sigils.join(symbols.sigils.separator)}`;
	const usernameSlice = username.slice(0, MAXIMUM_USERNAME_LENGTH - modification.length);

	return `${usernameSlice}${modification}`;
}

export { RoleIndicatorService };
