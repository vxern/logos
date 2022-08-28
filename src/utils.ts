import {
	_,
	ActionRow,
	ApplicationCommandFlags,
	ButtonComponent,
	ButtonStyles,
	Channel,
	ChannelTypes,
	deleteMessage,
	DiscordEmbedField,
	editInteractionResponse,
	Embed,
	EventHandlers,
	Guild,
	Interaction,
	InteractionApplicationCommandCallbackData,
	InteractionResponseTypes,
	InteractionTypes,
	Member,
	MessageComponents,
	MessageComponentTypes,
	SelectOption,
	sendInteractionResponse,
	sendMessage,
	Snowflake,
	TextStyles,
	User,
} from '../deps.ts';
import { code } from './formatting.ts';
import { addCollector, Client } from './client.ts';
import configuration from './configuration.ts';
import { Language } from './types.ts';

/**
 * Parses a 6-digit hex value prefixed with a hashtag to a number.
 *
 * @param color - The color represented as a 6-digit hexadecimal value prefixed
 * with a hashtag.
 * @returns The decimal form.
 */
function fromHex(color: string): number {
	return parseInt(color.replace('#', '0x'));
}

/**
 * Taking a guild and the name of a channel, finds the channel with that name
 * and returns it.
 *
 * @param guild - The guild whose channels to look through.
 * @param name - The name of the channel to find.
 * @returns The found channel.
 */
function getTextChannel(
	guild: Guild,
	name: string,
): Channel | undefined {
	const nameAsLowercase = name.toLowerCase();

	const textChannels = guild.channels.array().filter((channel) =>
		channel.type === ChannelTypes.GuildText
	);

	return textChannels.find((channel) =>
		channel.name!.toLowerCase().includes(nameAsLowercase)
	);
}

/**
 * Taking a user object, creates an informational mention for the user.
 *
 * @param user - The user object.
 * @returns The mention.
 */
function mentionUser(user: User, plain?: boolean): string {
	const tag = `${user.username}#${user.discriminator}`;

	if (plain) return `${tag} (${user.id})`;

	return `${code(tag)} (${code(user.id.toString())})`;
}

/** Represents an interactable form. */
interface Form {
	/** The title of a form. */
	title: string;

	/** The text fields defined within the form. */
	fields: {
		[key: string]:
			& {
				/** The label on a particular text field. */
				label: string | ((language: string) => string);
			}
			& ({
				type: 'TEXT_INPUT';

				/** The 'style' of this text field. */
				style: TextStyles;

				/** Whether this text field is required to be filled or not. */
				required?: boolean;

				/** The filled content of this text field. */
				value?: string;

				/**
				 * The minimum number of characters required to be inputted into this
				 * text field.
				 */
				minimum: number;

				/**
				 * The maximum number of characters allowed to be inputted into this
				 * text field.
				 */
				maximum: number;
			} | {
				type: 'SELECT';

				/** The available selection options. */
				options: SelectOption[];

				/** The minimum number of selections to be made. */
				minimum: number | undefined;

				/** The maximum number of selections to be made. */
				maximum: number | undefined;
			});
	};
}

/**
 * Taking a form object, converts it to a modal.
 *
 * @param form - The form to convert.
 * @param customId - The custom ID of the modal.
 * @param language - (Optional) The language of the guild the modal is being created for.
 * @returns The form converted into a modal.
 */
function toModal(
	form: Form,
	customId: string,
	language?: Language,
): InteractionApplicationCommandCallbackData {
	const components = Object.entries(form.fields).map<ActionRow>(
		([name, field]) => {
			const idWithFieldName = `${customId}|${name}`;
			const label = typeof field.label === 'function'
				? field.label(language!)
				: field.label;

			return {
				type: MessageComponentTypes.ActionRow,
				components: [
					field.type === 'TEXT_INPUT'
						? {
							type: MessageComponentTypes.InputText,
							customId: idWithFieldName,
							label: label,
							style: field.style,
							value: field.value,
							required: field.required,
							minLength: field.minimum === 0 ? undefined : field.minimum,
							maxLength: field.maximum,
						}
						: {
							type: MessageComponentTypes.SelectMenu,
							customId: idWithFieldName,
							placeholder: label,
							minValues: field.minimum,
							maxValues: field.maximum,
							options: field.options,
						},
				],
			};
		},
	);

	return {
		title: form.title,
		customId: customId,
		components: components,
	};
}

/**
 * Paginates an array of elements, allowing the user to browse between pages
 * in an embed view.
 */
