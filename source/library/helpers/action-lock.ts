type Action = () => Promise<void>;
type ActionReceiver = (action: Action) => Promise<void>;
class ActionLock {
	readonly #handlerQueue: Action[];
	#isLocked = false;
	#onDone?: () => void;

	get #nextAction(): Action | undefined {
		return this.#handlerQueue.shift();
	}

	get doAction(): ActionReceiver {
		return this.#receiveAction.bind(this);
	}

	constructor() {
		this.#handlerQueue = [];
	}

	#lock(): void {
		this.#isLocked = true;
	}

	#unlock(): void {
		this.#isLocked = false;

		this.#onDone?.();
		this.#onDone = undefined;
	}

	async #receiveAction(action: Action): Promise<void> {
		if (this.#isLocked) {
			const { promise, resolve } = Promise.withResolvers<void>();

			this.#handlerQueue.push(() => action().then(resolve));

			return promise;
		}

		await this.#doAction(action);
	}

	async #doAction(action: Action): Promise<void> {
		this.#lock();

		await action.call(undefined);

		// If there is no other action ready to be performed, shut the loop down.
		const nextAction = this.#nextAction;
		if (nextAction === undefined) {
			this.#unlock();
			return;
		}

		// Otherwise, jump straight onto the next action, marking the next run of the loop.
		this.#doAction(nextAction).then();
	}

	async dispose(): Promise<void> {
		if (!this.#isLocked) {
			return;
		}

		this.#handlerQueue.length = 0;

		const { promise, resolve } = Promise.withResolvers<void>();

		this.#onDone = () => resolve();

		return promise;
	}
}

export { ActionLock };
