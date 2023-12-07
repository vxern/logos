module.exports = {
	apps: [
		{
			name: "logos",
			script: "src/index.ts",
			interpreter: "node",
			interpreterArgs: "--import tsx",
		},
	],
};
