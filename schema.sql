-- WARNING: This will delete all existing data in these tables!
-- Run this in your Supabase SQL Editor.
-- OutreachX - Full SaaS Application Schema

-- Required Supabase/Postgres extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- Drop all tables in correct order
DROP TABLE IF EXISTS public.ai_memory CASCADE;
DROP TABLE IF EXISTS public.email_logs CASCADE;
DROP TABLE IF EXISTS public.campaign_templates CASCADE;
DROP TABLE IF EXISTS public.templates CASCADE;
DROP TABLE IF EXISTS public.leads CASCADE;
DROP TABLE IF EXISTS public.campaign_tasks CASCADE;
DROP TABLE IF EXISTS public.assets CASCADE;
DROP TABLE IF EXISTS public.campaigns CASCADE;
DROP TABLE IF EXISTS public.email_credentials CASCADE;
DROP TABLE IF EXISTS public.user_settings CASCADE;
DROP TABLE IF EXISTS public.user_resumes CASCADE;
DROP TABLE IF EXISTS public.otp_codes CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- ==================== USERS & AUTH ====================
CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  email character varying NOT NULL UNIQUE,
  password_hash character varying,
  full_name character varying,
  phone character varying,
  resume_uploaded boolean DEFAULT false,
  is_verified boolean DEFAULT false,
  status character varying DEFAULT 'active'::character varying,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT users_pkey PRIMARY KEY (id)
);

