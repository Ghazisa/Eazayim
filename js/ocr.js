/* ═══════════════════════════════════════════════════════
   محرك المسح والاستخراج (OCR Engine)
   المنطق: صورة ← ضغط ← إرسال للنموذج ← JSON ← توحيد الأرقام
   يدعم مزوّدين: Anthropic (الافتراضي) و Gemini — حسب CONFIG
   ═══════════════════════════════════════════════════════ */

const OCR = (() => {

  /* تعليمات الاستخراج الموجهة للنموذج — تشمل كل الخطوط العربية */
  const PROMPT =
    "أنت خبير باستخراج بيانات دعوات الزواج السعودية بجميع الخطوط العربية " +
    "(ثلث، ديواني، نسخ، رقعة، كوفي). اقرأ الصورة المرفقة بدقة وأرجع كائن JSON " +
    "فقط دون أي نص آخر أو علامات markdown، بهذه المفاتيح بالضبط:\n" +
    '{"groom":"اسم العريس أو العرسان كاملاً كما هو مكتوب",' +
    '"host":"اسم الداعي أو الداعين",' +
    '"day":"اليوم والليلة إن ذُكرت مثل: يوم الجمعة ليلة السبت",' +
    '"hijri":"التاريخ الهجري نصاً بالشهر العربي والأرقام العربية الشرقية مثل: ١٨ محرم ١٤٤٨هـ",' +
    '"greg":"التاريخ الميلادي بصيغة YYYY-MM-DD بالأرقام الإنجليزية حصراً، واحسبه بدقة من الهجري إن لم يُذكر",' +
    '"city":"المدينة أو المحافظة، وإذا وُجد الحي أضفه",' +
    '"hall":"اسم القاعة أو القصر",' +
    '"phone":"رقم الاستفسار بالأرقام الإنجليزية فقط",' +
    '"note":"ملاحظات مثل وقت العشاء أو استقبال الضيوف"}\n' +
    'اكتب القيم بالعربية الفصحى الموحدة، وضع "" لأي حقل غير موجود، ولا تخترع معلومات.';

  /* ─── الخطوة ١: قراءة ملف الصورة إلى Data URL ─── */
  const readFile = (file) =>
    new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => reject(new Error("تعذّرت قراءة ملف الصورة"));
      r.readAsDataURL(file);
    });

  /* ─── الخطوة ٢: ضغط الصورة (خلفية بيضاء للشفافية + JPEG) ─── */
  const compress = async (dataUrl, maxSide = CONFIG.MAX_IMAGE_SIDE, quality = CONFIG.JPEG_QUALITY) => {
    try {
      const img = new Image();
      img.src = dataUrl;
      await new Promise((res, rej) => { img.onload = res; img.onerror = () => rej(new Error("صيغة الصورة غير مدعومة")); });
      const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement("canvas");
      c.width = Math.max(1, Math.round(img.naturalWidth * scale));
      c.height = Math.max(1, Math.round(img.naturalHeight * scale));
      const x = c.getContext("2d");
      x.fillStyle = "#fff";
      x.fillRect(0, 0, c.width, c.height);
      x.drawImage(img, 0, 0, c.width, c.height);
      const out = c.toDataURL("image/jpeg", quality);
      return out && out.length > 100 ? out : dataUrl;
    } catch (e) { return dataUrl; }
  };

  /* ─── استخلاص JSON من رد النموذج مهما أحاطه من نصوص ─── */
  const parseResponse = (text) => {
    const m = String(text || "").replace(/```json|```/gi, "").match(/\{[\s\S]*\}/);
    if (!m) throw new Error("رد النموذج لم يتضمن بيانات منظمة");
    const o = JSON.parse(m[0]);
    if (o && typeof o === "object") return o;
    throw new Error("بيانات غير صالحة");
  };

  /* ─── المزوّد أ: Anthropic (Claude) — اتصال مباشر من المتصفح بمفتاحك ─── */
  const askAnthropic = async (dataUrl) => {
    const b64 = dataUrl.split(",")[1];
    const mime = dataUrl.substring(5, dataUrl.indexOf(";"));
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": CONFIG.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: CONFIG.ANTHROPIC_MODEL,
        max_tokens: 1000,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mime, data: b64 } },
            { type: "text", text: PROMPT },
          ],
        }],
      }),
    });
    const d = await res.json().catch(() => null);
    if (!d) throw new Error("رد غير مقروء من الخدمة");
    if (d.error) throw new Error(d.error.message || d.error.type || "خطأ من الخدمة");
    return parseResponse((d.content || []).map((c) => c.text || "").filter(Boolean).join("\n"));
  };

  /* ─── المزوّد ب: Gemini ─── */
  const askGemini = async (dataUrl) => {
    const b64 = dataUrl.split(",")[1];
    const mime = dataUrl.substring(5, dataUrl.indexOf(";"));
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${CONFIG.GEMINI_MODEL}:generateContent?key=${CONFIG.GEMINI_API_KEY}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: PROMPT }, { inlineData: { mimeType: mime, data: b64 } }] }] }),
    });
    if (!res.ok) throw new Error("خدمة Gemini غير متاحة (" + res.status + ")");
    const d = await res.json();
    const text = d.candidates?.[0]?.content?.parts?.[0]?.text || "";
    return parseResponse(text);
  };

  /* ─── توحيد المخرجات حسب الكود السعودي الموحد ─── */
  const normalize = (raw) => ({
    groom: String(raw.groom || "").trim(),
    host:  String(raw.host  || "").trim(),
    day:   Utils.toArDigits(String(raw.day   || "").trim()),
    hijri: Utils.toArDigits(String(raw.hijri || "").trim()),
    greg:  Utils.extractISO(raw.greg || raw.gregorian || ""),
    city:  String(raw.city || raw.location || "").trim(),
    hall:  String(raw.hall || "").trim(),
    phone: Utils.toEnDigits(String(raw.phone || "").trim()),
    note:  Utils.toArDigits(String(raw.note || raw.notes || "").trim()),
  });

  /* ═══ الواجهة الرئيسية: صورة كاملة ← بيانات جاهزة للتعبئة ═══
     تعيد { data, display } حيث display نسخة مضغوطة للعرض والحفظ */
  const scan = async (file, onStatus = () => {}) => {
    onStatus("استقبال الصورة…");
    const original = await readFile(file);

    onStatus("ضغط الصورة وتجهيزها…");
    const prepared = await compress(original);

    if (!CONFIG.hasKey()) {
      return { data: null, display: prepared,
        error: "لم يُضبط مفتاح API — افتح js/config.js وضع مفتاحك، أو أكمل الحقول يدوياً" };
    }

    onStatus("مسح الدعوة واستخراج المعلومات…");
    try {
      const raw = CONFIG.PROVIDER === "gemini"
        ? await Utils.withTimeout(askGemini(prepared), CONFIG.REQUEST_TIMEOUT)
        : await Utils.withTimeout(askAnthropic(prepared), CONFIG.REQUEST_TIMEOUT);
      return { data: normalize(raw), display: prepared, error: "" };
    } catch (e) {
      /* محاولة ثانية بنسخة أخف تلقائياً */
      onStatus("محاولة ثانية بنسخة أخف…");
      try {
        const lighter = await compress(original, 680, 0.6);
        const raw = CONFIG.PROVIDER === "gemini"
          ? await Utils.withTimeout(askGemini(lighter), CONFIG.REQUEST_TIMEOUT)
          : await Utils.withTimeout(askAnthropic(lighter), CONFIG.REQUEST_TIMEOUT);
        return { data: normalize(raw), display: prepared, error: "" };
      } catch (e2) {
        return { data: null, display: prepared,
          error: String(e2 && e2.message || e2).slice(0, 160) };
      }
    }
  };

  /* إعادة المسح لصورة سبق تجهيزها (زر إعادة المحاولة) */
  const rescan = async (preparedDataUrl, onStatus = () => {}) => {
    onStatus("إعادة المسح…");
    const raw = CONFIG.PROVIDER === "gemini"
      ? await Utils.withTimeout(askGemini(preparedDataUrl), CONFIG.REQUEST_TIMEOUT)
      : await Utils.withTimeout(askAnthropic(preparedDataUrl), CONFIG.REQUEST_TIMEOUT);
    return normalize(raw);
  };

  return { scan, rescan };
})();