function paginate<T>(
	client: Client,
	interaction: Interaction,
	{
		elements,
		embed,
		view,
		show,
	}: {
		elements: T[];
		embed: Omit<Embed, 'fields' | 'footer'>;
		view: {
			title: string;
			generate: (element: T, index: number) => string;
		};
		show: boolean;
	},
): void {
	let index = 0;

	const isFirst = () => index === 0;
	const isLast = () => index === elements.length - 1;

	const generateEmbed: () => Embed[] = () => [{
		...embed,
		fields: [{
			name: elements.length === 1
				? view.title
				: `${view.title} ~ Page ${index + 1}/${elements.length}`,
			value: view.generate(elements[index]!, index),
		}],
		footer: isLast() ? undefined : { text: 'Continued on the next page...' },
	}];

	function generateButtons(): MessageComponents {
		const buttons: ButtonComponent[] = [];

		if (!isFirst()) {
			buttons.push({
				type: MessageComponentTypes.Button,
				customId: `${customId}|PREVIOUS`,
				style: ButtonStyles.Secondary,
				label: '«',
			});
		}

		if (!isLast()) {
			buttons.push({
				type: MessageComponentTypes.Button,
				customId: `${customId}|NEXT`,
				style: ButtonStyles.Secondary,
				label: '»',
			});
		}

		return buttons.length === 0 ? [] : [{
			type: MessageComponentTypes.ActionRow,
			components: <[ButtonComponent] | [
				ButtonComponent | ButtonComponent,
			]> buttons,
		}];
	}

	const customId = createInteractionCollector(client, {
		type: InteractionTypes.MessageComponent,
		doesNotExpire: true,
		limit: 1,
		onCollect: (bot, selection) => {
			if (!selection.data) return;
			const action = selection.data.customId!.split('|')[1]!;

			switch (action) {
				case 'PREVIOUS':
					if (!isFirst()) index--;
					break;
				case 'NEXT':
					if (!isLast()) index++;
					break;
			}

			sendInteractionResponse(bot, selection.id, selection.token, {
				type: InteractionResponseTypes.DeferredUpdateMessage,
			});

			editInteractionResponse(bot, interaction.token, {
				embeds: generateEmbed(),
				components: generateButtons(),
			});
		},
	});

	return void sendInteractionResponse(
		client.bot,
		interaction.id,
		interaction.token,
		{
			type: InteractionResponseTypes.ChannelMessageWithSource,
			data: {
				flags: !show ? ApplicationCommandFlags.Ephemeral : undefined,
				embeds: generateEmbed(),
			},
		},
	);
}

/** Settings for interaction collection. */
interface InteractionCollectorSettings {
	/** The type of interaction to listen for. */
	type: InteractionTypes;

	/**
	 * The accepted respondent to the collector. If unset, any user will be able
	 * to respond.
	 */
	userId?: bigint;

	/** The ID of the interaction to listen for. */
	customId?: string;

	/** Whether this collector is to last forever or not. */
	doesNotExpire?: boolean;

	/** How many interactions to collect before de-initialising. */
	limit?: number;

	onCollect?: (...args: Parameters<EventHandlers['interactionCreate']>) => void;
	onEnd?: () => void;
}

/**
 * Taking a {@link Client} and {@link InteractionCollectorSettings}, creates an
 * interaction collector.
 */
function createInteractionCollector(
	client: Client,
	settings: InteractionCollectorSettings,
): string {
	const customId = settings.customId ?? Snowflake.generate();

	const conditions: (interaction: Interaction) => boolean[] = (interaction) => [
		interaction.type === settings.type,
		!!interaction.data && !!interaction.data.customId &&
		(
				!interaction.data.customId.includes('|')
					? interaction.data.customId
					: interaction.data.customId.split('|')[0]!
			) === (
				!customId.includes('|') ? customId : customId.split('|')[0]!
			),
		!settings.userId ? true : interaction.user.id === settings.userId,
	];

	addCollector(client, 'interactionCreate', {
		filter: (_bot, interaction) =>
			conditions(interaction).every((condition) => condition),
		limit: settings.limit,
		removeAfter: settings.doesNotExpire
			? undefined
			: configuration.core.collectors.maxima.timeout,
		onCollect: settings.onCollect ?? (() => {}),
		onEnd: settings.onEnd ?? (() => {}),
	});

	return customId;
}

