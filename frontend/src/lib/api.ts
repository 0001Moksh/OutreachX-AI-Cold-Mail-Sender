const defaultApiUrl = "http://localhost:8000";
const defaultDevaApiUrl = "http://localhost:8010";

export function getApiUrl() {
	return process.env.NEXT_PUBLIC_API_URL || defaultApiUrl;
}