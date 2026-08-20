const ADMIN_SESSION='fitnessGymAdminSession_v1';
const ADMIN_EMAIL='shakarnah2004@gmail.com';

function isAdminLoggedIn(){return sessionStorage.getItem(ADMIN_SESSION)==='1';}

function protectAdminPage(){
  if(!isAdminLoggedIn()){
    window.location.replace('admin-login.html');
    return false;
  }
  return true;
}

async function logoutAdmin(){
  try{ await window.supabaseClient?.auth?.signOut(); }catch(e){}
  sessionStorage.removeItem(ADMIN_SESSION);
  window.location.replace('admin-login.html');
}

async function initAdminAuth(){
  if(!window.supabaseClient) return;
  const {data}=await window.supabaseClient.auth.getSession();
  if(!data?.session){
    sessionStorage.removeItem(ADMIN_SESSION);
    if(document.body?.classList.contains('admin-page') && !document.getElementById('loginForm')){
      window.location.replace('admin-login.html');
    }
  }
}

const PASSWORD_RESET_URL = 'https://fitneessgym.github.io/reset-password.html';

async function requestPasswordReset(email){
  if(!window.supabaseClient) throw new Error('لم يتم تحميل Supabase.');
  const {error}=await window.supabaseClient.auth.resetPasswordForEmail(email,{redirectTo:PASSWORD_RESET_URL});
  if(error) throw error;
}

const loginForm=document.getElementById('loginForm');
if(loginForm){
  loginForm.addEventListener('submit',async e=>{
    e.preventDefault();
    const email=document.getElementById('email').value.trim().toLowerCase();
    const password=document.getElementById('password').value;
    const error=document.getElementById('loginError');
    const btn=loginForm.querySelector('button[type="submit"]');
    error.textContent='';
    btn.disabled=true;
    btn.textContent='جاري تسجيل الدخول...';
    try{
      if(!window.supabaseClient) throw new Error('لم يتم تحميل Supabase.');
      const {data,error:authError}=await window.supabaseClient.auth.signInWithPassword({email,password});
      if(authError) throw authError;
      if(!data?.session) throw new Error('تعذر إنشاء جلسة الدخول.');
      sessionStorage.setItem(ADMIN_SESSION,'1');
      window.location.replace('admin.html');
    }catch(err){
      console.error(err);
      error.textContent=err.message||'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
      btn.disabled=false;
      btn.textContent='تسجيل الدخول';
    }
  });
}else{
  initAdminAuth();
  document.getElementById('logoutBtn')?.addEventListener('click',logoutAdmin);
}
