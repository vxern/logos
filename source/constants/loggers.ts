import pino from "pino";
import logTargets from "logos:constants/log-targets.ts";

export default Object.freeze({
	silent: pino({ level: "silent" }),
	feedback: pino(pino.transport(logTargets.stdout.feedback)),
	debug: pino(
		pino.transport<Record<string, unknown>>({
			targets: [logTargets.stdout.feedback, logTargets.file.debug],
		}),
	),
	standard: pino(pino.transport(logTargets.file.standard)),
} as const);
