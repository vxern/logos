import {
	AuditLogEntry,
	AuditLogEvents,
	ButtonStyle,
	InteractionType,
	Member,
	MessageComponentInteraction,
	MessageComponentType,
} from '../../../../deps.ts';
import { Client } from '../../../client.ts';
import configuration from '../../../configuration.ts';
import {
	createInteractionCollector,
	mentionUser,
	messageUser,
} from '../../../utils.ts';
import { modifyRoles } from '../../roles/data/structures/role.ts';
import { ServiceStarter } from '../../service.ts';

const actionsByUserID = new Map<string, EnforcementAction[]>();

interface EnforcementAction {
	member: Member;
	entry: AuditLogEntry;
	createdAt: number;
}

const service: ServiceStarter = (client) => {
	client.on('guildMemberRemove', async (member) => {
		if (member.user.bot) return;

		const madeAt = Date.now();

		const entry = await resolveAuditLogEntry({
			member: member,
			events: [AuditLogEvents.MemberBanAdd, AuditLogEvents.MemberKick],
			targetID: member.user.id,
		});

		if (!entry) return;

		registerEntry(client, {
			member: member,
			entry: entry,
			createdAt: madeAt,
		});
	});
};

function registerEntry(client: Client, action: EnforcementAction): void {
	if (!actionsByUserID.has(action.entry.userID)) {
		actionsByUserID.set(action.entry.userID, []);
	}

	actionsByUserID.get(action.entry.userID)!.push(action);

	verifyEnforcer(client, action);
}

async function verifyEnforcer(
	client: Client,
	action: EnforcementAction,
): Promise<void> {
	const actions = actionsByUserID.get(action.entry.userID)!;

	const actionsInInterval = actions.filter((action) =>
		(Date.now() - action.createdAt) <=
			configuration.guilds.moderation.antiAbuse.interval
	);

	const members = actionsInInterval.map((action) => action.member);

	let passedThreshold:
		| { age: number; string: string; maximum: number }
		| undefined = undefined;

	const membersInThresholds = configuration.guilds.moderation.antiAbuse
		.thresholds.reduce<string[][]>(
			(membersInThresholds, threshold) => {
				const applicableMembers = members.filter((member) => {
					const joinDate = new Date(member.joinedAt).getTime();

					return ((Date.now() - joinDate) * 1000 >= threshold.age);
				}).map((member) => member.id);

				const previousThreshold =
					membersInThresholds[membersInThresholds.length - 1] ?? [];
				const inThreshold = applicableMembers.filter((member) =>
					!previousThreshold.includes(member)
				);

				membersInThresholds.push(inThreshold);

				return membersInThresholds;
			},
			[],
		);

	for (
		let i = 0;
		i < configuration.guilds.moderation.antiAbuse.thresholds.length;
		i++
	) {
		const threshold = configuration.guilds.moderation.antiAbuse.thresholds[i]!;
		const members = membersInThresholds[i]!;

		if (members.length > threshold.maximum) {
			passedThreshold = threshold;
			break;
		}
	}

	if (!passedThreshold) return;

	const enforcer =
		(await action.member.guild.members.get(action.entry.userID)) ??
			(await action.member.guild.members.fetch(action.entry.userID));

	modifyRoles({
		member: enforcer,
		roles: {
			add: [{
				name: configuration.guilds.moderation.antiAbuse.replacementRole,
			}],
			remove: [{ name: configuration.guilds.moderation.enforcer }],
		},
	});

	messageUser(enforcer.user, action.member.guild, {
		title: 'D\'oh!',
		description:
			'Your account has taken too much enforcement action recently. Your account has been placed under review.',
		color: configuration.interactions.responses.colors.red,
	});

	client.logging.get(action.member.guild.id)?.log(
		'moderatorInquest',
		enforcer,
		client.user!,
	);

	const owner =
		(await action.member.guild.members.get(configuration.guilds.owner.id)) ??
			(await action.member.guild.members.fetch(configuration.guilds.owner.id));

	const [collector, customID] = createInteractionCollector(client, {
		type: InteractionType.MESSAGE_COMPONENT,
		user: owner.user,
		endless: true,
		limit: 1,
	});

	const verificationMessage = await messageUser(
		owner.user,
		action.member.guild,
		{
			title: '❗ Moderator infraction detected.',
			description: `${
				mentionUser(enforcer.user)
			} has taken too many moderation actions in a short span of time, and has been placed under review. (More than ${passedThreshold.maximum} bans/kicks of accounts that were ${passedThreshold.string} old, with ${actionsInInterval.length} bans/kicks in the past day)`,
			color: configuration.interactions.responses.colors.red,
		},
		[{
			type: MessageComponentType.ACTION_ROW,
			components: [{
				type: MessageComponentType.BUTTON,
				style: ButtonStyle.GREEN,
				label: 'Pass',
				customID: `${customID}|true`,
			}, {
				type: MessageComponentType.BUTTON,
				style: ButtonStyle.RED,
				label: 'Fail',
				customID: `${customID}|false`,
			}],
		}],
	);

	const selection =
		(await collector.waitFor('collect'))[0] as MessageComponentInteraction;

	const verified = selection.data!.custom_id.split('|')[1]! === 'true';

	verificationMessage.delete();

	client.logging.get(action.member.guild.id)?.log(
		verified ? 'moderatorInquestPass' : 'moderatorInquestFail',
		enforcer,
		selection.user,
	);

	if (!verified) {
		actionsByUserID.delete(enforcer.user.id);

		enforcer.ban('Intentional abuse of moderation powers.');

		return;
	}

	actionsByUserID.set(enforcer.user.id, []);

	modifyRoles({
		member: enforcer,
		roles: {
			add: [{
				name: configuration.guilds.moderation.enforcer,
			}],
			remove: [{
				name: configuration.guilds.moderation.antiAbuse.replacementRole,
			}],
		},
	});
}

async function resolveAuditLogEntry(
	{ member, events, targetID }: {
		member: Member;
		events: AuditLogEvents[];
		targetID: string;
	},
): Promise<AuditLogEntry | undefined> {
	const auditLog = await member.guild.fetchAuditLog();

	const entry = auditLog.entries.find((entry) =>
		events.includes(entry.actionType) &&
		entry.targetID === targetID
	);

	return entry;
}

export default service;
