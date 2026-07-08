/* ═══════════════════════════════════════════════════════
   منطق الواجهة الرئيسي
   سير العملية: إرفاق الصورة ← مسحها ← تعبئة الحقول تلقائياً
                ← مراجعة ← حفظ ← تبقى محفوظة بعد الخروج والعودة
   ═══════════════════════════════════════════════════════ */

(() => {

  const $ = (id) => document.getElementById(id);

  /* ─── الحالة ─── */
  let invitations = [];     // كل الدعوات
  let pendingImg = null;    // صورة الدعوة الجاري إضافتها (مضغوطة)
  let currentId = null;     // الدعوة المفتوحة في التفاصيل

  /* ─── تنبيه عائم ─── */
  const toast = (msg) => {
    const t = $("toast");
    t.textContent = msg;
    t.classList.add("show");
    setTimeout(() => t.classList.remove("show"), 2600);
  };

  /* ═══════════ العرض ═══════════ */

  const cardHTML = (v) => {
    const n = Utils.daysLeft(v.greg);
    const past = n != null && n < 0;
    const soon = n != null && n >= 0 && n <= 7;
    return `
      <div class="inv${past ? " past" : ""}" data-id="${v.id}" tabindex="0" role="button" aria-label="تفاصيل دعوة ${v.groom || ""}">
        <div class="thumb${v.img ? " hasimg" : ""}"${v.img ? ` style="background-image:url('${v.img}')"` : ""}>
          <button class="del" data-del="${v.id}" aria-label="حذف الدعوة" title="حذف الدعوة">✕</button>
          <span class="badge${soon ? " soon" : ""}">${Utils.leftText(n)}</span>
        </div>
        <div class="body">
          <h3>${v.groom || "بدون اسم"}</h3>
          <div class="meta">${v.day || ""}<br>📍 ${v.city || "—"}${v.hall ? " · " + v.hall : ""}</div>
        </div>
      </div>`;
  };

  const render = () => {
    const q = $("q").value.trim();
    const filtered = invitations.filter((v) =>
      !q || [v.groom, v.host, v.city, v.hall].some((x) => (x || "").includes(q)));

    const upcoming = filtered
      .filter((v) => { const n = Utils.daysLeft(v.greg); return n == null || n >= 0; })
      .sort((a, b) => ((a.greg || "9999") < (b.greg || "9999") ? -1 : 1));
    const past = filtered
      .filter((v) => { const n = Utils.daysLeft(v.greg); return n != null && n < 0; })
      .sort((a, b) => (a.greg < b.greg ? 1 : -1));

    /* الإحصائيات */
    $("stAll").textContent = Utils.arNum(invitations.length);
    $("stUp").textContent = Utils.arNum(invitations.filter((v) => { const n = Utils.daysLeft(v.greg); return n != null && n >= 0; }).length);
    $("stWeek").textContent = Utils.arNum(invitations.filter((v) => { const n = Utils.daysLeft(v.greg); return n != null && n >= 0 && n <= 7; }).length);

    /* القائمة */
    let html = "";
    if (!invitations.length) {
      html = `<div class="empty"><h2>لا توجد دعوات بعد</h2><p>اضغط «إضافة دعوة» — ارفع صورة الدعوة<br>وسيمسحها الذكاء الاصطناعي ويعبّئ الحقول تلقائياً</p></div>`;
    } else {
      if (upcoming.length) html += `<div class="sec-title">مناسبات قادمة <span class="cnt">${Utils.arNum(upcoming.length)}</span></div><div class="grid">${upcoming.map(cardHTML).join("")}</div>`;
      if (past.length) html += `<div class="sec-title">مناسبات سابقة <span class="cnt">${Utils.arNum(past.length)}</span></div><div class="grid">${past.map(cardHTML).join("")}</div>`;
      if (!upcoming.length && !past.length) html = `<div class="empty"><h2>لا نتائج مطابقة</h2><p>جرّب كلمة بحث أخرى</p></div>`;
    }
    $("list").innerHTML = html;

    /* ربط أحداث البطاقات */
    document.querySelectorAll(".inv").forEach((el) => {
      el.addEventListener("click", (e) => { if (!e.target.closest(".del")) openDetails(el.dataset.id); });
      el.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openDetails(el.dataset.id); } });
    });
    document.querySelectorAll(".del").forEach((btn) =>
      btn.addEventListener("click", (e) => { e.stopPropagation(); deleteInvitation(btn.dataset.del); }));
  };

  /* ═══════════ التفاصيل والحذف ═══════════ */

  const openDetails = (id) => {
    const v = invitations.find((x) => x.id === id);
    if (!v) return;
    currentId = id;
    $("vGroom").textContent = v.groom || "—";
    $("vHost").textContent = v.host || "—";
    $("vDay").textContent = v.day || "—";
    $("vHijri").textContent = v.hijri || "—";
    $("vGreg").textContent = Utils.fmtGreg(v.greg);
    $("vLeft").textContent = Utils.leftText(Utils.daysLeft(v.greg));
    $("vCity").textContent = v.city || "—";
    $("vHall").textContent = v.hall || "—";
    $("vNote").textContent = v.note || "";
    $("vPhone").textContent = v.phone || "—";
    if (v.img) { $("vImg").src = v.img; $("vImgWrap").style.display = "block"; }
    else { $("vImg").removeAttribute("src"); $("vImgWrap").style.display = "none"; }
    $("viewSheet").classList.add("show");
  };

  const deleteInvitation = (id) => {
    if (!confirm("هل تريد حذف هذه الدعوة نهائياً؟")) return;
    invitations = Store.remove(id);
    if (currentId === id) { currentId = null; $("viewSheet").classList.remove("show"); }
    render();
    toast("تم حذف الدعوة");
  };

  /* ═══════════ دورة الإضافة: صورة ← مسح ← تعبئة تلقائية ═══════════ */

  const setStep = (id, state) => { $(id).className = state; };
  const fillForm = (d) => {
    $("fGroom").value = d.groom; $("fHost").value = d.host;
    $("fDay").value = d.day;     $("fHijri").value = d.hijri;
    $("fGreg").value = d.greg;   $("fCity").value = d.city;
    $("fHall").value = d.hall;   $("fPhone").value = d.phone;
    $("fNote").value = d.note;
  };

  const analyze = async (file) => {
    if (!file) return toast("لم يتم اختيار ملف");

    /* تهيئة الواجهة */
    $("drop").style.display = "none";
    const steps = $("steps");
    steps.classList.add("show");
    ["s1", "s2", "s3"].forEach((s) => setStep(s, ""));
    $("ocrMsg").className = "ocr-msg";
    $("retryOcr").style.display = "none";

    setStep("s1", "on");
    const result = await OCR.scan(file, (t) => {
      $("subStep").textContent = t;
      if (t.includes("مسح")) { setStep("s1", "done"); setStep("s2", "on"); }
    });
    $("subStep").textContent = "";
    setStep("s1", "done"); setStep("s2", "done"); setStep("s3", "on");
    await Utils.wait(250);
    setStep("s3", "done");

    /* عرض المعاينة وحفظ نسخة الصورة */
    pendingImg = result.display;
    $("preview").src = pendingImg;
    $("preview").style.display = "block";

    const msg = $("ocrMsg");
    if (result.data) {
      fillForm(result.data);
      msg.className = "ocr-msg ok";
      msg.textContent = "✓ تم مسح الدعوة واستخراج معلوماتها وتعبئة الحقول — راجع وصحّح ثم احفظ";
    } else {
      msg.className = "ocr-msg manual";
      msg.textContent = "تعذّر المسح التلقائي: " + result.error + " — يمكنك إكمال الحقول يدوياً";
      $("retryOcr").style.display = "block";
    }

    setTimeout(() => steps.classList.remove("show"), 400);
    $("review").classList.add("show");
    $("fGroom").focus();
  };

  const resetAddSheet = () => {
    ["fGroom","fHost","fDay","fHijri","fGreg","fCity","fHall","fPhone","fNote"].forEach((i) => $(i).value = "");
    ["s1","s2","s3"].forEach((s) => setStep(s, ""));
    $("steps").classList.remove("show");
    $("subStep").textContent = "";
    $("ocrMsg").className = "ocr-msg";
    $("retryOcr").style.display = "none";
    $("preview").style.display = "none";
    $("review").classList.remove("show");
    $("drop").style.display = "block";
    $("file").value = "";
    pendingImg = null;
  };

  /* ═══════════ ربط الأحداث ═══════════ */

  /* فتح وإغلاق النوافذ */
  $("addBtn").addEventListener("click", () => { resetAddSheet(); $("addSheet").classList.add("show"); });
  $("cancelAdd").addEventListener("click", () => $("addSheet").classList.remove("show"));
  $("closeView").addEventListener("click", () => $("viewSheet").classList.remove("show"));
  document.querySelectorAll(".sheet").forEach((s) =>
    s.addEventListener("click", (e) => { if (e.target === s) s.classList.remove("show"); }));

  /* استقبال الصورة: اختيار، سحب وإفلات */
  $("file").addEventListener("change", (e) => analyze(e.target.files[0]));
  $("drop").addEventListener("dragover", (e) => { e.preventDefault(); $("drop").classList.add("over"); });
  $("drop").addEventListener("dragleave", () => $("drop").classList.remove("over"));
  $("drop").addEventListener("drop", (e) => { e.preventDefault(); $("drop").classList.remove("over"); analyze(e.dataTransfer.files[0]); });

  /* إعادة محاولة المسح */
  $("retryOcr").addEventListener("click", async () => {
    if (!pendingImg) return;
    const btn = $("retryOcr"), msg = $("ocrMsg");
    btn.disabled = true; btn.textContent = "جارٍ المسح…";
    try {
      const data = await OCR.rescan(pendingImg, (t) => $("subStep").textContent = t);
      fillForm(data);
      msg.className = "ocr-msg ok";
      msg.textContent = "✓ نجح المسح — راجع الحقول ثم احفظ";
      btn.style.display = "none";
    } catch (e) {
      msg.className = "ocr-msg manual";
      msg.textContent = "لم ينجح المسح (" + String(e && e.message || e).slice(0, 140) + ") — أكمل يدوياً";
    }
    $("subStep").textContent = "";
    btn.disabled = false; btn.textContent = "🔁 إعادة محاولة المسح";
  });

  /* حفظ الدعوة */
  $("review").addEventListener("submit", (e) => {
    e.preventDefault();
    if (!$("fGroom").value.trim()) return toast("اسم العريس مطلوب");
    if (!$("fGreg").value) return toast("التاريخ الميلادي مطلوب للترتيب والعدّاد");
    const inv = {
      id: "inv:" + Date.now(),
      groom: $("fGroom").value.trim(),
      host: $("fHost").value.trim(),
      day: Utils.toArDigits($("fDay").value.trim()),
      hijri: Utils.toArDigits($("fHijri").value.trim()),
      greg: $("fGreg").value,
      city: $("fCity").value.trim(),
      hall: $("fHall").value.trim(),
      phone: Utils.toEnDigits($("fPhone").value.trim()),
      note: Utils.toArDigits($("fNote").value.trim()),
      img: pendingImg,
      created: Date.now(),
    };
    invitations = Store.add(inv);
    $("addSheet").classList.remove("show");
    render();
    toast("تمت إضافة الدعوة وحُفظت ✓");
  });

  /* حذف من نافذة التفاصيل */
  $("delBtn").addEventListener("click", () => { if (currentId) deleteInvitation(currentId); });

  /* البحث الفوري */
  $("q").addEventListener("input", render);

  /* النسخ الاحتياطي والاستعادة */
  $("exportBtn").addEventListener("click", () => {
    if (!invitations.length) return toast("لا توجد دعوات لحفظها");
    Store.exportBackup(invitations);
    toast("تم تنزيل النسخة الاحتياطية ✓");
  });
  $("importFile").addEventListener("change", async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      const { list, added } = await Store.importBackup(f);
      invitations = list;
      render();
      toast(added ? `تمت استعادة ${Utils.arNum(added)} دعوة ✓` : "كل الدعوات موجودة مسبقاً");
    } catch { toast("ملف النسخة غير صالح"); }
    e.target.value = "";
  });

  /* ═══════════ التشغيل الأولي ═══════════ */
  invitations = Store.loadAll();
  if (!CONFIG.hasKey()) $("keyWarn").style.display = "block";
  if (!Store.available()) toast("تنبيه: التخزين المحلي معطّل في هذا المتصفح — استخدم النسخة الاحتياطية");
  render();

})();
