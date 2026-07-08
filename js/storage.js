/* ═══════════════════════════════════════════════════════
   طبقة التخزين — حفظ الدعوات محلياً على جهاز المستخدم
   المشروع مصمم للتشغيل المحلي (VS Code / Live Server / نشر ويب)
   حيث التخزين المحلي متاح، ومع بديل داخلي مؤقت لأي بيئة تمنعه
   ═══════════════════════════════════════════════════════ */

const Store = (() => {

  const KEY = "mezab:invitations";      // كل الدعوات في مفتاح واحد
  const memory = { data: null };        // بديل داخل الذاكرة عند منع التخزين

  /* هل التخزين الدائم متاح في هذه البيئة؟ */
  const available = () => {
    try {
      /* نكتب قيمة اختبار صغيرة ثم نحذفها.
         إذا نجحت العملية فهذا يعني أن localStorage متاح. */
      const t = "__mezab_test__";
      localStorage.setItem(t, "1");
      localStorage.removeItem(t);
      return true;
    } catch (e) { return false; }
  };

  /* قراءة كل الدعوات */
  const loadAll = () => {
    try {
      /* localStorage يحفظ النصوص فقط، لذلك نحول JSON النصي إلى مصفوفة JavaScript */
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return memory.data || []; }
  };

  /* حفظ كل الدعوات */
  const saveAll = (list) => {
    /* نحول المصفوفة إلى نص JSON قبل حفظها في localStorage */
    try { localStorage.setItem(KEY, JSON.stringify(list)); }
    catch (e) { memory.data = list; }
  };

  /* إضافة دعوة */
  const add = (inv) => {
    /* نقرأ القائمة الحالية، نضيف الدعوة الجديدة، ثم نحفظ القائمة كاملة */
    const list = loadAll();
    list.push(inv);
    saveAll(list);
    return list;
  };

  /* حذف دعوة بمعرّفها */
  const remove = (id) => {
    /* filter ينشئ قائمة جديدة بدون الدعوة التي يطابق id حقها */
    const list = loadAll().filter((v) => v.id !== id);
    saveAll(list);
    return list;
  };

  /* ── النسخ الاحتياطي ── */

  /* تنزيل ملف JSON بكل الدعوات */
  const exportBackup = (list) => {
    /* Blob يحول النص إلى ملف قابل للتنزيل من المتصفح */
    const blob = new Blob([JSON.stringify(list, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    /* URL.createObjectURL ينشئ رابطاً مؤقتاً للملف داخل المتصفح */
    a.href = URL.createObjectURL(blob);
    a.download = "دعواتي-" + new Date().toISOString().slice(0, 10) + ".json";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  /* استيراد ملف نسخة احتياطية — يعيد عدد المضاف الجديد */
  const importBackup = async (file) => {
    /* نقرأ الملف كنص ثم نحوله إلى بيانات JavaScript */
    const arr = JSON.parse(await file.text());
    if (!Array.isArray(arr)) throw new Error("ملف غير صالح");
    const list = loadAll();
    /* Set تساعدنا نعرف الدعوات الموجودة مسبقاً حتى لا نكررها */
    const ids = new Set(list.map((v) => v.id));
    let added = 0;
    for (const v of arr) {
      if (v && v.id && String(v.id).startsWith("inv:") && !ids.has(v.id)) {
        list.push(v);
        ids.add(v.id);
        added++;
      }
    }
    saveAll(list);
    return { list, added };
  };

  return { available, loadAll, saveAll, add, remove, exportBackup, importBackup };
})();
