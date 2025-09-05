(function(){
  "use strict";

  document.addEventListener("DOMContentLoaded", () => {
    setYear();
    highlightNav();
    addCardFade();

    // Initialize features with try/catch so one failing feature won't break others
    try { initSlideshows(); } catch(e) { console.error("slides init error", e); }
    try { initComments(); } catch(e) { console.error("comments init error", e); }
    try { initQuizGrader(); } catch(e) { console.error("quiz init error", e); }
    try { initAssignGrader(); } catch(e) { console.error("assign init error", e); }
    try { initFileUpload(); } catch(e) { console.error("file upload init error", e); }
    try { initLogin(); } catch(e) { console.error("login init error", e); }
  });

  /* ===== Helpers ===== */
  function setYear(){
    const el = document.getElementById("year");
    if (el) el.textContent = new Date().getFullYear();
  }

  function highlightNav(){
    const page = document.body.getAttribute("data-page") || "";
    document.querySelectorAll(".nav-links a").forEach(a => {
      try {
        const href = a.getAttribute("href") || "";
        if (page && href.includes(page)) a.classList.add("active");
        else if (!page && href === location.pathname.split("/").pop()) a.classList.add("active");
      } catch(e){}
    });
  }

  function addCardFade(){
    document.querySelectorAll(".dashboard, .laws-content, .forces-content, .quiz-content, .assignments-content, .videos-content, .pulley-content, .login-content").forEach(c => c.classList.add("fade-in"));
  }

  /* ===== Login ===== */
  function initLogin(){
    const form = document.getElementById("loginForm");
    const errorMsg = document.getElementById("errorMsg");
    const passwordInput = document.getElementById("password");
    const toggleButton = document.querySelector(".toggle-password");
    if (!form || !errorMsg || !passwordInput) return;

    // Password toggle
    if (toggleButton) {
      toggleButton.addEventListener("click", () => {
        const isPassword = passwordInput.type === "password";
        passwordInput.type = isPassword ? "text" : "password";
        toggleButton.textContent = isPassword ? "🙈" : "👁️";
        toggleButton.setAttribute("aria-label", isPassword ? "Hide password" : "Show password");
      });
    }

    form.addEventListener("submit", function(e){
      e.preventDefault();
      const user = document.getElementById("username")?.value.trim();
      const pass = passwordInput.value.trim();

      if (user && pass) {
        localStorage.setItem("loggedIn", "true");
        localStorage.setItem("username", user);
        window.location.href = "index.html";
      } else {
        errorMsg.textContent = "Please enter valid login details.";
      }
    });
  }

  /* ===== Slideshows (safe multi-container) ===== */
  function initSlideshows(){
    const containers = document.querySelectorAll(".slideshow-container");
    if (!containers.length) return;
    containers.forEach(container => {
      try {
        const slides = Array.from(container.querySelectorAll(".slide"));
        if (!slides.length) return;
        const parent = container.parentElement || container;
        const dots = Array.from(parent.querySelectorAll(".dot"));
        let idx = 0;
        const delay = parseInt(container.dataset.delay || "3000", 10) || 3000;

        function show(i){
          idx = ((i % slides.length) + slides.length) % slides.length;
          slides.forEach(s => s.style.display = "none");
          slides[idx].style.display = "block";
          dots.forEach(d => d.classList.remove("active-dot"));
          if (dots[idx]) dots[idx].classList.add("active-dot");
        }

        slides.forEach(s => s.style.display = "none");
        show(0);

        dots.forEach((d, i) => d.addEventListener("click", () => show(i)));
        container.querySelectorAll(".prev").forEach(p => p.addEventListener("click", () => show(idx - 1)));
        container.querySelectorAll(".next").forEach(n => n.addEventListener("click", () => show(idx + 1)));
        setInterval(() => show(idx + 1), delay);
      } catch(e){
        console.error("slideshow container error", e);
      }
    });
  }

  /* ===== Comments (localStorage per page) ===== */
  function initComments(){
    const form = document.getElementById("commentForm");
    const list = document.getElementById("commentList");
    const nameInput = document.getElementById("commentName");
    const textInput = document.getElementById("commentText");
    if (!form || !list || !nameInput || !textInput) return;

    const key = "comments:" + (document.body.getAttribute("data-page") || location.pathname);
    let data = JSON.parse(localStorage.getItem(key) || "[]");
    renderComments(data, list);

    form.addEventListener("submit", function(e){
      e.preventDefault();
      const name = (nameInput.value || "").trim() || "Anonymous";
      const text = (textInput.value || "").trim();
      if (!text) return;
      const entry = { name, text, ts: new Date().toISOString() };
      data.push(entry);
      localStorage.setItem(key, JSON.stringify(data));
      renderComments(data, list);
      form.reset();
    });
  }

  function renderComments(arr, container){
    container.innerHTML = "";
    arr.slice().reverse().forEach(item => {
      const li = document.createElement("li");
      li.innerHTML = `<strong>${escapeHtml(item.name)}</strong>: ${escapeHtml(item.text)}<br><div class="muted small">${new Date(item.ts).toLocaleString()}</div>`;
      container.appendChild(li);
    });
  }

  /* ===== Quiz grading ===== */
  function initQuizGrader(){
    const form = document.getElementById("quizForm");
    if (!form) return;
    form.addEventListener("submit", function(e){
      e.preventDefault();
      e.stopImmediatePropagation && e.stopImmediatePropagation();
      try { gradeQuiz(form); } catch(err) { console.error("quiz error", err); }
    }, { capture: true });
  }

  function gradeQuiz(form){
    const answerKey = { q1: "b", q2: "b", q3: "b", q4: "c", q5: "a" };
    let resultEl = document.getElementById("quizResult");
    if (!resultEl){
      resultEl = document.createElement("div");
      resultEl.id = "quizResult";
      resultEl.className = "quiz-result";
      form.parentNode.insertBefore(resultEl, form.nextSibling);
    }

    const presentQs = Object.keys(answerKey).filter(k => form.querySelectorAll(`input[name="${k}"]`).length > 0);
    let total = presentQs.length;
    if (!total){
      const radios = Array.from(form.querySelectorAll('input[type="radio"]'));
      const names = Array.from(new Set(radios.map(r => r.name).filter(Boolean)));
      total = names.length;
      let score = 0;
      names.forEach(n => {
        const sel = form.querySelector(`input[name="${n}"]:checked`);
        if (sel && answerKey[n] && sel.value === answerKey[n]) score++;
      });
      resultEl.textContent = `You scored ${score} / ${total}`;
      resultEl.className = "quiz-result " + (score >= Math.ceil(total * 0.6) ? "good" : "bad");
      return;
    }

    let score = 0;
    presentQs.forEach(q => {
      const sel = form.querySelector(`input[name="${q}"]:checked`);
      if (sel && sel.value === answerKey[q]) score++;
    });

    resultEl.textContent = `You scored ${score} / ${total} (${Math.round((total ? (score / total) * 100 : 0))}%)`;
    resultEl.className = "quiz-result " + (score >= Math.ceil(total * 0.6) ? "good" : "bad");
  }

  /* ===== Assignments grading ===== */
  function initAssignGrader(){
    const form = document.getElementById("assignForm");
    if (!form) return;
    form.addEventListener("submit", function(e){
      e.preventDefault();
      e.stopImmediatePropagation && e.stopImmediatePropagation();
      try { gradeAssign(form); } catch(err){ console.error("gradeAssign error", err); }
    }, { capture: true });
  }

  function gradeAssign(form){
    let resultEl = document.getElementById("assignResult");
    if (!resultEl){
      resultEl = document.createElement("div");
      resultEl.id = "assignResult";
      resultEl.className = "quiz-result";
      form.parentNode.insertBefore(resultEl, form.nextSibling);
    }

    let a1 = (form.querySelector('input[name="a1"]')?.value || "").toLowerCase();
    let a2raw = (form.querySelector('input[name="a2"]')?.value || "").toLowerCase();
    let a3 = (form.querySelector('input[name="a3"]')?.value || "").toLowerCase();

    if (!a1 && !a2raw && !a3) {
      const textInputs = Array.from(form.querySelectorAll('input[type="text"], input[type="number"], textarea')).slice(0, 3);
      if (textInputs[0] && !a1) a1 = (textInputs[0].value || "").toLowerCase();
      if (textInputs[1] && !a2raw) a2raw = (textInputs[1].value || "").toLowerCase();
      if (textInputs[2] && !a3) a3 = (textInputs[2].value || "").toLowerCase();
    }

    let score = 0, total = 3;
    if (a1 && a1.includes("action") && a1.includes("reaction")) score++;
    const num = extractNumber(a2raw);
    if (num !== null && Math.abs(num - 5) <= 0.2) score++;
    const nonContact = ["gravity", "gravitational", "electrostatic", "electric", "magnetic", "magnetism"];
    const found = new Set();
    nonContact.forEach(k => { if (a3.includes(k)) found.add(k); });
    if (found.size >= 2) score++;

    resultEl.textContent = `You scored ${score} / ${total} (${Math.round((score / total) * 100)}%)`;
    resultEl.className = "quiz-result " + (score >= Math.ceil(total * 0.6) ? "good" : "bad");
  }

  /* ===== File Upload Demo ===== */
  function initFileUpload(){
    const upload = document.getElementById("uploadField");
    const uploadInfo = document.getElementById("uploadInfo");
    if (!upload || !uploadInfo) return;
    upload.addEventListener("change", function(){
      const f = upload.files[0];
      if (!f) {
        uploadInfo.textContent = "No file selected.";
        return;
      }
      uploadInfo.textContent = `Selected: ${f.name} (${Math.round(f.size / 1024)} KB) — This file stays in your browser only.`;
    });
  }

  /* ===== Utilities ===== */
  function extractNumber(text){
    if (!text) return null;
    const m = ("" + text).match(/-?\d+(\.\d+)?/);
    return m ? parseFloat(m[0]) : null;
  }

  function escapeHtml(s){
    return (s + "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c]));
  }

  // Expose slideshow controls to global scope for inline onclick
  window.plusSlides = function(n) {
    const containers = document.querySelectorAll(".slideshow-container");
    if (containers.length) {
      const slides = Array.from(containers[0].querySelectorAll(".slide"));
      let idx = parseInt(containers[0].dataset.currentIndex || "0", 10);
      idx = ((idx + n) % slides.length + slides.length) % slides.length;
      containers[0].dataset.currentIndex = idx;
      showSlides(containers[0], idx);
    }
  };

  window.currentSlide = function(n) {
    const containers = document.querySelectorAll(".slideshow-container");
    if (containers.length) {
      containers[0].dataset.currentIndex = n - 1;
      showSlides(containers[0], n - 1);
    }
  };

  function showSlides(container, i){
    const slides = Array.from(container.querySelectorAll(".slide"));
    const dots = Array.from(container.parentElement.querySelectorAll(".dot"));
    const idx = ((i % slides.length) + slides.length) % slides.length;
    slides.forEach(s => s.style.display = "none");
    slides[idx].style.display = "block";
    dots.forEach(d => d.classList.remove("active-dot"));
    if (dots[idx]) dots[idx].classList.add("active-dot");
  }

  // Expose debug helper
  window.__MECH_DEBUG = {
    forms: function(){ return Array.from(document.forms).map(f => ({ id:f.id, name:f.name, inputs: Array.from(f.elements).map(i=>({name:i.name,type:i.type,tag:i.tagName})) })); }
  };
})();