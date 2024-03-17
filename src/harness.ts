import * as Discord from "@discordeno/bot";
import log from "loglevel";
import constants_ from "./constants/constants";
import defaults_ from "./constants/defaults";

// ! Polyfill + override area - It's absolutely key that these are synchronised with `types.d.ts`.
// #region

Promise.withResolvers = <T>() => {
	let resolve!: (value: T) => void;
	let reject!: () => void;

	const promise = new Promise<T>((resolve_, reject_) => {
		resolve = resolve_;
		reject = reject_;
	});

	return { promise, resolve, reject };
};

(globalThis as any).Discord = Discord;
(globalThis as any).constants = constants_;
(globalThis as any).defaults = defaults_;

// #endregion

log.enableAll();
