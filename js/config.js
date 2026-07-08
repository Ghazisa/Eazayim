/* ═══════════════════════════════════════════════════════
   إعدادات التطبيق — عدّل هنا فقط
   ═══════════════════════════════════════════════════════ */

const CONFIG = {  

  /* مزوّد الذكاء الاصطناعي للمسح.
     اكتب "gemini" لاستخدام Gemini، أو "anthropic" لاستخدام Claude.
     للرفع على GitHub اترك هذه القيم كما هي ثم أضف المفتاح محلياً. */
  PROVIDER: "gemini", // اختر "gemini" أو "anthropic"

  /* ── مفاتيح API ──
     المفتاح هو الذي يسمح للمتصفح بإرسال صورة الدعوة للنموذج.
     ملاحظة مهمة: لا تنشر هذا الملف علناً إذا كان فيه مفتاح حقيقي.
     للتجربة المحلية فقط، اترك القيم أدناه كما هي إذا كنت تريد رفع المشروع على GitHub. */

  GEMINI_API_KEY: "ضع مفتاح Gemini هنا", // مفتاح Gemini المحلي

  /* مفتاح Anthropic اختياري، تحتاجه فقط إذا غيرت PROVIDER إلى "anthropic" */
  ANTHROPIC_API_KEY: "ضع مفتاح Anthropic هنا",

  /* أسماء النماذج المستخدمة عند إرسال الصورة للمزوّد المختار */
  ANTHROPIC_MODEL: "claude-sonnet-4-6",
  GEMINI_MODEL: "gemini-2.5-flash",

  /* إعدادات معالجة الصور قبل الإرسال.
     الهدف هو تقليل حجم الصورة بدون خسارة القراءة. */
  MAX_IMAGE_SIDE: 1000,   // أطول ضلع بالبكسل
  JPEG_QUALITY: 0.8,      // جودة الضغط (0 - 1)

  /* المهلة القصوى لطلب المسح بالمللي ثانية.
     90000 تعني 90 ثانية قبل اعتبار الطلب فاشلاً. */
  REQUEST_TIMEOUT: 90000,
};

/* هل المفتاح مضبوط؟
   app.js يستخدم هذه الدالة ليقرر هل يظهر تحذير "لم يُضبط مفتاح API" أم لا. */
CONFIG.hasKey = function () {
  const isPlaceholder = (value) => !value || value.includes("هنا") || value.toLowerCase().includes("here") || value.toLowerCase().includes("your");
  if (this.PROVIDER === "gemini") return !!this.GEMINI_API_KEY && !isPlaceholder(this.GEMINI_API_KEY);
  return !!this.ANTHROPIC_API_KEY && !isPlaceholder(this.ANTHROPIC_API_KEY);
};
