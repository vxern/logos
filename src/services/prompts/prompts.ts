import suggestions from 'logos/src/services/prompts/managers/suggestions.ts';
import { ServiceStarter } from 'logos/src/services/services.ts';

const managers = [suggestions];

const service: ServiceStarter = ([client, bot]) => {
	for (const manager of managers) {
		manager.start([client, bot]);
	}
};

export default service;
