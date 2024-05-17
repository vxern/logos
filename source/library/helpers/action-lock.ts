type Action = () => Promise<void>;
type ActionReceiver = (action: Action) => Promise<void>;
class ActionLock {
	readonly #_handlerQueue: Action[];
	#_isLocked = false;
	#_onDone?: () => void;

	get #_nextAction(): Action | undefined {
		return this.#_handlerQueue.shift();
	}

	get doAction(): ActionReceiver {
		return this.#_receiveAction.bind(this);
	}

	constructor() {
		this.#_handlerQueue = [];
	}

	#_lock(): void {
		this.#_isLocked = true;
	}

	#_unlock(): void {
		this.#_isLocked = false;

		this.#_onDone?.();
		this.#_onDone = undefined;
	}

	async #_receiveAction(action: Action): Promise<void> {
		if (this.#_isLocked) {
			const { promise, resolve } = Promise.withResolvers<void>();

			this.#_handlerQueue.push(() => action().then(resolve));

			return promise;
		}

		await this.#_doAction(action);
	}

	async #_doAction(action: Action): Promise<void> {
		this.#_lock();

		await action.call(undefined);

		// If there is no other action ready to be performed, shut the loop down.
		const nextAction = this.#_nextAction;
		if (nextAction === undefined) {
			this.#_unlock();
			return;
		}

		// Otherwise, jump straight onto the next action, marking the next run of the loop.
		// unawaited
		this.#_doAction(nextAction);
	}

	async dispose(): Promise<void> {
		if (!this.#_isLocked) {
			return;
		}

		this.#_handlerQueue.length = 0;

		const { promise, resolve } = Promise.withResolvers<void>();

		this.#_onDone = () => resolve();

		return promise;
	}
}

export { ActionLock };
