-- SQL Migration for Deva AI Module Overhaul

-- 1. Enable pgvector extension for long-term memory
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Alter existing ai_memory table to use proper vector type
-- Note: Assuming 1536 dimensions for standard text-embedding-ada-002 or similar LiteLLM embeddings.
-- If the existing type cannot be cast, you may need to drop and recreate the column.
ALTER TABLE public.ai_memory 
  ALTER COLUMN embedding TYPE vector(1536) USING NULL;

-- 3. Table for User API Keys (BYOK feature)
CREATE TABLE IF NOT EXISTS public.user_api_keys (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL,
    provider character varying NOT NULL, -- e.g., 'openrouter', 'gemini', 'groq', 'tavily'
    encrypted_key text NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT user_api_keys_pkey PRIMARY KEY (id),
    CONSTRAINT user_api_keys_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
    CONSTRAINT user_api_keys_user_provider_unique UNIQUE (user_id, provider)
);

-- 4. Table for Cost Tracking Dashboard
CREATE TABLE IF NOT EXISTS public.api_cost_tracking (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL,
    provider character varying NOT NULL,
    model_used character varying,
    tokens_used integer DEFAULT 0,
    duration_ms integer DEFAULT 0,
    estimated_cost numeric(10, 6) DEFAULT 0.0,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT api_cost_tracking_pkey PRIMARY KEY (id),
    CONSTRAINT api_cost_tracking_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

-- 5. Table for Chat Threads (Short-term context grouping)
CREATE TABLE IF NOT EXISTS public.chat_threads (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL,
    title character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chat_threads_pkey PRIMARY KEY (id),
    CONSTRAINT chat_threads_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

-- Note: In public.ai_memory, the conversation_id should refer to chat_threads.id
