import { chunk } from "logos:core/utilities";
import * as Discord from "@discordeno/bot";
import winston from "winston";

Array.prototype.toChunked = function <T>(this, size: number) {
	return Array.from<T[]>(chunk(this, size));
};

Object.mirror = <T extends Record<string, string>>(object: T) => {
	return Object.fromEntries(Object.entries(object).map(([key, value]) => [value, key])) as unknown as {
		[K in keyof T as T[K]]: K;
	};
};

Promise.createRace = async function* <T, R>(
	this,
	elements: T[],
	doAction: (element: T) => R | Promise<R | undefined> | undefined,
): AsyncGenerator<{ element: T; result?: R }, void, void> {
	const promisesWithResolver = elements.map(() => Promise.withResolvers<{ element: T; result?: R }>());

	const resolvers = [...promisesWithResolver];
	for (const element of elements) {
		Promise.resolve(doAction(element)).then((result) => {
			const { resolve } = resolvers.shift()!;

			if (result === undefined) {
				resolve({ element });
			} else {
				resolve({ element, result });
			}
		});
	}

	for (const { promise } of promisesWithResolver) {
		yield promise;
	}
};

(globalThis as any).Discord = Discord;
(globalThis as any).constants = await import("./constants/constants").then((module) => module.default);
(globalThis as any).defaults = await import("./constants/defaults").then((module) => module.default);

winston.configure({
	format: winston.format.combine(
		winston.format.errors({ stack: true }),
		winston.format.cli(),
		winston.format.colorize({ all: true }),
		winston.format.timestamp(),
	),
	transports: [new winston.transports.Console(), new winston.transports.File({ filename: "logs/standard.txt" })],
});
