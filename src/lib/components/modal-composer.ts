import { InputTextComponent } from "@discordeno/bot";
import { Client } from "../client";
import { InteractionCollector } from "../collectors";

type TypedInputTextComponent<CustomID> = WithRequired<InputTextComponent, "value"> & { customId: CustomID };
interface ModalElement<FormData> {
	type: Discord.MessageComponentTypes.ActionRow;
	components: [TypedInputTextComponent<keyof FormData>];
}
interface Modal<FormData> {
	title: string;
	elements: ModalElement<FormData>[];
}
type SubmitEvent<FormData> = (
	interaction: Logos.Interaction,
	localeData: Logos.InteractionLocaleData,
	{ formData }: { formData: FormData },
) => Promise<void>;
// TODO(vxern): Test.
// TODO(vxern): There should be some feedback for when something goes wrong when submitting the form.
/**
 * @remarks
 * IMPORTANT: When creating a new modal composer and implementing {@link buildModal}, make sure to link all of the
 * properties of {@link formData} to all of the modal fields, otherwise data __will get lost__ if the user's initial
 * form data is rejected and they choose to return to the form.
 */
abstract class ModalComposer<FormData, ValidationError extends string> {
	readonly client: Client;

	anchor: Logos.Interaction;

	#formData: FormData;
	#onSubmit?: SubmitEvent<FormData>;

	readonly #_submissions: InteractionCollector;

