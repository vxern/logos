import { Bot, ButtonComponent, ButtonStyles, Interaction, MessageComponentTypes } from 'discordeno';
import { proficiency } from 'logos/src/commands/social/roles/categories/language.ts';
import { EntryStepButtonID } from 'logos/src/services/entry/entry.ts';
import { Client, localise } from 'logos/src/client.ts';
import { editReply, encodeId, reply } from 'logos/src/interactions.ts';
import { snowflakeToTimestamp } from 'logos/src/utils.ts';
import configuration from 'logos/configuration.ts';
import constants from 'logos/constants.ts';

async function handleAcceptRules(
	[client, bot]: [Client, Bot],
	interaction: Interaction,
	_: string,
): Promise<void> {
	const canEnter = await vetUser([client, bot], interaction);
	if (!canEnter) return;

	const guild = client.cache.guilds.get(interaction.guildId!);
	if (guild === undefined) return;

	const strings = {
		title: localise(client, 'entry.proficiency.title', interaction.locale)(),
		description: {
			chooseProficiency: localise(client, 'entry.proficiency.description.chooseProficiency', interaction.locale)({
				'language': guild.language,
			}),
			canChangeLater: localise(client, 'entry.proficiency.description.canChangeLater', interaction.locale)({
				'command': '`/profile roles`',
			}),
		},
	};

	return void editReply([client, bot], interaction, {
		embeds: [{
			title: strings.title,
			description: `${strings.description.chooseProficiency}\n\n${strings.description.canChangeLater}`,
		}],
		components: [{
			type: MessageComponentTypes.ActionRow,
			components: proficiency.collection.list.map<ButtonComponent>(
				(proficiencyRole, index) => {
					const strings = {
						name: localise(client, `${proficiencyRole.id}.name`, interaction.locale)(),
					};

					return {
						type: MessageComponentTypes.Button,
						label: strings.name,
						customId: encodeId<EntryStepButtonID>(constants.staticComponentIds.selectedLanguageProficiency, [
							index.toString(),
						]),
						style: ButtonStyles.Secondary,
						emoji: { name: proficiencyRole.emoji },
					};
				},
			) as [ButtonComponent],
		}],
	});
}

async function vetUser([client, bot]: [Client, Bot], interaction: Interaction): Promise<boolean> {
	const strings = {
		title: localise(client, 'entry.verification.verifyingAccount.verifyingAccount.title', interaction.locale)(),
		description: localise(
			client,
			'entry.verification.verifyingAccount.verifyingAccount.description',
			interaction.locale,
		)(),
	};

	await reply([client, bot], interaction, {
		embeds: [{
			title: strings.title,
			description: strings.description,
			color: constants.colors.blue,
		}],
	});

	const createdAt = snowflakeToTimestamp(interaction.user.id);

	if ((Date.now() - createdAt) < configuration.services.entry.minimumRequiredAge) {
		const strings = {
			title: localise(client, 'entry.verification.verifyingAccount.tooNew.title', interaction.locale)(),
			description: localise(client, 'entry.verification.verifyingAccount.tooNew.description', interaction.locale)(),
		};

		editReply([client, bot], interaction, {
			embeds: [{
				title: strings.title,
				description: strings.description,
				color: constants.colors.dullYellow,
			}],
		});

		return false;
	}

	const userDocument = await client.database.adapters.users.getOrFetchOrCreate(
		client,
		'id',
		interaction.user.id.toString(),
		interaction.user.id,
	);
	if (userDocument === undefined) {
		const strings = {
			title: localise(client, 'entry.verification.verifyingAccount.failed.title', interaction.locale)(),
			description: localise(client, 'entry.verification.verifyingAccount.failed.description', interaction.locale)(),
		};

		editReply([client, bot], interaction, {
			embeds: [{
				title: strings.title,
				description: strings.description,
				color: constants.colors.red,
			}],
		});

		client.log.error(
			`Failed to vet user with ID ${interaction.user.id} trying to enter the server due to their user document being returned as undefined.`,
		);

		return false;
	}

	const entryRequest = client.database.adapters.entryRequests.get(client, 'submitterAndGuild', [
		userDocument.ref,
		interaction.guildId!.toString(),
	]);

	if (entryRequest !== undefined && !entryRequest.data.isFinalised) {
		const strings = {
			title: localise(client, 'entry.verification.answers.alreadyAnswered.title', interaction.locale)(),
			description: localise(client, 'entry.verification.answers.alreadyAnswered.description', interaction.locale)(),
		};

		editReply([client, bot], interaction, {
			embeds: [{
				title: strings.title,
				description: strings.description,
				color: constants.colors.dullYellow,
			}],
		});

		return false;
	}

	if (userDocument.data.account.authorisedOn?.includes(interaction.guildId!.toString())) return true;
	if (userDocument.data.account.rejectedOn?.includes(interaction.guildId!.toString())) {
		const strings = {
			title: localise(client, 'entry.verification.answers.rejectedBefore.title', interaction.locale)(),
			description: localise(client, 'entry.verification.answers.rejectedBefore.description', interaction.locale)(),
		};

		editReply([client, bot], interaction, {
			embeds: [{
				title: strings.title,
				description: strings.description,
				color: constants.colors.red,
			}],
		});

		return false;
	}

	return true;
}

export { handleAcceptRules };
