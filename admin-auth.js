const ADMIN_SESSION_KEY='fitnessGymSupabaseAdminChecked_v1';

async function getCurrentAdmin(){
  const { data: { user } } = await supabaseClient.auth.getUser();
  if(!user) return null;
  const { data, error } = await supabaseClient
    .from('admin_users')
    .select('user_id,email,role')
    .eq('user_id', user.id)
    .maybeSingle();
  if(error || !data) return null;
  return { user, profile:data };
}

async function requireAdmin(){
  const admin=await getCurrentAdmin();
  if(!admin){
    await supabaseClient.auth.signOut();
    window.location.replace('admin-login.html');
    return null;
  }
  sessionStorage.setItem(ADMIN_SESSION_KEY,'1');
  return admin;
}

async function logoutAdmin(){
  sessionStorage.removeItem(ADMIN_SESSION_KEY);
  await supabaseClient.auth.signOut();
  window.location.replace('admin-login.html');
}

const loginForm=document.getElementById('loginForm');
if(loginForm){
  (async()=>{
    const {data:{session}}=await supabaseClient.auth.getSession();
    if(session){
      const admin=await getCurrentAdmin();
      if(admin) window.location.replace('admin.html');
      else await supabaseClient.auth.signOut();
    }
  })();

  loginForm.addEventListener('submit',async e=>{
    e.preventDefault();
    const btn=loginForm.querySelector('button[type="submit"]');
    const error=document.getElementById('loginError');
    error.textContent='';
    btn.disabled=true; btn.textContent='جاري تسجيل الدخول...';
    const email=document.getElementById('email').value.trim();
    const password=document.getElementById('password').value;
    const {error:authError}=await supabaseClient.auth.signInWithPassword({email,password});
    if(authError){
      error.textContent='بيانات الدخول غير صحيحة أو الحساب غير مصرح له.';
      btn.disabled=false; btn.textContent='تسجيل الدخول';
      return;
    }
    const admin=await getCurrentAdmin();
    if(!admin){
      await supabaseClient.auth.signOut();
      error.textContent='تم تسجيل الدخول، لكن هذا الحساب ليس ضمن مديري النادي.';
      btn.disabled=false; btn.textContent='تسجيل الدخول';
      return;
    }
    sessionStorage.setItem(ADMIN_SESSION_KEY,'1');
    window.location.replace('admin.html');
  });
}