	constructor(
		client: Client,
		{ interaction, initialFormData }: { interaction: Logos.Interaction; initialFormData?: FormData },
	) {
		this.client = client;

		this.anchor = interaction;

		this.#formData = initialFormData ?? ({} as FormData);

		this.#_submissions = new InteractionCollector(client, {
			type: Discord.InteractionTypes.ModalSubmit,
			only: [interaction.user.id],
		});
	}

	static getFormData<FormData>(submission: Logos.Interaction): FormData | undefined {
		const content: Record<string, string | undefined> = {};

		const fields = submission.data?.components?.map((component) => component.components?.at(0));
		if (fields === undefined) {
			return undefined;
		}

		for (const field of fields) {
			if (field === undefined) {
				continue;
			}

			if (field.customId === undefined) {
				throw "StateError: The custom ID of a submitted modal field was missing.";
			}

			const key = field.customId;
			const value = field.value ?? "";

			if (value.length !== 0) {
				content[key] = value;
			} else {
				content[key] = undefined;
			}
		}

		return content as FormData;
	}

	abstract buildModal(
		interaction: Logos.Interaction,
		localeData: Logos.InteractionLocaleData,
		{ formData }: { formData: FormData },
	): Promise<Modal<FormData>>;

	async validate(_: { formData: FormData }): Promise<ValidationError | undefined> {
		return undefined;
	}

	getErrorMessage(
		_: Logos.Interaction,
		__: Logos.InteractionLocaleData,
		___: { error: ValidationError },
	): Discord.CamelizedDiscordEmbed | undefined {
		return undefined;
	}

	async #display(): Promise<void> {
		const modal = await this.buildModal(this.anchor, this.anchor, { formData: this.#formData });

		await this.client.displayModal(this.anchor, {
			title: modal.title,
			customId: this.#_submissions.customId,
			components: modal.elements,
		});
	}

	async handleInvalid(
		submission: Logos.Interaction,
		{ error }: { error: ValidationError },
	): Promise<Logos.Interaction | undefined> {
		const locale = submission.locale;

		const { promise, resolve } = Promise.withResolvers<Logos.Interaction | undefined>();

		const continueButton = new InteractionCollector(this.client, { only: [submission.user.id], isSingle: true });
		const cancelButton = new InteractionCollector(this.client, { only: [submission.user.id] });
		const returnButton = new InteractionCollector(this.client, {
			only: [submission.user.id],
			isSingle: true,
			dependsOn: cancelButton,
		});
		const leaveButton = new InteractionCollector(this.client, {
			only: [submission.user.id],
			isSingle: true,
			dependsOn: cancelButton,
		});

		continueButton.onCollect(async (buttonPress) => {
			this.client.deleteReply(submission);
			resolve(buttonPress);
		});

		cancelButton.onCollect(async (cancelButtonPress) => {
			returnButton.onCollect(async (returnButtonPress) => {
				this.client.deleteReply(submission);
				this.client.deleteReply(cancelButtonPress);
				resolve(returnButtonPress);
			});

			leaveButton.onCollect(async (_) => {
				this.client.deleteReply(submission);
				this.client.deleteReply(cancelButtonPress);
				resolve(undefined);
			});

			const strings = {
				title: this.client.localise("report.strings.sureToCancel.title", locale)(),
				description: this.client.localise("report.strings.sureToCancel.description", locale)(),
				stay: this.client.localise("prompts.stay", locale)(),
				leave: this.client.localise("prompts.leave", locale)(),
			};

			this.client.reply(cancelButtonPress, {
				embeds: [
					{
						title: strings.title,
						description: strings.description,
						color: constants.colours.dullYellow,
					},
				],
				components: [
					{
						type: Discord.MessageComponentTypes.ActionRow,
						components: [
							{
								type: Discord.MessageComponentTypes.Button,
								customId: returnButton.customId,
								label: strings.stay,
								style: Discord.ButtonStyles.Success,
							},
							{
								type: Discord.MessageComponentTypes.Button,
								customId: leaveButton.customId,
								label: strings.leave,
								style: Discord.ButtonStyles.Danger,
							},
						],
					},
				],
			});
		});

		this.client.registerInteractionCollector(continueButton);
		this.client.registerInteractionCollector(cancelButton);
		this.client.registerInteractionCollector(returnButton);
		this.client.registerInteractionCollector(leaveButton);

		// TODO(vxern): Localise this.
		const embed: Discord.CamelizedDiscordEmbed = this.getErrorMessage(submission, submission, { error }) ?? {
			title: "Something went wrong",
			description: "Your submission could not be processed.",
		};

		const strings = {
			continue: this.client.localise("prompts.continue", locale)(),
			cancel: this.client.localise("prompts.cancel", locale)(),
		};

		this.client.editReply(submission, {
			embeds: [embed],
			components: [
				{
					type: Discord.MessageComponentTypes.ActionRow,
					components: [
						{
							type: Discord.MessageComponentTypes.Button,
							customId: continueButton.customId,
							label: strings.continue,
							style: Discord.ButtonStyles.Success,
						},
						{
							type: Discord.MessageComponentTypes.Button,
							customId: cancelButton.customId,
							label: strings.cancel,
							style: Discord.ButtonStyles.Danger,
						},
					],
				},
			],
		});

		return promise;
	}

	async #dispatchSubmit(submission: Logos.Interaction, { formData }: { formData: FormData }): Promise<void> {
		this.#onSubmit?.(submission, submission, { formData });
		await this.close();
	}

	onSubmit(callback: SubmitEvent<FormData>): void {
		this.#onSubmit = callback;
	}

	async open(): Promise<FormData | undefined> {
		const { promise, resolve } = Promise.withResolvers<FormData | undefined>();

		this.#_submissions.onCollect(async (submission) => {
			const formData = ModalComposer.getFormData<FormData>(submission);
			if (formData === undefined) {
				// TODO(vxern): Log.
				resolve(undefined);
				return;
			}

			this.#formData = formData;

			const error = await this.validate({ formData: this.#formData });
			if (error === undefined) {
				resolve(this.#formData);
				return;
			}

			const newAnchor = await this.handleInvalid(submission, { error });
			if (newAnchor === undefined) {
				await this.#dispatchSubmit(submission, { formData: this.#formData });
				return;
			}

			this.anchor = newAnchor;

			await this.#display();
		});

		await this.client.registerInteractionCollector(this.#_submissions);

		await this.#display();

		return promise;
	}

	async close(): Promise<void> {
		this.#_submissions.close();
	}
}

export { ModalComposer };
export type { Modal };
