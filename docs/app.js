// Flame Division Academy — Tutor AI Instructor Engine
// app.js — client-side logic, evaluation, TTS, certificate generation (simplified TTS wiring)

document.addEventListener("DOMContentLoaded", function () {
  let appError = false;

    // ------------------------------
  // SAFARI / IN-APP BROWSER DETECTOR
  // ------------------------------
  function isInAppBrowser() {
    const ua = navigator.userAgent || navigator.vendor || window.opera;

    // Known in-app browser signatures
    const blockers = [
      "GITHUB",       // GitHub mobile app
      "FBAN", "FBAV", // Facebook
      "Instagram",    // IG browser
      "Twitter",      // X browser
      "TikTok",       // TikTok browser
      "Snapchat",     // Snap browser
      "Electron",     // Some wrappers
      "ChatGPT",      // ChatGPT in-app browser
      "Pinterest",
      "Discord",
      "Messenger"
    ];

    return blockers.some(b => ua.includes(b));
  }

  function isRealSafari() {
    const ua = navigator.userAgent;
    const isSafari = /^((?!chrome|android|crios|fxios).)*safari/i.test(ua);
    return isSafari;
  }

  // If not real Safari OR inside an in-app browser → warn user
  if (isInAppBrowser() || !isRealSafari()) {
    setTimeout(() => {
      alert(
        "⚠️ Audio Disabled: Your browser does not allow Text-to-Speech.\n\n" +
        "Open this page in Safari for full instructor audio."
      );
    }, 600);
  }

  const hasSynth =
  typeof window !== "undefined" && typeof window.speechSynthesis !== "undefined";
const hasUtter =
  typeof window !== "undefined" && typeof window.SpeechSynthesisUtterance !== "undefined";

const state = {
  currentInstructor: "systems",
  lastResult: null,
  lastCertificate: null,
  tts: {
    synth: hasSynth ? window.speechSynthesis : null,
    currentUtterance: null,
    supported: hasSynth && hasUtter,
  },
};
  
  console.log("🔥 Tutor AI loaded — TTS supported:", state.tts.supported);

  // Pre-load voices for Safari/iOS quirks
  if (state.tts.synth && typeof state.tts.synth.getVoices === "function") {
  try {
    state.tts.synth.getVoices();
    window.speechSynthesis.onvoiceschanged =
      window.speechSynthesis.onvoiceschanged ||
      function () {
        state.tts.synth.getVoices();
      };
  } catch (e) {
    console.warn("TTS voices warm-up issue:", e);
  }
}
  // Element refs
  const instructorRadios = document.querySelectorAll('input[name="instructorType"]');
  const instructorDescription = document.getElementById("instructor-description");
  const studentNameInput = document.getElementById("studentName");
  const lessonNameInput = document.getElementById("lessonName");
  const systemUrlInput = document.getElementById("systemUrl");
  const lessonDescInput = document.getElementById("lessonDescription");
  const descCount = document.getElementById("description-count");
  const ethicsAck = document.getElementById("ethicsAck");

  const selfCheckStatus = document.getElementById("selfCheckStatus");
  const selfCheckList = document.getElementById("selfCheckList");

  const btnIntroPlay = document.getElementById("btnIntroPlay");
  const btnIntroStop = document.getElementById("btnIntroStop");
  const btnEvaluate = document.getElementById("btnEvaluate");
  const btnResultPlay = document.getElementById("btnResultPlay");
  const btnResultStop = document.getElementById("btnResultStop");
  const btnNotifyInstructor = document.getElementById("btnNotifyInstructor");
  const btnCertVoice = document.getElementById("btnCertVoice");

  const statusBadge = document.getElementById("statusBadge");
  const activeInstructorLabel = document.getElementById("activeInstructorLabel");
  const resultSummary = document.getElementById("resultSummary");
  const metaStudent = document.getElementById("metaStudent");
  const metaLesson = document.getElementById("metaLesson");
  const metaInstructor = document.getElementById("metaInstructor");
  const metaResult = document.getElementById("metaResult");
  const certificatePreview = document.getElementById("certificatePreview");
  const certificateUrl = document.getElementById("certificateUrl");
  const notifyMessage = document.getElementById("notifyMessage");
  const disclaimerText = document.getElementById("disclaimerText");

  // ----------------- Helper UI -----------------

  function setBadge(el, type, text) {
    el.classList.remove("badge-soft", "badge-ok", "badge-bad");
    if (type === "ok") el.classList.add("badge-ok");
    else if (type === "bad") el.classList.add("badge-bad");
    else el.classList.add("badge-soft");
    el.textContent = text;
  }

  function stopSpeech() {
    if (!state.tts.synth) return;
    try {
      state.tts.synth.cancel();
    } catch (e) {
      console.warn("TTS cancel error:", e);
    }
    state.tts.currentUtterance = null;
  }

  // SUPER-SIMPLE TTS WRAPPER (battle-tested for iOS Safari)
  function speak(text, voiceType) {
  if (!text) return;

  // Re-check at call time in case the environment was slow to expose APIs
  const synth = state.tts.synth || window.speechSynthesis;
  const Utter = window.SpeechSynthesisUtterance;

  if (!synth || typeof Utter === "undefined") {
    console.warn("TTS not available in this browser/runtime.");
    return;
  }

  stopSpeech();

  const utter = new Utter(text);

  // Instructor-style tuning
  if (voiceType === "systems") {
    utter.rate = 1.02;
    utter.pitch = 0.92;
  } else if (voiceType === "ethics") {
    utter.rate = 0.96;
    utter.pitch = 1.02;
  } else {
    utter.rate = 1.0;
    utter.pitch = 1.0;
  }
  utter.volume = 1.0;

  utter.onerror = function (event) {
    console.error("TTS utterance error:", event.error);
  };

  console.log("🔊 TTS speak call:", (text || "").slice(0, 120));
  state.tts.currentUtterance = utter;

  try {
    setTimeout(function () {
      synth.speak(utter);
    }, 0);
  } catch (e) {
    console.error("TTS speak error:", e);
  }
}
  
  function currentInstructorLabel() {
    return state.currentInstructor === "systems" ? "Systems Instructor" : "Ethics Instructor";
  }

  function updateInstructorUi() {
    activeInstructorLabel.textContent =
      "Instructor: " + (state.currentInstructor === "systems" ? "Systems" : "Ethics");

    if (state.currentInstructor === "systems") {
      instructorDescription.textContent =
        "Systems Instructor active. Focus: HTML/CSS/JS structure, file wiring, stability, and implementation standards. “Structure without clarity is chaos.”";
      disclaimerText.textContent =
        "Structural clarity is non-negotiable. The Systems Instructor evaluates how your HTML, CSS, and JavaScript cooperate to form a stable, maintainable system.";
    } else {
      instructorDescription.textContent =
        "Ethics Instructor active. Focus: governance, accountability, risk framing, and responsible AI deployment. “Ethics approval does not remove responsibility. It confirms awareness.”";
      disclaimerText.textContent =
        "Ethics approval does not remove responsibility. It confirms awareness. The Ethics Instructor evaluates whether you understand the impact, risks, and accountability boundaries of your system.";
    }
  }

  function updateDescriptionCount() {
    const len = (lessonDescInput.value || "").trim().length;
    descCount.textContent = `${len} characters (minimum recommended: 160)`;
  }

  // ----------------- Self-check -----------------

  function runSelfCheck() {
    const issues = [];
    const checks = [];

    // CSS + JS linking
    const cssLinked = !!document.querySelector('link[rel="stylesheet"][href*="style.css"]');
    const jsLinked = !!document.querySelector('script[src*="app.js"]');
    if (!cssLinked) issues.push("CSS file (style.css) is not linked in the HTML head.");
    if (!jsLinked) issues.push("JavaScript file (app.js) is not linked with a <script> tag.");
    checks.push(
      cssLinked && jsLinked ? "CSS and JS links detected." : "CSS/JS link detection failed. Check file names and paths."
    );

    // Init
    if (appError) {
      issues.push("An application initialization error was detected. Check the browser console for details.");
    } else {
      checks.push("Core initialization completed without fatal errors.");
    }

    // TTS presence
    if (!state.tts.supported) {
      issues.push(
        "Web Speech API (speechSynthesis) is not available in this environment. Instructors will not speak on this device/browser."
      );
    } else {
      checks.push("Text-to-Speech engine detected. Instructors are cleared to speak after button presses.");
    }

    // Ethics ack
    if (!ethicsAck.checked) {
      issues.push("Ethics acknowledgment checkbox is not checked.");
    } else {
      checks.push("Ethics acknowledgment confirmed.");
    }

    selfCheckList.innerHTML = "";
    const allOk = issues.length === 0;
    const entries = allOk ? checks : [...checks, ...issues];

    entries.forEach((msg) => {
      const li = document.createElement("li");
      li.textContent = msg;
      if (issues.includes(msg)) li.style.color = "#ffb0c1";
      selfCheckList.appendChild(li);
    });

    if (allOk) setBadge(selfCheckStatus, "ok", "Self-check passed");
    else setBadge(selfCheckStatus, "bad", "Self-check failed");

    return allOk;
  }

  // ----------------- Eval Logic -----------------

  function collectFormData() {
    const student = (studentNameInput.value || "").trim();
    const lesson = (lessonNameInput.value || "").trim();
    const url = (systemUrlInput.value || "").trim();
    const desc = (lessonDescInput.value || "").trim();
    const ethics = !!ethicsAck.checked;
    return { student, lesson, url, desc, ethics };
  }

  function validateForm(data) {
    const errors = [];
    if (!data.student) errors.push("Student name is required.");
    if (!data.lesson) errors.push("Lesson name is required.");
    if (!data.url) errors.push("System URL is required.");
    if (!data.desc) errors.push("System description is required.");
    if (!data.ethics) errors.push("Ethics acknowledgment is required.");
    return errors;
  }

  function scoreSubmission(data) {
    let score = 0;

    if (data.student) score += 1;
    if (data.lesson) score += 1;
    if (data.url.startsWith("https://")) score += 2;
    else if (data.url.startsWith("http://")) score += 1;

    const len = data.desc.length;
    if (len >= 160 && len <= 1000) score += 3;
    else if (len >= 100) score += 2;
    else if (len >= 60) score += 1;

    if (data.ethics) score += 2;

    if (state.currentInstructor === "systems") {
      const lower = data.desc.toLowerCase();
      ["html", "css", "javascript", "js", "tts", "speech", "structure", "wiring"].forEach((token) => {
        if (lower.includes(token)) score += 0.5;
      });
    } else {
      const lower = data.desc.toLowerCase();
      ["ethics", "privacy", "responsible", "governance", "risk", "accountability", "alignment", "safety"].forEach(
        (token) => {
          if (lower.includes(token)) score += 0.5;
        }
      );
    }

    return score;
  }

  function decideResult(score) {
    return score >= 7 ? "pass" : "fail";
  }

  function generateCertificate(data, instructorType) {
    const now = new Date();
    const date = now.toISOString().slice(0, 10);
    const random = Math.floor(Math.random() * 9000) + 1000;
    const id = `FDA-${random}`;

    const urlParams = new URLSearchParams();
    urlParams.set("name", data.student || "");
    urlParams.set("lesson", data.lesson || "");
    urlParams.set("instructor", instructorType === "systems" ? "Systems" : "Ethics");
    urlParams.set("date", date);
    urlParams.set("id", id);

    const certUrl = `certificates/index.html?${urlParams.toString()}`;

    return {
      student: data.student,
      lesson: data.lesson,
      instructor: instructorType === "systems" ? "Systems Instructor" : "Ethics Instructor",
      date,
      id,
      url: certUrl,
    };
  }

  function renderCertificate(cert) {
    certificatePreview.classList.remove("certificate-preview-empty");
    certificatePreview.innerHTML = "";

    const wrapper = document.createElement("div");
    wrapper.className = "certificate-inner";

    const header = document.createElement("div");
    header.className = "certificate-header";

    const title = document.createElement("div");
    title.className = "certificate-header-title";
    title.textContent = "PROVISIONAL CERTIFICATE";

    const badge = document.createElement("div");
    badge.className = "certificate-badge";
    badge.textContent = "PENDING HUMAN REVIEW";

    header.appendChild(title);
    header.appendChild(badge);

    const body = document.createElement("div");
    body.className = "certificate-body";

    const left = document.createElement("div");
    const intro = document.createElement("p");
    intro.textContent =
      "This document confirms provisional evaluation of the following system under Flame Division Academy.";
    left.appendChild(intro);

    const fields = document.createElement("div");
    fields.className = "certificate-fields";

    function fieldRow(label, value) {
      const row = document.createElement("div");
      const l = document.createElement("div");
      l.className = "certificate-field-label";
      l.textContent = label;
      const v = document.createElement("div");
      v.className = "certificate-field-value";
      v.textContent = value || "—";
      row.appendChild(l);
      row.appendChild(v);
      return row;
    }

    fields.appendChild(fieldRow("Student", cert.student));
    fields.appendChild(fieldRow("Lesson", cert.lesson));
    fields.appendChild(fieldRow("Instructor", cert.instructor));
    fields.appendChild(fieldRow("Date", cert.date));
    fields.appendChild(fieldRow("Certificate ID", cert.id));

    left.appendChild(fields);

    const right = document.createElement("div");
    const p1 = document.createElement("p");
    p1.textContent =
      "Status: Provisional. This certificate has not been activated. Human instructor review is required.";
    const p2 = document.createElement("p");
    p2.textContent =
      "Scope: This evaluation certifies the structure and framing of the system as presented. Real-world deployment and outcomes remain the responsibility of the student and their organization.";
    right.appendChild(p1);
    right.appendChild(p2);

    body.appendChild(left);
    body.appendChild(right);

    const footer = document.createElement("div");
    footer.className = "certificate-footer";
    const f1 = document.createElement("span");
    f1.textContent = "Flame Division Academy — Systems, not intentions.";
    const f2 = document.createElement("span");
    f2.textContent = "Human Review Required • No Auto-Approval";

    footer.appendChild(f1);
    footer.appendChild(f2);

    wrapper.appendChild(header);
    wrapper.appendChild(body);
    wrapper.appendChild(footer);

    certificatePreview.appendChild(wrapper);
    certificateUrl.textContent = cert.url;
  }

  // ----------------- Run Evaluation -----------------

  function runEvaluation() {
    stopSpeech();

    const selfCheckOk = runSelfCheck();
    if (!selfCheckOk) {
      const msg =
        (state.currentInstructor === "systems"
          ? "Self-check failed. Structure and wiring must be stable before evaluation. "
          : "Self-check failed. Governance cannot validate a system that is not structurally stable. ") +
        "Resolve the listed issues, confirm ethics acknowledgment, and run the evaluation again.";
      resultSummary.textContent = msg;
      setBadge(statusBadge, "bad", "Self-check failed");
      metaResult.textContent = "Blocked by self-check.";
      speak(msg, state.currentInstructor);
      return;
    }

    const data = collectFormData();
    const errors = validateForm(data);
    if (errors.length > 0) {
      const msg =
        (state.currentInstructor === "systems"
          ? "Input validation failed. Structure without clarity is chaos. "
          : "Input validation failed. Ethics begins with honest, complete information. ") +
        "Resolve the following: " +
        errors.join(" ");

      resultSummary.textContent = msg;
      setBadge(statusBadge, "bad", "Invalid input");
      metaStudent.textContent = data.student || "—";
      metaLesson.textContent = data.lesson || "—";
      metaInstructor.textContent = currentInstructorLabel();
      metaResult.textContent = "Validation errors.";
      btnNotifyInstructor.disabled = true;
      notifyMessage.textContent =
        "Fix the highlighted issues and run the evaluation again before attempting to notify an instructor.";
      state.lastResult = null;
      state.lastCertificate = null;
      speak(msg, state.currentInstructor);
      return;
    }

    const score = scoreSubmission(data);
    const result = decideResult(score);
    state.lastResult = { data, result, score };

    metaStudent.textContent = data.student;
    metaLesson.textContent = data.lesson;
    metaInstructor.textContent = currentInstructorLabel();

    if (result === "pass") {
      setBadge(statusBadge, "ok", "Provisionally Certified");
      metaResult.textContent = "Provisionally Certified";

      const summaryLines = [];
      if (state.currentInstructor === "systems") {
        summaryLines.push(
          "Systems evaluation complete. Your structure is provisionally certified under the current configuration."
        );
        summaryLines.push(
          "File wiring, description depth, and URL formatting meet the minimum structural expectations for this lab environment."
        );
        summaryLines.push(
          "Remember: structure without clarity is chaos. Keep your implementation readable and stable."
        );
      } else {
        summaryLines.push("Ethics evaluation complete. Your framing is provisionally cleared for awareness.");
        summaryLines.push(
          "You demonstrate an understanding of risk, accountability, and responsible deployment in your description."
        );
        summaryLines.push(
          "Ethics approval does not remove responsibility. It confirms awareness. You remain accountable for outcomes."
        );
      }
      summaryLines.push(
        "This is a provisional certification only. Click Notify Instructor to submit your system for human review and to activate your certificate."
      );
      const summaryText = summaryLines.join(" ");

      resultSummary.textContent = summaryText;

      const cert = generateCertificate(data, state.currentInstructor);
      state.lastCertificate = cert;
      renderCertificate(cert);

      btnNotifyInstructor.disabled = false;
      notifyMessage.textContent =
        "Provisional pass recorded. Notify an instructor to request human review. Until then, this certificate is not active.";

      const voiceMsg =
        (state.currentInstructor === "systems"
          ? "Systems Instructor report. Your submission is provisionally certified. "
          : "Ethics Instructor report. Your submission is provisionally cleared. ") +
        "This is a provisional certification. Click Notify Instructor to submit your system for human review and to activate your certificate.";
      speak(voiceMsg, state.currentInstructor);
    } else {
      setBadge(statusBadge, "bad", "Needs Revision");
      metaResult.textContent = "Needs Revision";

      const base =
        state.currentInstructor === "systems"
          ? "Systems evaluation complete. Your structure needs revision before provisional certification."
          : "Ethics evaluation complete. Your framing needs revision before provisional clearance.";

      const hints =
        "Strengthen your description, verify your URL, and ensure your explanation reflects either structural clarity or ethical accountability, depending on the active instructor.";

      const summaryText = `${base} Current score: ${score.toFixed(
        1
      )}. ${hints} Run the evaluation again after improving the system.`;
      resultSummary.textContent = summaryText;

      btnNotifyInstructor.disabled = true;
      notifyMessage.textContent =
        "Provisional certification was not granted. Revise your system, re-run evaluation, and only then request instructor review.";

      state.lastCertificate = null;
      certificatePreview.classList.add("certificate-preview-empty");
      certificatePreview.innerHTML =
        '<p class="muted">No provisional certificate is available. A pass result is required to generate one.</p>';
      certificateUrl.textContent = "—";

      speak(
        base +
          " Current evaluation score is " +
          score.toFixed(1) +
          ". Structure and ethics both require clarity before certification.",
        state.currentInstructor
      );
    }
  }

  // ----------------- Events -----------------

  instructorRadios.forEach((radio) => {
    radio.addEventListener("change", () => {
      if (!radio.checked) return;
      state.currentInstructor = radio.value === "ethics" ? "ethics" : "systems";
      updateInstructorUi();
    });
  });

  lessonDescInput.addEventListener("input", updateDescriptionCount);

  btnIntroPlay.addEventListener("click", () => {
    const introLines = [];

    introLines.push(
      "Welcome to the Flame Division Academy Tutor AI Lab Console. This environment issues provisional certifications only."
    );

    if (state.currentInstructor === "systems") {
      introLines.push(
        "You are currently operating under the Systems Instructor channel. Focus on clean HTML, CSS, and JavaScript wiring."
      );
      introLines.push("Structure without clarity is chaos. Make sure your system is readable, stable, and traceable.");
    } else {
      introLines.push(
        "You are currently operating under the Ethics Instructor channel. Focus on governance, accountability, and risk framing."
      );
      introLines.push(
        "Ethics approval does not remove responsibility. It confirms awareness. You remain accountable for deployment."
      );
    }

    introLines.push(
      "Fill in your name, lesson, system URL, and a clear description. Confirm ethics acknowledgment. Then run the evaluation."
    );
    introLines.push(
      "If you receive a provisional pass, click Notify Instructor to submit your system for human review and to activate your certificate."
    );

    speak(introLines.join(" "), state.currentInstructor);
  });

  btnIntroStop.addEventListener("click", stopSpeech);
  btnEvaluate.addEventListener("click", runEvaluation);

  btnResultPlay.addEventListener("click", () => {
    if (!state.lastResult) {
      const msg =
        "No evaluation has been recorded yet. Configure your submission carefully and then select Run Evaluation.";
      speak(msg, state.currentInstructor);
      return;
    }
    speak(resultSummary.textContent || "", state.currentInstructor);
  });

  btnResultStop.addEventListener("click", stopSpeech);

  btnNotifyInstructor.addEventListener("click", () => {
    if (!state.lastResult || !state.lastCertificate || state.lastResult.result !== "pass") {
      const msg =
        "There is no active provisional certificate to submit. Achieve a pass result before notifying an instructor.";
      speak(msg, state.currentInstructor);
      notifyMessage.textContent = msg;
      return;
    }

    btnNotifyInstructor.disabled = true;

    const msg =
      "This is a provisional certification. Your instructor has been notified in principle. Human review is required to activate this certificate. Ethics approval does not remove responsibility. It confirms awareness.";
    notifyMessage.textContent =
      "Notification recorded locally. Share your system URL and the generated certificate I D with your instructor for live human review.";
    speak(msg, state.currentInstructor);
  });

  btnCertVoice.addEventListener("click", () => {
    if (!state.lastCertificate) {
      const msg =
        "No certificate has been generated yet. Once you achieve a provisional pass, a certificate will appear here along with its tracking I D and URL parameters.";
      speak(msg, state.currentInstructor);
      return;
    }

    const cert = state.lastCertificate;
    const text =
      "Certificate briefing. Student: " +
      cert.student +
      ". Lesson: " +
      cert.lesson +
      ". Instructor channel: " +
      cert.instructor +
      ". Date: " +
      cert.date +
      ". Certificate I D: " +
      cert.id +
      ". This document is provisional only. To request activation, you must contact a human instructor with your system URL and certificate I D for review.";
    speak(text, state.currentInstructor);
  });

  // ----------------- Init -----------------

  try {
    updateInstructorUi();
    updateDescriptionCount();
    setBadge(selfCheckStatus, "soft", "Not run");
    setBadge(statusBadge, "soft", "Awaiting evaluation");
    window.__fdaAppReady = true;
  } catch (e) {
    console.error("Tutor AI app initialization error:", e);
    appError = true;
  }
});
