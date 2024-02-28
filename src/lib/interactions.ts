import { Locale, LocalisationLanguage } from "../constants/languages";
import time from "../constants/time";
import { Client, InteractionCollector } from "./client";

type ComposerActionRow<ComposerContent, SectionNames = keyof ComposerContent> = {
	type: Discord.MessageComponentTypes.ActionRow;
	components: [
		Discord.ActionRow["components"][0] & { type: Discord.MessageComponentTypes.InputText; customId: SectionNames },
	];
};

type Modal<ComposerContent, SectionNames = keyof ComposerContent> = {
	title: string;
	fields: ComposerActionRow<ComposerContent, SectionNames>[];
};

// TODO(vxern): This can absolutely be improved.
async function createModalComposer<ComposerContent, SectionNames extends keyof ComposerContent = keyof ComposerContent>(
	client: Client,
	interaction: Logos.Interaction,
	{
		onSubmit,
		onInvalid,
		modal,
	}: {
		onSubmit: (submission: Logos.Interaction, data: ComposerContent) => Promise<true | string>;
		onInvalid: (submission: Logos.Interaction, error?: string) => Promise<Logos.Interaction | undefined>;
		modal: Modal<ComposerContent, SectionNames>;
	},
): Promise<void> {
	const fields = structuredClone(modal.fields);

	let anchor: Logos.Interaction = interaction;
	let content: ComposerContent | undefined = undefined;

	let isSubmitting = true;
	while (isSubmitting) {
		const { promise, resolve } = Promise.withResolvers<[Logos.Interaction, boolean | string]>();

		const modalSubmit = new InteractionCollector(client, {
			type: Discord.InteractionTypes.ModalSubmit,
			only: [interaction.user.id],
			isSingle: true,
		});

		modalSubmit.onCollect(async (modalSubmit) => {
			content = parseComposerContent(modalSubmit);
			if (content === undefined) {
				return resolve([modalSubmit, false]);
			}

			const result = await onSubmit(modalSubmit, content);

			resolve([modalSubmit, result]);
		});

		client.registerInteractionCollector(modalSubmit);

		if (content !== undefined) {
			const answers = Object.values(content) as (string | undefined)[];
			for (const [value, index] of answers.map<[string | undefined, number]>((v, i) => [v, i])) {
				const field = fields[index];
				if (field === undefined) {
					throw `StateError: The number of modal fields (${fields.length}) does not correspond to the number of answers (${answers.length}).`;
				}

				field.components[0].value = value;
			}
		}

		client.displayModal(anchor, {
			title: modal.title,
			customId: modalSubmit.customId,
			components: fields,
		});

		const [submission, result] = await promise;

		if (typeof result === "boolean" && result) {
			isSubmitting = false;
			break;
		}

		const newAnchor = await (typeof result === "string" ? onInvalid(submission, result) : onInvalid(submission));
		if (newAnchor === undefined) {
			isSubmitting = false;
			break;
		}

		anchor = newAnchor;
	}
}

function parseComposerContent<ComposerContent, SectionNames extends keyof ComposerContent = keyof ComposerContent>(
	submission: Logos.Interaction,
): ComposerContent | undefined {
	const content: Partial<ComposerContent> = {};

	const fields = submission?.data?.components?.map((component) => component.components?.at(0));
	if (fields === undefined) {
		return;
	}

	for (const field of fields) {
		if (field === undefined) {
			continue;
		}

		const key = field.customId as SectionNames;
		const value = field.value ?? "";

		if (value.length === 0) {
			content[key] = undefined;
		} else {
			content[key] = value as ComposerContent[SectionNames];
		}
	}

	return content as ComposerContent;
}

// Expression to detect HH:MM:SS, MM:SS and SS timestamps.
const conciseTimeExpression = new RegExp(
	/^(?:(?:(0?[0-9]|1[0-9]|2[0-4]):)?(?:(0?[0-9]|[1-5][0-9]|60):))?(0?[0-9]|[1-5][0-9]|60)$/,
);

function parseTimeExpression(
	client: Client,
	expression: string,
	{ language, locale }: { language: LocalisationLanguage; locale: Locale },
): [correctedExpression: string, period: number] | undefined {
	const conciseMatch = conciseTimeExpression.exec(expression) ?? undefined;
	if (conciseMatch !== undefined) {
		const [_, hours, minutes, seconds] = conciseMatch;
		if (seconds === undefined) {
			throw `StateError: The expression '${conciseTimeExpression}' was matched to the concise timestamp regular expression, but the seconds part was \`undefined\`.`;
		}

		return parseConciseTimeExpression(client, [hours, minutes, seconds], { language, locale });
	}

	return parseVerboseTimeExpressionPhrase(client, expression, { language, locale });
}

