import {
	_,
	ApplicationCommand,
	ApplicationCommandInteraction,
	ApplicationCommandOption,
	ButtonStyle,
	Collector,
	EmbedField,
	EmbedPayload,
	Guild,
	GuildChannel,
	GuildTextChannel,
	Interaction,
	InteractionResponseModal,
	InteractionResponseType,
	InteractionType,
	Invite,
	Member,
	Message,
	MessageComponentData,
	MessageComponentInteraction,
	MessageComponentType,
	Snowflake,
	TextInputStyle,
	User,
	VoiceState,
} from '../deps.ts';
import languages from 'https://deno.land/x/language@v0.1.0/languages.ts';
import { Command } from './commands/structs/command.ts';
import { Option } from './commands/structs/option.ts';
import { code } from './formatting.ts';
import { Client } from './client.ts';
import configuration from './configuration.ts';

/**
 * Makes one or more properties of `T` optional.
 *
 * @typeParam T - The type whose property to make partial.
 * @param K - The property to make partial.
 */
type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;

/**
 * 'Unpacks' a nested type from an array, function or promise.
 *
 * @typeParam T - The type from which to extract the nested type.
 */
type Unpacked<T> = T extends (infer U)[] ? U
	: T extends (...args: unknown[]) => infer U ? U
	: T extends Promise<infer U> ? U
	: T;

/**
 * Compares two command or option objects to determine which keys one or the
 * other is missing.
 *
 * @param left - The Harmony object.
 * @param right - The source object.
 * @returns An array of keys which differ between the objects.
 */
function getMissingKeys(
	left: ApplicationCommand | ApplicationCommandOption,
	right: Command | Option,
): string[];
function getMissingKeys<
	L extends ApplicationCommand | ApplicationCommandOption,
	R extends Partial<L>,
>(
	left: L,
	right: R,
): string[] {
	const leftKeys = Object.keys(left);
	const rightKeys = Object.keys(right);
	const keysToIgnore = [
		...leftKeys.filter((leftKey) => !rightKeys.includes(leftKey)),
		...rightKeys.filter((rightKey) =>
			!leftKeys.includes(rightKey) && rightKey !== 'options'
		),
	];

	const unequalKeys = _.reduce(
		right,
		(result: string[], value: unknown, key: keyof L) => {
			return _.isEqual(value, left[key])
				? result
				: result.concat(key.toString());
		},
		[],
	) as string[];

	const missingKeys = unequalKeys.filter((unequalKey) =>
		!keysToIgnore.includes(unequalKey)
	);

	return missingKeys;
}

/**
 * Finds a channel within a guild by its name.
 *
 * @param guild - The guild where to find the channel.
 * @param name - The name of the channel.
 * @returns The channel or `undefined` if not found.
 */
async function findChannelByName(
	guild: Guild,
	name: string,
): Promise<GuildChannel | undefined> {
	const channels = await guild.channels.array();
	return channels.find((channel) =>
		channel.name.toLowerCase().includes(name.toLowerCase())
	);
}

/**
 * Gets the most viable invite link to a guild.
 *
 * @param guild - The guild to which the invite link to find.
 * @returns The invite link.
 */
async function getInvite(guild: Guild): Promise<Invite> {
	const invites = await guild.invites.fetchAll();
	return invites.find((invite) =>
		invite.inviter?.id === guild.ownerID! &&
		invite.maxAge === 0
	) ??
		await guild.invites.create(
			(await findChannelByName(guild, 'welcome'))!.id,
			{ maxAge: 0, maxUses: 0, temporary: false },
		);
}

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
 * Returns a language from its ISO-693-1 language code.
 *
 * @param languageCode - The ISO-693-1 language code of a language.
 * @returns The language.
 */
function getLanguage(languageCode: string): string {
	return Object.entries(languages.lang).find(([key, _]) =>
		key === languageCode
	)![1][0];
}

/**
 * Returns the ISO-693-1 language code of a language.
 *
 * @param language - The language whose code to return.
 * @returns ISO-693-1 language code.
 */
