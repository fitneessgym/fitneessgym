const ADMIN_SESSION='fitnessGymAdminSession_v1';

/*
  بيانات الدخول المعتمدة:
  Email: shakarnah2004@gmail.com
  Password: 20120033Aa

  ملاحظة: لأن الموقع static على GitHub Pages، هذه حماية واجهة وليست حماية خادم.
  للأمان الحقيقي يجب نقل التحقق إلى Backend/Auth provider.
*/

const ADMIN_EMAIL='shakarnah2004@gmail.com';
const ADMIN_PASSWORD='20120033Aa';

function isAdminLoggedIn(){
  return sessionStorage.getItem(ADMIN_SESSION)==='1';
}

function protectAdminPage(){
  if(!isAdminLoggedIn()){
    window.location.replace('admin-login.html');
    return false;
  }
  return true;
}

function logoutAdmin(){
  sessionStorage.removeItem(ADMIN_SESSION);
  window.location.replace('admin-login.html');
}

const loginForm=document.getElementById('loginForm');

if(loginForm){
  if(isAdminLoggedIn()) window.location.replace('admin.html');

  loginForm.addEventListener('submit',e=>{
    e.preventDefault();

    const email=document.getElementById('email').value.trim().toLowerCase();
    const password=document.getElementById('password').value;
    const error=document.getElementById('loginError');

    if(email===ADMIN_EMAIL.toLowerCase() && password===ADMIN_PASSWORD){
      sessionStorage.setItem(ADMIN_SESSION,'1');
      window.location.replace('admin.html');
    }else{
      error.textContent='البريد الإلكتروني أو كلمة المرور غير صحيحة.';
    }
  });
}

if(document.body?.classList.contains('admin-page') && document.getElementById('statCustomers')){
  protectAdminPage();
  document.getElementById('logoutBtn')?.addEventListener('click',logoutAdmin);
}
