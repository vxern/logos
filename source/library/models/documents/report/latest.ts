interface ReportFormData {
	reason: string;
	users: string;
	messageLink?: string;
}

interface ReportDocument {
	formData: ReportFormData;
	isResolved: boolean;
}

export type { ReportDocument, ReportFormData };