/** Creates a verification prompt in the verifications channel. */
function createVerificationPrompt(
	client: Client,
	guildId: bigint,
	settings: { title: string; fields: DiscordEmbedField[] },
): Promise<[boolean, Member] | undefined> {
	const guild = client.guilds.get(guildId);
	if (!guild) return new Promise(() => undefined);

	const verificationChannel = guild.channels.array().find((channel) =>
		channel.type === ChannelTypes.GuildText &&
		channel.name?.toLowerCase().includes(
			configuration.guilds.channels.verification,
		)
	);
	if (!verificationChannel) return new Promise(() => undefined);

	return new Promise((resolve) => {
		const customId = createInteractionCollector(client, {
			type: InteractionTypes.MessageComponent,
			doesNotExpire: true,
			limit: 1,
			onCollect: async (bot, interaction) => {
				const verificationMessage = await verificationMessagePromise;

				deleteMessage(
					bot,
					verificationMessage.channelId,
					verificationMessage.id,
				);

				const customId = interaction.data?.customId;
				if (!customId) return;

				const accepted = customId.split('|')[1]! === 'true';

				resolve([accepted, interaction.member!]);
			},
		});

		const verificationMessagePromise = sendMessage(
			client.bot,
			verificationChannel.id,
			{
				embeds: [{
					title: settings.title,
					fields: settings.fields,
				}],
				components: [{
					type: MessageComponentTypes.ActionRow,
					components: [{
						type: MessageComponentTypes.Button,
						label: 'Accept',
						customId: `${customId}|true`,
						style: ButtonStyles.Success,
					}, {
						type: MessageComponentTypes.Button,
						label: 'Reject',
						customId: `${customId}|false`,
						style: ButtonStyles.Danger,
					}],
				}],
			},
		);
	});
}

/**
 * Taking an array, splits it into parts of equal sizes.
 *
 * @param array - The array to chunk.
 * @param size - The size of each chunk.
 * @returns The chunked array.
 */
function chunk<T>(array: T[], size: number): T[][] {
	if (array.length === 0) return [[]];

	const chunks = [];
	for (let index = 0; index < array.length; index += size) {
		chunks.push(array.slice(index, index + size));
	}
	return chunks;
}

/**
 * Taking a string, trims it to the desired length and returns it.
 *
 * @param string - The string to trim.
 * @param length - The desired length.
 * @returns The trimmed string.
 */
function trim(string: string, length: number): string {
	return string.length <= length
		? string
		: `${string.slice(0, Math.max(length - 3, 0))}...`;
}

/**
 * Generates a pseudo-random number.
 *
 * @param max - The maximum value to generate.
 * @returns A pseudo-random number between 0 and {@link max}.
 */
function random(max: number): number {
	return Math.floor(Math.random() * max);
}

const userMentionExpression = new RegExp(/^<@!?([0-9]{18})>$/);
const userIDExpression = new RegExp(/^[0-9]{18}$/);

function resolveUserIdentifier(
	client: Client,
	guildId: bigint,
	members: Member[],
	identifier: string,
	options: { includeBots: boolean } = { includeBots: false },
): User[] | undefined {
	let id: string | undefined = undefined;
	id ??= userMentionExpression.exec(identifier)?.at(1);
	id ??= userIDExpression.exec(identifier)?.at(0);

	if (!id) {
		const users: User[] = [];
		for (const member of members) {
			const user = client.users.get(member.id);
			if (!user) continue;

			users.push(user);
		}

		const identifierLowercase = identifier.toLowerCase();
		return users.filter((user, index) => {
			if (!options.includeBots && user.toggles.bot) return false;
			if (user.username.toLowerCase().includes(identifierLowercase)) {
				return true;
			}
			if (members[index]!.nick?.toLowerCase().includes(identifierLowercase)) {
				return true;
			}
			return false;
		});
	}

	const guild = client.guilds.get(guildId);
	if (!guild) return;

	const user = client.users.get(BigInt(id));
	if (!user) return;

	return [user];
}

const beginningOfDiscordEpoch = 1420070400000n;
const snowflakeBitsToDiscard = 22n;

function snowflakeToTimestamp(snowflake: bigint): number {
	return Number(
		(snowflake >> snowflakeBitsToDiscard) + beginningOfDiscordEpoch,
	);
}

export {
	chunk,
	createInteractionCollector,
	createVerificationPrompt,
	fromHex,
	getTextChannel,
	mentionUser,
	paginate,
	random,
	resolveUserIdentifier,
	snowflakeToTimestamp,
	toModal,
	trim,
};
export type { Form };
