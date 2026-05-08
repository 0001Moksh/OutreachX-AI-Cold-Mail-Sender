const defaultDevaApiUrl = "http://localhost:8001";

export function getDevaApiUrl() {
	return process.env.NEXT_PUBLIC_DEVA_API_URL || defaultDevaApiUrl;
}
