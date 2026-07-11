// اسم الكاش - غيّر الرقم عند كل تحديث للملفات لإجبار المتصفح على تحميل نسخة جديدة
const CACHE_NAME = 'admin-panel-cache-v1';

// الملفات الأساسية التي يتم تخزينها مؤقتًا لتشغيل التطبيق أوفلاين
const CORE_ASSETS = [
  './admin.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// عند التثبيت: تخزين الملفات الأساسية في الكاش
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// عند التفعيل: حذف أي نسخ كاش قديمة
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// استراتيجية الجلب:
// - الطلبات لنفس الأصل (HTML/CSS/JS/الأيقونات): Network first مع رجوع للكاش عند الفشل (أوفلاين)
// - الطلبات الخارجية (Supabase API, الخطوط, CDN): تمر مباشرة للشبكة بدون تدخل، لضمان بيانات حيّة دائمًا
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // لا نتدخل إلا في طلبات GET
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const isSameOrigin = url.origin === self.location.origin;

  if (!isSameOrigin) {
    // اترك طلبات Supabase / الخطوط / CDN تذهب للشبكة مباشرة (بدون كاش) حتى تبقى البيانات محدثة
    return;
  }

  event.respondWith(
    fetch(req)
      .then((networkResponse) => {
        const clone = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
        return networkResponse;
      })
      .catch(() =>
        caches.match(req).then((cached) => cached || caches.match('./admin.html'))
      )
  );
});
