const SITE_KEY='fitnessGymSite_v1';
const DEFAULT_SITE={
  brand:'FITNESS GYM', tag:'FITNESS GYM', heroTitle:'قوّتك تبدأ', heroAccent:'من هنا.', heroText:'تدريب أقوى. جسم أفضل. التزام حقيقي. ابدأ رحلتك معنا اليوم.',
  stats:[['+500','عضو'],['+50','تمرين'],['7/7','أيام']],
  aboutTag:'من نحن', aboutTitle:'مكانك لبناء نسخة أقوى منك', aboutText:'FITNESS GYM هو المكان الذي يجمع التدريب الجاد، المعدات، التحفيز والبيئة المناسبة لتصل إلى أهدافك.',
  features:['بيئة احترافية','معدات متنوعة','مدربون متخصصون','برامج لجميع المستويات'],
  services:[
    {n:'01',title:'كمال الأجسام',text:'تمارين ومعدات لبناء العضلات والقوة.'},
    {n:'02',title:'كارديو',text:'رفع اللياقة والتحمل وحرق السعرات.'},
    {n:'03',title:'تدريب شخصي',text:'برنامج مخصص حسب هدفك ومستواك.'},
    {n:'04',title:'متابعة غذائية',text:'إرشادات تساعدك على تنظيم نمطك الغذائي.'}
  ],
  plans:[
    {title:'شهري',price:'150',period:'/ شهر',features:['دخول النادي','استخدام المعدات','حصص اللياقة'],hot:false},
    {title:'3 أشهر',price:'400',period:'/ 3 أشهر',features:['دخول النادي','جميع المعدات','حصص اللياقة','متابعة تدريبية'],hot:true},
    {title:'سنوي',price:'1200',period:'/ سنة',features:['دخول النادي','جميع المعدات','حصص اللياقة','متابعة تدريبية'],hot:false}
  ],
  galleryTitle:'أجواء FITNESS GYM', galleryNote:'يمكن استبدال هذه المساحات بصور النادي الحقيقية لاحقاً.',
  gallery:['STRENGTH','FOCUS','POWER','DISCIPLINE'],
  contactTag:'تواصل معنا', contactTitle:'جاهز تبدأ؟', contactText:'تواصل معنا للحجز والاستفسار عن الاشتراكات.', phone:'+972 54-670-0672', whatsapp:'+972 54-670-0672', address:'بيت لحم - نحالين - وسط البلد', hours:'السبت – الخميس | 06:00 – 23:00',
  footer:'القوة • الانضباط • الاستمرارية'
};
function cloneDefault(){return JSON.parse(JSON.stringify(DEFAULT_SITE));}
function loadSiteLocal(){try{return {...cloneDefault(),...(JSON.parse(localStorage.getItem(SITE_KEY)||'{}'))}}catch(e){return cloneDefault()}}
function saveSiteLocal(site){localStorage.setItem(SITE_KEY,JSON.stringify(site));}

async function loadSiteRemote(){
  const fallback=loadSiteLocal();
  try{
    if(!window.supabaseClient) return fallback;
    const {data,error}=await window.supabaseClient.from('site_settings').select('data').eq('id',1).maybeSingle();
    if(error || !data?.data) return fallback;
    const remote={...cloneDefault(),...data.data};
    saveSiteLocal(remote);
    return remote;
  }catch(e){
    console.warn('Remote site settings unavailable:',e);
    return fallback;
  }
}

async function saveSite(site){
  saveSiteLocal(site);
  try{
    if(!window.supabaseClient) return;
    const {error}=await window.supabaseClient.from('site_settings').upsert({
      id:1,
      data:site,
      updated_at:new Date().toISOString()
    },{onConflict:'id'});
    if(error) throw error;
  }catch(e){
    console.error('Saving site settings failed:',e);
    throw e;
  }
}
