-- ====================================================================
-- OutreachX Deva AI module database initialization schema
-- ====================================================================

-- 1. SECURE DECRYPTION USER CONFIGURATION VAULT
CREATE TABLE IF NOT EXISTS public.api_keys (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL UNIQUE,
  gemini_key text,
  groq_key text,
  openrouter_key text,
  tavily_key text,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT api_keys_pkey PRIMARY KEY (id),
  CONSTRAINT api_keys_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

-- 2. GRANULAR Model COMPUTATION USAGE PANEL TRACKER
CREATE TABLE IF NOT EXISTS public.cost_tracking (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  api_provider text NOT NULL,
  tokens_used integer DEFAULT 0,
  duration_ms integer DEFAULT 0,
  estimated_cost numeric DEFAULT 0.0,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT cost_tracking_pkey PRIMARY KEY (id),
  CONSTRAINT cost_tracking_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

-- 3. DEVA MULTI-AGENT STATE PERSISTENCE CHECKPOINTER
CREATE TABLE IF NOT EXISTS public.deva_checkpoints (
    thread_id text,
    checkpoint_ns text,
    checkpoint_id text,
    parent_checkpoint_id text,
    checkpoint_type text,
    checkpoint_data bytea,
    metadata_type text,
    metadata_data bytea,
    PRIMARY KEY (thread_id, checkpoint_ns, checkpoint_id)
);

CREATE TABLE IF NOT EXISTS public.deva_checkpoint_writes (
    thread_id text,
    checkpoint_ns text,
    checkpoint_id text,
    task_id text,
    idx integer,
    channel text,
    write_type text,
    write_data bytea,
    task_path text,
    PRIMARY KEY (thread_id, checkpoint_ns, checkpoint_id, task_id, idx)
);

CREATE TABLE IF NOT EXISTS public.deva_checkpoint_blobs (
    thread_id text,
    checkpoint_ns text,
    key text,
    version text,
    blob_type text,
    blob_data bytea,
    PRIMARY KEY (thread_id, checkpoint_ns, key, version)
);
