-- Migration 20261007000001_core_tables

-- Down migration (reversibility support via manual execution if needed)
-- DROP TABLE IF EXISTS public.client_memberships CASCADE;
-- DROP TABLE IF EXISTS public.profiles CASCADE;
-- DROP TABLE IF EXISTS public.clients CASCADE;
-- DROP TABLE IF EXISTS public.teams CASCADE;
-- DROP TABLE IF EXISTS public.departments CASCADE;
-- DROP TYPE IF EXISTS user_role;
-- DROP TYPE IF EXISTS entity_status;

-- Up migration
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE user_role AS ENUM ('admin', 'manager', 'member', 'client');
CREATE TYPE entity_status AS ENUM ('active', 'archived');

CREATE TABLE public.departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    status entity_status DEFAULT 'active' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    department_id UUID REFERENCES public.departments(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    manager_user_id UUID, -- Will reference profiles(id) later
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name TEXT NOT NULL,
    status entity_status DEFAULT 'active' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE RESTRICT,
    full_name TEXT NOT NULL,
    role user_role NOT NULL,
    status entity_status DEFAULT 'active' NOT NULL,
    team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Now we can add the FK from teams to profiles
ALTER TABLE public.teams ADD CONSTRAINT fk_manager FOREIGN KEY (manager_user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE TABLE public.client_memberships (
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (client_id, user_id)
);

-- Trigger for auth.users to create a profile automatically (default member)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, status)
  VALUES (
      new.id, 
      COALESCE(new.raw_user_meta_data->>'full_name', 'Unknown User'), 
      COALESCE((new.raw_user_meta_data->>'role')::user_role, 'client'::user_role),
      'active'
  );
  
  -- If it's a client, link to a client_id if provided in meta
  IF COALESCE((new.raw_user_meta_data->>'role')::user_role, 'client'::user_role) = 'client' AND new.raw_user_meta_data->>'client_id' IS NOT NULL THEN
    INSERT INTO public.client_memberships (client_id, user_id)
    VALUES ((new.raw_user_meta_data->>'client_id')::uuid, new.id);
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Updated_at triggers
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW; 
END;
$$ language 'plpgsql';

CREATE TRIGGER update_departments_modtime BEFORE UPDATE ON public.departments FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_teams_modtime BEFORE UPDATE ON public.teams FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_clients_modtime BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_profiles_modtime BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
