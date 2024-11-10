interface SuggestionFormData {
	suggestion: string;
}

interface SuggestionDocument {
	formData: SuggestionFormData;
	isResolved: boolean;
}

export type { SuggestionDocument, SuggestionFormData };
