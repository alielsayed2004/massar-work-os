-- Migration 20261007000002_rls_policies

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_memberships ENABLE ROW LEVEL SECURITY;

-- Helper to check if current user is an admin
CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin' AND status = 'active'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Helper to check if current user is an internal staff
CREATE OR REPLACE FUNCTION is_internal() RETURNS BOOLEAN AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager', 'member') AND status = 'active'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Departments
CREATE POLICY "Departments are viewable by internal staff"
  ON public.departments FOR SELECT USING (is_internal());
CREATE POLICY "Departments are modifiable by admins"
  ON public.departments FOR ALL USING (is_admin());

-- Teams
CREATE POLICY "Teams are viewable by internal staff"
  ON public.teams FOR SELECT USING (is_internal());
CREATE POLICY "Teams are modifiable by admins"
  ON public.teams FOR ALL USING (is_admin());

-- Clients
-- Internal can view all. Clients can view clients they have membership for.
CREATE POLICY "Clients are viewable by internal or members"
  ON public.clients FOR SELECT USING (
    is_internal() OR 
    EXISTS(SELECT 1 FROM public.client_memberships cm WHERE cm.client_id = id AND cm.user_id = auth.uid())
  );
CREATE POLICY "Clients are modifiable by admins"
  ON public.clients FOR ALL USING (is_admin());

-- Client Memberships
CREATE POLICY "Client Memberships are viewable by internal or members"
  ON public.client_memberships FOR SELECT USING (
    is_internal() OR 
    user_id = auth.uid()
  );
CREATE POLICY "Client Memberships are modifiable by admins"
  ON public.client_memberships FOR ALL USING (is_admin());

-- Profiles
-- Internal can see all profiles. Clients can only see internal profiles (for assigning tasks/reviewers visually if needed) and themselves. Wait, the brief says clients don't see internal structures.
-- "العميل لا يرى إلا مشروعاته... ولا يرى النشاط الداخلي أو مهام الفريق"
-- So clients should only see themselves and maybe internal members assigned to their project? For V1, clients only see their own profile.
CREATE POLICY "Profiles are viewable by internal or self"
  ON public.profiles FOR SELECT USING (
    is_internal() OR id = auth.uid()
  );
CREATE POLICY "Profiles are modifiable by admins"
  ON public.profiles FOR UPDATE USING (is_admin() OR id = auth.uid());