function parseConciseTimeExpression(
	client: Client,
	parts: [hours: string | undefined, minutes: string | undefined, seconds: string],
	{ language, locale }: { language: LocalisationLanguage; locale: Locale },
): ReturnType<typeof parseTimeExpression> {
	const [seconds, minutes, hours] = parts.map((part) => (part !== undefined ? Number(part) : undefined)).reverse() as [
		number,
		...number[],
	];

	const verboseExpressionParts = [];

	if (seconds !== 0) {
		const strings = {
			second: client.pluralise("units.second.word", language, seconds),
		};

		verboseExpressionParts.push(strings.second);
	}

	if (minutes !== undefined && minutes !== 0) {
		const strings = {
			minute: client.pluralise("units.minute.word", language, minutes),
		};

		verboseExpressionParts.push(strings.minute);
	}

	if (hours !== undefined && hours !== 0) {
		const strings = {
			hour: client.pluralise("units.hour.word", language, hours),
		};

		verboseExpressionParts.push(strings.hour);
	}
	const verboseExpression = verboseExpressionParts.join(" ");

	const expressionParsed = parseVerboseTimeExpressionPhrase(client, verboseExpression, { language, locale });
	if (expressionParsed === undefined) {
		return undefined;
	}

	const conciseExpression = parts
		.map((part) => part ?? "0")
		.map((part) => (part.length === 1 ? `0${part}` : part))
		.join(":");

	const [verboseExpressionCorrected, period] = expressionParsed;

	return [`${conciseExpression} (${verboseExpressionCorrected})`, period];
}

type TimeUnit = "second" | "minute" | "hour" | "day" | "week" | "month" | "year";
const timeUnitToPeriod: Required<Record<TimeUnit, number>> = {
	second: time.second,
	minute: time.minute,
	hour: time.hour,
	day: time.day,
	week: time.week,
	month: time.month,
	year: time.year,
};

const timeUnitsWithAliasesLocalised = new Map<string, Record<TimeUnit, string[]>>();

function parseVerboseTimeExpressionPhrase(
	client: Client,
	expression: string,
	{ language, locale }: { language: LocalisationLanguage; locale: Locale },
): ReturnType<typeof parseTimeExpression> {
	if (!timeUnitsWithAliasesLocalised.has(locale)) {
		const timeUnits = Object.keys(timeUnitToPeriod) as TimeUnit[];
		const timeUnitAliasTuples: [TimeUnit, string[]][] = [];

		for (const timeUnit of timeUnits) {
			timeUnitAliasTuples.push([
				timeUnit,
				[
					`units.${timeUnit}.one`,
					`units.${timeUnit}.two`,
					`units.${timeUnit}.many`,
					`units.${timeUnit}.short`,
					`units.${timeUnit}.shortest`,
				].map((key) => client.localise(key, locale)()),
			]);
		}

		timeUnitsWithAliasesLocalised.set(locale, Object.fromEntries(timeUnitAliasTuples) as Record<TimeUnit, string[]>);
	}

	const timeUnitsWithAliases = timeUnitsWithAliasesLocalised.get(locale);
	if (timeUnitsWithAliases === undefined) {
		throw `Failed to get time unit aliases for locale '${locale}'.`;
	}

	function extractNumbers(expression: string): number[] {
		const digitsExpression = new RegExp(/\d+/g);
		return (expression.match(digitsExpression) ?? []).map((digits) => Number(digits));
	}

	function extractStrings(expression: string): string[] {
		const stringsExpression = new RegExp(/\p{L}+/gu);
		return expression.match(stringsExpression) ?? [];
	}

	// Extract the digits present in the expression.
	const quantifiers = extractNumbers(expression).map((string) => Number(string));
	// Extract the strings present in the expression.
	const timeUnitAliases = extractStrings(expression);

	// No parameters have been provided for both keys and values.
	if (timeUnitAliases.length === 0 || quantifiers.length === 0) {
		return undefined;
	}

	// The number of values does not match the number of keys.
	if (quantifiers.length !== timeUnitAliases.length) {
		return undefined;
	}

	// One of the values is equal to 0.
	if (quantifiers.includes(0)) {
		return undefined;
	}

	const timeUnits: TimeUnit[] = [];
	for (const timeUnitAlias of timeUnitAliases) {
		const timeUnit = Object.entries(timeUnitsWithAliases).find(([_, aliases]) => aliases.includes(timeUnitAlias))?.[0];

		// TODO(vxern): Convey to the user that a time unit is invalid.
		if (timeUnit === undefined) {
			return undefined;
		}

		timeUnits.push(timeUnit as TimeUnit);
	}

	// If one of the keys is duplicate.
	if (new Set(timeUnits).size !== timeUnits.length) {
		return undefined;
	}

	const timeUnitQuantifierTuples: [TimeUnit, number][] = [];
	for (const [timeUnit, quantifier] of timeUnits.map<[TimeUnit, number | undefined]>((timeUnit, index) => [
		timeUnit,
		quantifiers[index],
	])) {
		if (quantifier === undefined) {
			throw `Failed to get quantifier for time unit '${timeUnit}' and locale '${locale}'.`;
		}

		timeUnitQuantifierTuples.push([timeUnit, quantifier]);
	}
	timeUnitQuantifierTuples.sort(([previous], [next]) => timeUnitToPeriod[next] - timeUnitToPeriod[previous]);

	const timeExpressions = [];
	let total = 0;
	for (const [timeUnit, quantifier] of timeUnitQuantifierTuples) {
		const strings = {
			unit: client.pluralise(`units.${timeUnit}.word`, language, quantifier),
		};

		timeExpressions.push(strings.unit);

		total += quantifier * timeUnitToPeriod[timeUnit];
	}
	const correctedExpression = timeExpressions.join(", ");

	return [correctedExpression, total];
}

export { createModalComposer, parseTimeExpression };
export type { Modal };
