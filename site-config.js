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
  workouts:[
    {day:'صدر',title:'Bench Press',muscle:'الصدر',equipment:'Bench Press',sets:'4',reps:'8–12',rest:'90 ثانية',goal:'بناء',image:'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=900&q=85'},
    {day:'صدر',title:'Incline Dumbbell Press',muscle:'صدر علوي',equipment:'بنش مائل + دمبل',sets:'3',reps:'8–12',rest:'90 ثانية',goal:'بناء',image:'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=900&q=85'},
    {day:'صدر',title:'Cable Crossover',muscle:'الصدر',equipment:'Cable Crossover',sets:'3',reps:'12–15',rest:'60 ثانية',goal:'تنشيف',image:'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=900&q=85'},
    {day:'ظهر',title:'Lat Pulldown',muscle:'الظهر',equipment:'Lat Pulldown',sets:'4',reps:'10–12',rest:'60–90 ثانية',goal:'بناء',image:'https://images.unsplash.com/photo-1583454110551-21f7a7f2c6f5?auto=format&fit=crop&w=900&q=85'},
    {day:'ظهر',title:'Seated Row',muscle:'منتصف الظهر',equipment:'Seated Row',sets:'3',reps:'10–12',rest:'75 ثانية',goal:'بناء',image:'https://images.unsplash.com/photo-1583454110551-21f7a7f2c6f5?auto=format&fit=crop&w=900&q=85'},
    {day:'أكتاف',title:'Shoulder Press',muscle:'الأكتاف',equipment:'Shoulder Press',sets:'3',reps:'8–12',rest:'60–90 ثانية',goal:'بناء',image:'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=900&q=85'},
    {day:'أكتاف',title:'Lateral Raise',muscle:'الأكتاف الجانبية',equipment:'دمبل',sets:'3',reps:'12–15',rest:'60 ثانية',goal:'تنشيف',image:'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=900&q=85'},
    {day:'بايسبس',title:'Dumbbell Curl',muscle:'البايسبس',equipment:'دمبل',sets:'3',reps:'10–12',rest:'60 ثانية',goal:'بناء',image:'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=900&q=85'},
    {day:'ترايسبس',title:'Cable Pushdown',muscle:'الترايسبس',equipment:'Cable Machine',sets:'3',reps:'10–15',rest:'60 ثانية',goal:'بناء',image:'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=900&q=85'},
    {day:'أرجل',title:'Leg Press',muscle:'الفخذين',equipment:'Leg Press',sets:'4',reps:'10–15',rest:'90 ثانية',goal:'بناء',image:'https://images.unsplash.com/photo-1599058917212-d750089bc07e?auto=format&fit=crop&w=900&q=85'},
    {day:'أرجل',title:'Squat',muscle:'الأرجل + المؤخرة',equipment:'Squat Rack',sets:'4',reps:'6–10',rest:'120 ثانية',goal:'بناء',image:'https://images.unsplash.com/photo-1599058917212-d750089bc07e?auto=format&fit=crop&w=900&q=85'},
    {day:'أرجل',title:'Leg Curl',muscle:'خلفية الفخذ',equipment:'Leg Curl',sets:'3',reps:'10–15',rest:'75 ثانية',goal:'بناء',image:'https://images.unsplash.com/photo-1599058917212-d750089bc07e?auto=format&fit=crop&w=900&q=85'},
    {day:'أرجل',title:'Calf Raise',muscle:'السمانة',equipment:'Calf Machine',sets:'4',reps:'12–20',rest:'60 ثانية',goal:'بناء',image:'https://images.unsplash.com/photo-1599058917212-d750089bc07e?auto=format&fit=crop&w=900&q=85'},
    {day:'كارديو',title:'Treadmill Walk/Run',muscle:'القلب واللياقة',equipment:'Treadmill',sets:'1',reps:'20–30 دقيقة',rest:'حسب الحاجة',goal:'كارديو',image:'https://images.unsplash.com/photo-1576678927484-cc907957088c?auto=format&fit=crop&w=900&q=85'},
    {day:'كارديو',title:'Bike',muscle:'القلب واللياقة',equipment:'Stationary Bike',sets:'1',reps:'20–30 دقيقة',rest:'حسب الحاجة',goal:'كارديو',image:'https://images.unsplash.com/photo-1576678927484-cc907957088c?auto=format&fit=crop&w=900&q=85'},
    {day:'كارديو',title:'Stair Climber',muscle:'القلب والأرجل',equipment:'Stair Climber',sets:'1',reps:'10–20 دقيقة',rest:'حسب الحاجة',goal:'تنشيف',image:'https://images.unsplash.com/photo-1576678927484-cc907957088c?auto=format&fit=crop&w=900&q=85'},
    {day:'كور',title:'Plank',muscle:'البطن والكور',equipment:'وزن الجسم',sets:'3',reps:'30–60 ثانية',rest:'45 ثانية',goal:'كارديو',image:'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=900&q=85'},
    {day:'كور',title:'Cable Crunch',muscle:'البطن',equipment:'Cable Machine',sets:'3',reps:'12–15',rest:'60 ثانية',goal:'تنشيف',image:'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=900&q=85'}
  ],
  calorieTitle:'حاسبة السعرات الحرارية', calorieNote:'الحساب تقديري للتوجيه العام وليس تشخيصًا أو خطة غذائية شخصية.',
  gallery:[
    {text:'FITNESS GYM',image:'assets/gallery/gallery-1.webp'},
    {text:'FITNESS GYM',image:'assets/gallery/gallery-2.webp'},
    {text:'FITNESS GYM',image:'assets/gallery/gallery-3.webp'},
    {text:'FITNESS GYM',image:'assets/gallery/gallery-4.webp'},
    {text:'FITNESS GYM',image:'assets/gallery/gallery-5.webp'}
  ],
  contactTag:'تواصل معنا', contactTitle:'جاهز تبدأ؟', contactText:'تواصل معنا للحجز والاستفسار عن الاشتراكات.', phone:'+972 54-670-0672', whatsapp:'+972 54-670-0672', address:'بيت لحم - نحالين - وسط البلد', hours:'السبت – الخميس | 06:00 – 23:00',
  footer:'القوة • الانضباط • الاستمرارية'
};
function cloneDefault(){return JSON.parse(JSON.stringify(DEFAULT_SITE));}
function loadSiteLocal(){try{return {...cloneDefault(),...(JSON.parse(localStorage.getItem(SITE_KEY)||'{}'))}}catch(e){return cloneDefault()}}
function saveSiteLocal(site){localStorage.setItem(SITE_KEY,JSON.stringify(site));}

async function fetchSiteRemote(){
  try{
    if(!window.supabaseClient) return null;
    const request=window.supabaseClient.from('site_settings').select('data').eq('id',1).maybeSingle();
    const timeout=new Promise(resolve=>setTimeout(()=>resolve({data:null,error:new Error('site_settings timeout')}),12000));
    const result=await Promise.race([request,timeout]);
    if(result?.error || !result?.data?.data) return null;
    const remote={...cloneDefault(),...result.data.data};
    saveSiteLocal(remote);
    return remote;
  }catch(e){
    console.warn('Remote site settings unavailable:',e);
    return null;
  }
}

async function loadSiteRemote(){
  const local=loadSiteLocal();
  const remote=await fetchSiteRemote();
  return remote || local;
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
