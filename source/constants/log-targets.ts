import directories from "logos:constants/directories.ts";

export default Object.freeze({
	stdout: {
		feedback: {
			target: "pino-pretty",
			level: "debug",
			options: {
				ignore: "pid,hostname",
			},
		},
	},
	file: {
		debug: {
			target: "pino/file",
			level: "debug",
			options: { destination: `${directories.logs}/debug-log.os` },
		},
		standard: {
			target: "pino/file",
			level: "info",
			options: { destination: `${directories.logs}/log.os` },
		},
	},
} as const);