function getLanguageCode(language: string): string {
	return Object.entries(languages.lang).find(([_, [name]]) =>
		name.toLowerCase() === language
	)![0];
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

/**
 * Taking a URL and a list of parameters, returns the URL with the parameters appended
 * to it.
 *
 * @param url - The URL to format.
 * @param parameters - The parameters to append to the URL.
 * @returns The formatted URL.
 */
function addParametersToURL(
	url: string,
	parameters: Record<string, string>,
): string {
	const query = Object.entries(parameters)
		.map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
		.join('&');

	return `${url}?${query}`;
}

/**
 * Concatenates a command's name, subcommand group and subcommand into a
 * single string representing the whole command name.
 *
 * @param command - The interaction whose command to display.
 * @returns The full command name.
 */
function displayCommand(command: ApplicationCommandInteraction): string {
	const parts = [command.name, command.subCommandGroup, command.subCommand];

	return parts.filter((part) => part).join(' ');
}

/**
 * Taking a guild and the name of a channel, finds the channel with that name
 * and returns it.
 *
 * @param guild - The guild whose channels to look through.
 * @param name - The name of the channel to find.
 * @returns The found channel.
 */
async function getChannel(
	guild: Guild,
	name: string,
): Promise<GuildTextChannel | undefined> {
	const channels = await guild.channels.array();

	const nameAsLowercase = name.toLowerCase();

	return channels.find((channel) =>
		channel.name.toLowerCase().includes(nameAsLowercase)
	) as
		| GuildTextChannel
		| undefined;
}

/**
 * Taking a user object, creates an informational mention for the user.
 *
 * @param user - The user object.
 * @returns The mention.
 */
function mentionUser(user: User, plain?: boolean): string {
	if (plain) return `${user.tag} (${user.id})`;

	return `${code(user.tag)} (${code(user.id)})`;
}

/** Represents an interactable form. */
interface Form {
	/** The title of a form. */
	title: string;

	/** The text fields defined within the form. */
	fields: {
		[key: string]: {
			/** The label on a particular text field. */
			label: string | ((language: string) => string);

			/** The 'style' of this text field. */
			style: TextInputStyle;

			/**
			 * The minimum number of characters required to be inputted into this
			 * text field.
			 */
			minimum: number;

			/** Whether this text field is required to be filled or not. */
			required?: boolean;

			/** The filled content of this text field. */
			value?: string;

			/**
			 * The maximum number of characters allowed to be inputted into this
			 * text field.
			 */
			maximum: number;
		};
	};
}

/**
 * Taking a form object, converts it to a modal.
 *
 * @param form - The form to convert.
 * @param customID - The custom ID of the modal.
 * @param language - (Optional) The language of the guild the modal is being created for.
 * @returns The form converted into a modal.
 */
function toModal(
	form: Form,
	customID: string,
	language?: string,
): InteractionResponseModal {
	const components = Object.entries(form.fields).map<MessageComponentData>(
		([name, field]) => ({
			type: MessageComponentType.ACTION_ROW,
			components: [
				{
					type: MessageComponentType.TEXT_INPUT,
					customID: `${customID}|${name}`,
					label: typeof field.label === 'function'
						? field.label(language!)
						: field.label,
					style: field.style,
					value: field.value,
					required: field.required,
					minLength: field.minimum === 0 ? undefined : field.minimum,
					maxLength: field.maximum,
				},
			],
		}),
	);

	return {
		title: form.title,
		customID: customID,
		components: components,
	};
}

/**
 * Takes an array, duplicates it, shuffles it and returns the shuffled view.
 *
 * @param array - The array to shuffle.
 * @returns The shuffled array.
 */
function shuffle<T>(array: T[]): T[] {
	const shuffled = Array.from(array);

	for (let index = 0; index < array.length - 1; index++) {
		const random = Math.floor(Math.random() * (index + 1));
		const temporary = shuffled[index]!;
		shuffled[index] = shuffled[random]!;
		shuffled[random] = temporary!;
	}

	return shuffled;
}

/**
 * Paginates an array of elements, allowing the user to browse between pages
 * in an embed view.
 */
async function paginate<T>(
	{
		interaction,
		elements,
		embed,
		view,
		show,
	}: {
		interaction: Interaction;
		elements: T[];
		embed: Omit<EmbedPayload, 'fields' | 'footer'>;
		view: {
			title: string;
			generate: (element: T, index: number) => string;
		};
		show: boolean;
	},
): Promise<void> {
	let index = 0;

	const isFirst = () => index === 0;
	const isLast = () => index === elements.length - 1;

	function generateEmbed(): EmbedPayload {
		const field = view.generate(elements[index]!, index);

		return {
			...embed,
			fields: [{
				name: elements.length === 1
					? view.title
					: `${view.title} ~ Page ${index + 1}/${elements.length}`,
				value: field,
			}],
			footer: isLast() ? undefined : { text: 'Continued on the next page...' },
		};
	}

	function generateButtons(): MessageComponentData[] {
		const buttons: MessageComponentData[] = [];

		if (!isFirst()) {
			buttons.push({
				type: MessageComponentType.BUTTON,
				customID: 'ARTICLE|PREVIOUS',
				style: ButtonStyle.GREY,
				label: '«',
			});
		}

		if (!isLast()) {
			buttons.push({
				type: MessageComponentType.BUTTON,
				customID: 'ARTICLE|NEXT',
				style: ButtonStyle.GREY,
				label: '»',
			});
		}

		return buttons.length === 0 ? [] : [{
			type: MessageComponentType.ACTION_ROW,
			components: buttons,
		}];
	}

	const response = await interaction.respond({
		embeds: [generateEmbed()],
		components: generateButtons(),
		ephemeral: !show,
	});
	const message = await response.fetchResponse();

	const collector = new Collector({
		event: 'interactionCreate',
		client: interaction.client,
		filter: (selection: Interaction) => {
			if (!selection.isMessageComponent()) return false;

			if (selection.message.id !== message.id) return false;

			if (selection.user.id !== interaction.user.id) return false;

			if (!selection.customID.startsWith('ARTICLE')) return false;

			return true;
		},
		deinitOnEnd: true,
	});

	collector.on('collect', (selection: MessageComponentInteraction) => {
		const action = selection.customID.split('|')[1]!;

		switch (action) {
			case 'PREVIOUS':
				if (!isFirst()) index--;
				break;
			case 'NEXT':
				if (!isLast()) index++;
				break;
		}

		selection.respond({
			type: InteractionResponseType.DEFERRED_MESSAGE_UPDATE,
		});

		interaction.editResponse({
			embeds: [generateEmbed()],
			components: generateButtons(),
		});
	});

	collector.collect();
}

type ConditionChecker = (interaction: Interaction) => boolean;

/** Settings for interaction collection. */
interface InteractionCollectorSettings {
	/** The type of interaction to listen for. */
	type: InteractionType;

	/** The accepted respondent to the collector. `undefined` signifies any user. */
	user?: User;

	/** The ID of the interaction to listen for. */
	customID?: string;

	/** Whether this collector is to last forever or not. */
	endless?: boolean;

	/** How many interactions to collect before de-initialising. */
	limit?: number;
}

/**
 * Taking a {@link Client} and {@link InteractionCollectorSettings}, creates an
 * interaction collector.
 */
function createInteractionCollector(
	client: Client,
	settings: InteractionCollectorSettings,
): [collector: Collector, customID: string, isEnded: () => boolean] {
	const customID = settings.customID ?? Snowflake.generate();

	const conditionsUnfiltered: (ConditionChecker | undefined)[] = [
		(interaction) => interaction.type === settings.type,
		(interaction) =>
			!!interaction.data && 'custom_id' in interaction.data &&
			(!interaction.data.custom_id.includes('|')
					? interaction.data.custom_id
					: interaction.data.custom_id.split('|')[0]) ===
				(!customID.includes('|') ? customID : customID.split('|')[0]),
		!settings.user ? undefined
		: (interaction) => interaction.user.id === settings.user!.id,
	];

	const conditions = conditionsUnfiltered.filter((condition) =>
		condition
	) as ConditionChecker[];

	const condition = (interaction: Interaction) =>
		conditions.every((condition) => condition(interaction));

	const collector = new Collector<Interaction[]>({
		event: 'interactionCreate',
		client: client,
		filter: condition,
		max: settings.limit ?? undefined,
		deinitOnEnd: true,
		timeout: settings.endless
			? undefined
			: configuration.core.collectors.maxima.timeout,
	});

	let isEnded = false;
	collector.on('end', () => {
		isEnded = true;
	});

	collector.collect();

	return [collector, customID, () => isEnded];
}

/** Creates a verification prompt in the verifications channel. */
async function createVerificationPrompt(
	client: Client,
	guild: Guild,
	settings: { title: string; fields: EmbedField[] },
): Promise<[boolean, Member]> {
	const verificationChannel = (await getChannel(
		guild,
		configuration.guilds.channels.verification,
	))!;

	const [collector, customID] = createInteractionCollector(client, {
		type: InteractionType.MESSAGE_COMPONENT,
		endless: true,
		limit: 1,
	});

	const verificationMessage = await verificationChannel.send({
		embeds: [{
			title: settings.title,
			fields: settings.fields,
		}],
		components: [{
			type: MessageComponentType.ACTION_ROW,
			components: [{
				type: MessageComponentType.BUTTON,
				style: ButtonStyle.GREEN,
				label: 'Accept',
				customID: `${customID}|true`,
			}, {
				type: MessageComponentType.BUTTON,
				style: ButtonStyle.RED,
				label: 'Reject',
				customID: `${customID}|false`,
			}],
		}],
	});

	const selection =
		(await collector.waitFor('collect'))[0] as MessageComponentInteraction;

	const accepted = selection.data!.custom_id.split('|')[1]! === 'true';

	verificationMessage.delete();

	return [accepted, selection.member!];
}

/** Creates a DM with the given user. */
function messageUser(
	user: User,
	guild: Guild,
	embed: Omit<EmbedPayload, 'thumbnail' | 'footer'>,
	components?: MessageComponentData[],
): Promise<Message> {
	const guildName = guild!.name!;

	return user.send({
		embeds: [{
			thumbnail: { url: guild!.iconURL(undefined, 64) },
			...embed,
			footer: {
				text: `This message originated from ${guildName}.`,
			},
		}],
		components: components,
	});
}

/**
 * Gets the voice state of a member within a guild.
 *
 * @param member - The member whose voice state to get.
 * @returns The voice state or `undefined`.
 */
function getVoiceState(member: Member): Promise<VoiceState | undefined> {
	return member.guild.voiceStates.resolve(member.user.id);
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

/** The maximum number of members that can be fetched at any one time. */
const maximumMembersPerFetch = 1000;

/**
 * Fetches the complete list of guild members.
 *
 * @param guild - The guild to fetch the members for.
 * @return The members of the guild.
 */
async function fetchGuildMembers(guild: Guild): Promise<Member[]> {
	const memberList: Member[] = [];

	let fetchedMembersNumber = -1;
	while (
		fetchedMembersNumber === -1 ||
		fetchedMembersNumber === maximumMembersPerFetch
	) {
		const last = memberList.length === 0
			? undefined
			: memberList[memberList.length - 1];
		// deno-lint-ignore no-await-in-loop
		const fetchedMembers = await guild.members.fetchList(
			maximumMembersPerFetch,
			last?.id,
		);
		fetchedMembersNumber = fetchedMembers.length;
		memberList.push(...fetchedMembers);
	}

	return memberList;
}

export {
	addParametersToURL,
	chunk,
	createInteractionCollector,
	createVerificationPrompt,
	displayCommand,
	fetchGuildMembers,
	findChannelByName,
	fromHex,
	getChannel,
	getInvite,
	getLanguage,
	getLanguageCode,
	getMissingKeys,
	getVoiceState,
	mentionUser,
	messageUser,
	paginate,
	random,
	shuffle,
	toModal,
	trim,
};
export type { Form, Optional, Unpacked };
