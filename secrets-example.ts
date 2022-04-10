const secrets = {
	core: {
		databases: [
			{
				name: 'Users',
				secret: 'SECRET_HERE',
			},
			{
				name: 'Content',
				secret: 'SECRET_HERE',
			},
		],
		discord: {
			secret: 'SECRET_HERE',
		},
	},
	modules: {
		language: {
			deepL: {
				secret: 'SECRET_HERE',
			},
			languageDetection: {
				secret: 'SECRET_HERE',
			},
		},
		music: {
			lavalink: {
				host: '127.0.0.1',
				port: 12345,
				password: 'PASSWORD_HERE',
			},
			spotify: {
				id: 'ID_HERE',
				secret: 'SECRET_HERE',
			},
			youtube: {
				secret: 'SECRET_HERE',
			},
		},
		secret: {
			template: {
				guild: {
					id: '432173040638623746',
				},
			},
		},
	},
};

export default secrets;
