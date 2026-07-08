/* ═══════════════════════════════════════════════════════
   أدوات مساعدة — توحيد الأرقام والتواريخ (الكود السعودي الموحد)
   القاعدة: النصوص العربية بالأرقام العربية الشرقية (١٢٣)
            الهاتف والتاريخ الميلادي بالأرقام الإنجليزية (123)
   ═══════════════════════════════════════════════════════ */

const Utils = (() => {

  /* رموز الأرقام العربية الشرقية بالترتيب من 0 إلى 9 */
  const AR = "٠١٢٣٤٥٦٧٨٩";

  /* أسماء الشهور الميلادية بالعربية لاستخدامها عند عرض التاريخ */
  const MONTHS = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];

  /* تحويل أي أرقام إنجليزية إلى عربية شرقية */
  const toArDigits = (s) => String(s || "").replace(/[0-9]/g, (d) => AR[d]);

  /* تحويل أي أرقام عربية شرقية إلى إنجليزية (للهاتف والتواريخ الميلادية) */
  const toEnDigits = (s) => String(s || "").replace(/[٠-٩]/g, (d) => String(AR.indexOf(d)));

  /* اختصار: رقم واحد بالعربية */
  const arNum = (n) => toArDigits(String(n));

  /* عرض التاريخ الميلادي بصيغة عربية أنيقة: ١٧ يوليو ٢٠٢٦م */
  const fmtGreg = (iso) => {
    if (!iso) return "—";
    const d = new Date(iso + "T12:00");
    return `${arNum(d.getDate())} ${MONTHS[d.getMonth()]} ${arNum(d.getFullYear())}م`;
  };

  /* عدد الأيام المتبقية للمناسبة (سالب = انتهت) */
  const daysLeft = (iso) => {
    if (!iso) return null;
    /* نثبت وقت اليوم على منتصف الليل حتى يكون حساب الأيام عادلاً */
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.round((new Date(iso + "T00:00") - today) / 864e5);
  };

  /* نص شارة العدّاد حسب المتبقي */
  const leftText = (n) => {
    if (n == null) return "—";
    if (n < 0)  return "انتهى الزواج";
    if (n === 0) return "الليلة 🎉";
    if (n === 1) return "متبقي يوم واحد";
    if (n === 2) return "متبقي يومين";
    if (n <= 10) return `متبقي ${arNum(n)} أيام`;
    return `متبقي ${arNum(n)} يوماً`;
  };

  /* استخلاص تاريخ ميلادي ISO من أي نص (يدعم الأرقام العربية) */
  const extractISO = (s) => {
    /* ندعم الأرقام العربية أولاً ثم نبحث عن صيغة YYYY-MM-DD */
    const m = toEnDigits(String(s || "")).match(/\d{4}-\d{2}-\d{2}/);
    return m ? m[0] : "";
  };

  /* مهلة زمنية لأي وعد */
  const withTimeout = (promise, ms) =>
    /* Promise.race يأخذ أول نتيجة: إما الطلب ينجح، أو المؤقت ينتهي */
    Promise.race([promise, new Promise((_, rej) => setTimeout(() => rej(new Error("انتهت المهلة")), ms))]);

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  return { toArDigits, toEnDigits, arNum, fmtGreg, daysLeft, leftText, extractISO, withTimeout, wait };
})();
