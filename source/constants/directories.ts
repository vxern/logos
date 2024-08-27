const directories = Object.freeze({
	assets: {
		localisations: "./assets/localisations",
		sentences: "./assets/sentences",
	},
	migrations: "./migrations",
} as const);

export default directories;
