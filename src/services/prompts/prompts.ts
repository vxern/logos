import reports from 'logos/src/services/prompts/managers/reports.ts';
import suggestions from 'logos/src/services/prompts/managers/suggestions.ts';
import verification from 'logos/src/services/prompts/managers/verification.ts';
import { ServiceStarter } from 'logos/src/services/services.ts';

const managers = [reports, suggestions, verification];

const service: ServiceStarter = ([client, bot]) => {
	for (const manager of managers) {
		manager.start([client, bot]);
	}
};

export default service;
