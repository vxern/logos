const directories = Object.freeze({
	assets: {
		localisations: "./assets/localisations",
		sentences: "./assets/sentences",
	},
	logs: "./logs",
	migrations: "./migrations",
} as const);

export default directories;