-- OTP Codes for Email Authentication
CREATE TABLE public.otp_codes (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  email character varying NOT NULL,
  code character varying NOT NULL,
  purpose character varying DEFAULT 'signup'::character varying,
  is_used boolean DEFAULT false,
  expires_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT otp_codes_pkey PRIMARY KEY (id),
  CONSTRAINT otp_codes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

-- ==================== RESUME & PARSING ====================
CREATE TABLE public.user_resumes (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL UNIQUE,
  file_name character varying,
  file_url character varying,
  raw_text text,
  skills jsonb,
  projects jsonb,
  experience jsonb,
  education jsonb,
  social_media_links jsonb,
  certifications jsonb,
  objective text,
  parsed_metadata jsonb,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT user_resumes_pkey PRIMARY KEY (id),
  CONSTRAINT user_resumes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

-- ==================== EMAIL CREDENTIALS & SETTINGS ====================
CREATE TABLE public.email_credentials (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  email_address character varying NOT NULL,
  encrypted_password text NOT NULL,
  app_password character varying,
  provider character varying DEFAULT 'gmail'::character varying,
  is_verified boolean DEFAULT false,
  verification_method character varying,
  verified_at timestamp with time zone,
  last_tested_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT email_credentials_pkey PRIMARY KEY (id),
  CONSTRAINT email_credentials_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT unique_user_email UNIQUE (user_id, email_address)
);

CREATE TABLE public.user_settings (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL UNIQUE,
  theme character varying DEFAULT 'light'::character varying,
  timezone character varying DEFAULT 'UTC'::character varying,
  language character varying DEFAULT 'en'::character varying,
  notifications_enabled boolean DEFAULT true,
  email_notifications boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT user_settings_pkey PRIMARY KEY (id),
  CONSTRAINT user_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

-- ==================== TEMPLATES ====================
CREATE TABLE public.templates (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  name character varying NOT NULL,
  description text,
  html_content text,
  text_content text,
  subject_line character varying,
  is_default boolean DEFAULT false,
  is_ai_generated boolean DEFAULT false,
  tags character varying[],
  variables jsonb,
  preview_url character varying,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT templates_pkey PRIMARY KEY (id),
  CONSTRAINT templates_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

-- ==================== ASSETS ====================
CREATE TABLE public.assets (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  asset_type character varying NOT NULL,
  source_type character varying,
  name character varying NOT NULL,
  description text,
  file_url character varying,
  content text,
  metadata jsonb,
  tags character varying[],
  is_verified boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT assets_pkey PRIMARY KEY (id),
  CONSTRAINT assets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

-- ==================== CAMPAIGNS ====================
CREATE TABLE public.campaigns (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  name character varying NOT NULL,
  description text,
  status character varying DEFAULT 'draft'::character varying,
  total_leads integer DEFAULT 0,
  sent_count integer DEFAULT 0,
  opened_count integer DEFAULT 0,
  clicked_count integer DEFAULT 0,
  replied_count integer DEFAULT 0,
  bounced_count integer DEFAULT 0,
  scheduled_at timestamp with time zone,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  tags character varying[],
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT campaigns_pkey PRIMARY KEY (id),
  CONSTRAINT campaigns_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

-- Persisted task launches for campaigns
CREATE TABLE public.campaign_tasks (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  campaign_id uuid NOT NULL,
  user_id uuid NOT NULL,
  task_id character varying NOT NULL,
  status character varying DEFAULT 'PENDING'::character varying,
  lead_count integer DEFAULT 0,
  result jsonb,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT campaign_tasks_pkey PRIMARY KEY (id),
  CONSTRAINT campaign_tasks_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE,
  CONSTRAINT campaign_tasks_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

-- ==================== LEADS ====================
CREATE TABLE public.leads (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  campaign_id uuid,
  user_id uuid NOT NULL,
  email character varying NOT NULL,
  first_name character varying,
  last_name character varying,
  company character varying,
  role character varying,
  phone character varying,
  linkedin_url character varying,
  location character varying,
  custom_variables jsonb,
  status character varying DEFAULT 'pending'::character varying,
  sent_at timestamp with time zone,
  opened_at timestamp with time zone,
  clicked_at timestamp with time zone,
  replied_at timestamp with time zone,
  bounced_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT leads_pkey PRIMARY KEY (id),
  CONSTRAINT leads_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE,
  CONSTRAINT leads_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

CREATE TABLE public.campaign_templates (
  campaign_id uuid NOT NULL,
  template_id uuid NOT NULL,
  CONSTRAINT campaign_templates_pkey PRIMARY KEY (campaign_id, template_id),
  CONSTRAINT campaign_templates_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE,
  CONSTRAINT campaign_templates_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.templates(id) ON DELETE CASCADE
);

-- ==================== EMAIL LOGS ====================
CREATE TABLE public.email_logs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  campaign_id uuid NOT NULL,
  lead_id uuid NOT NULL,
  email_credential_id uuid,
  status character varying DEFAULT 'pending'::character varying,
  message_id character varying,
  subject_line character varying,
  html_content text,
  text_content text,
  retry_count integer DEFAULT 0,
  max_retries integer DEFAULT 3,
  last_error text,
  error_code character varying,
  sent_at timestamp with time zone,
  opened_at timestamp with time zone,
  clicked_at timestamp with time zone,
  replied_at timestamp with time zone,
  bounced_at timestamp with time zone,
  bounce_reason text,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT email_logs_pkey PRIMARY KEY (id),
  CONSTRAINT email_logs_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE,
  CONSTRAINT email_logs_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE,
  CONSTRAINT email_logs_email_credential_id_fkey FOREIGN KEY (email_credential_id) REFERENCES public.email_credentials(id) ON DELETE SET NULL
);

-- ==================== AI & RAG ====================
CREATE TABLE public.ai_memory (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  conversation_id character varying,
  message_type character varying,
  role character varying,
  content text,
  tokens_used integer DEFAULT 0,
  embedding vector(1536),
  metadata jsonb,
  importance_score integer DEFAULT 0,
  extracted_entities jsonb,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT ai_memory_pkey PRIMARY KEY (id),
  CONSTRAINT ai_memory_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

-- ==================== INDEXES ====================
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_email_credentials_user_id ON public.email_credentials(user_id);
CREATE INDEX idx_leads_campaign_id ON public.leads(campaign_id);
CREATE INDEX idx_leads_user_id ON public.leads(user_id);
CREATE INDEX idx_campaigns_user_id ON public.campaigns(user_id);
CREATE INDEX idx_templates_user_id ON public.templates(user_id);
CREATE INDEX idx_assets_user_id ON public.assets(user_id);
CREATE INDEX idx_email_logs_campaign_id ON public.email_logs(campaign_id);
CREATE INDEX idx_email_logs_lead_id ON public.email_logs(lead_id);
CREATE INDEX idx_ai_memory_user_id ON public.ai_memory(user_id);
CREATE INDEX idx_ai_memory_conversation_id ON public.ai_memory(conversation_id);
