const directories = Object.freeze({
	assets: {
		localisations: "./assets/localisations",
		sentences: "./assets/sentences",
	},
	logs: "./logs",
	migrations: "./migrations",
	plugins: "./plugins",
} as const);

export default directories;
