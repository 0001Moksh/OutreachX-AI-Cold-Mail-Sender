import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const missingSupabaseConfigMessage =
	"Supabase environment variables are missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in Vercel.";

const missingSupabaseClient = {
	auth: {
		getSession: async () => ({
			data: { session: null },
			error: null,
		}),
		onAuthStateChange: () => ({
			data: {
				subscription: {
					unsubscribe: () => undefined,
				},
			},
		}),
		signOut: async () => ({ error: null }),
		signInWithPassword: async () => ({
			data: null,
			error: new Error(missingSupabaseConfigMessage),
		}),
		signUp: async () => ({
			data: null,
			error: new Error(missingSupabaseConfigMessage),
		}),
		resetPasswordForEmail: async () => ({
			data: null,
			error: new Error(missingSupabaseConfigMessage),
		}),
		updateUser: async () => ({
			data: null,
			error: new Error(missingSupabaseConfigMessage),
		}),
	},
} as unknown as SupabaseClient;

export const supabase: SupabaseClient =
	supabaseUrl && supabaseAnonKey
		? createClient(supabaseUrl, supabaseAnonKey)
		: missingSupabaseClient;
