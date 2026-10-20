import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { DEV_AUTH_ENABLED } from '@/lib/dev-session';

export async function GET() {
  if (!DEV_AUTH_ENABLED) {
    return new NextResponse('Not Found', { status: 404 });
  }

  const supabase = await createClient();

  // 1. Get current user session
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized', details: authError }, { status: 401 });
  }

  // 2. Get profile and role
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();

  // 3. Test Queries (RLS will filter automatically)
  // Try to fetch departments
  const { data: departments } = await supabase.from('departments').select('name');
  
  // Try to fetch clients
  const { data: clients } = await supabase.from('clients').select('company_name');

  // Try to fetch all profiles
  const { data: allProfiles } = await supabase.from('profiles').select('full_name, role');

  // Try to list files in bucket (Storage RLS test)
  const { data: files } = await supabase.storage.from('massar_files').list();

  // Compile test results
  const results = {
    test_context: {
      user_id: user.id,
      email: user.email,
      role: profile?.role,
    },
    tests: {
      can_read_departments: departments !== null && departments.length > 0,
      departments_count: departments?.length || 0,
      
      can_read_clients: clients !== null && clients.length > 0,
      clients_count: clients?.length || 0,

      can_read_all_profiles: allProfiles !== null && allProfiles.length > 1, // more than just self
      profiles_count: allProfiles?.length || 0,

      can_list_files: files !== null,
    }
  };

  return NextResponse.json(results);
}
