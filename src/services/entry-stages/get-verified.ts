import { Bot, Interaction } from 'discordeno';
import { initiateVerificationProcess } from 'logos/src/services/verification.ts';
import { Client } from 'logos/src/client.ts';

function handleRequestVerification(
	[client, bot]: [Client, Bot],
	interaction: Interaction,
	parameter: string,
): void {
	const guild = client.cache.guilds.get(interaction.guildId!);
	if (guild === undefined) return;

	const requestedRoleId = BigInt(parameter);

	return void initiateVerificationProcess([client, bot], interaction, guild, requestedRoleId);
}

export { handleRequestVerification };
