console.log("🧪 Tutor AI Lab Console loaded");

document.addEventListener("DOMContentLoaded", function () {
  // -----------------------
  // ELEMENT REFERENCES
  // -----------------------
  const instructorButtons = document.querySelectorAll(".fd-toggle-btn");
  const instructorLabel = document.getElementById("instructor-label");
  const instructorText = document.getElementById("instructor-text");

  const form = document.getElementById("submission-form");
  const inputStudent = document.getElementById("student-name");
  const inputLesson = document.getElementById("lesson-name");
  const inputUrl = document.getElementById("system-url");
  const inputDesc = document.getElementById("system-description");
  const btnEvaluate = document.getElementById("btn-evaluate");
  const btnNotify = document.getElementById("btn-notify");
  const formError = document.getElementById("form-error");

  const statusBadge = document.getElementById("status-badge");
  const resultText = document.getElementById("result-text");

  const certPreview = document.getElementById("cert-preview");
  const certStudent = document.getElementById("cert-student");
  const certLesson = document.getElementById("cert-lesson");
  const certInstructor = document.getElementById("cert-instructor");
  const certDate = document.getElementById("cert-date");
  const certUrl = document.getElementById("cert-url");

  const ttsSection = document.getElementById("tts-section");
  const ttsButton = document.getElementById("btn-tts");
  const ttsUnsupported = document.getElementById("tts-unsupported");

  const notifyConfirmation = document.getElementById("notify-confirmation");

  // -----------------------
  // STATE
  // -----------------------
  let currentInstructor = "systems"; // "systems" or "ethics"
  let currentCertData = null;
  let isEvaluating = false;

  // TTS support check
  const hasTtsSupport = "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;

  if (!hasTtsSupport) {
    ttsUnsupported.classList.remove("is-hidden");
    ttsButton.disabled = true;
  }

  // -----------------------
  // HELPERS
  // -----------------------

  function resetEvaluationState() {
    isEvaluating = false;
    currentCertData = null;
    formError.textContent = "";
    notifyConfirmation.textContent = "";

    // Status badge
    statusBadge.textContent = "🔎 Awaiting submission";
    statusBadge.classList.remove("status-evaluating", "status-fail", "status-pass");
    statusBadge.classList.add("status-awaiting");

    // Result text
    resultText.textContent =
      "Submit your system to receive structured feedback from the selected instructor.";

    // Hide cert and TTS, disable notify
    certPreview.classList.add("is-hidden");
    ttsSection.classList.add("is-hidden");
    btnNotify.classList.add("is-hidden");
    btnNotify.disabled = true;

    // Stop any ongoing speech
    if (hasTtsSupport && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
  }

  function setInstructor(instructor) {
    currentInstructor = instructor;
    instructorButtons.forEach((btn) => {
      const isActive = btn.dataset.instructor === instructor;
      btn.classList.toggle("is-active", isActive);
      btn.setAttribute("aria-pressed", isActive ? "true" : "false");
    });

    if (instructor === "systems") {
      instructorLabel.textContent = "Systems Instructor — Structural Review";
      instructorText.textContent =
        "I verify structure, wiring, and functionality of your system. Clean HTML, CSS, JS, and stable behavior unlock provisional certification.";
    } else {
      instructorLabel.textContent = "Ethics Instructor — Responsible AI Review";
      instructorText.textContent =
        "I reinforce responsible, safe, and aligned AI use. Your system must clearly describe intent, avoid harm, and respect users and data.";
    }

    resetEvaluationState();
  }

  function setStatus(status, label) {
    // status: "awaiting" | "evaluating" | "fail" | "pass"
    statusBadge.classList.remove("status-awaiting", "status-evaluating", "status-fail", "status-pass");
    if (status === "awaiting") {
      statusBadge.classList.add("status-awaiting");
    } else if (status === "evaluating") {
      statusBadge.classList.add("status-evaluating");
    } else if (status === "fail") {
      statusBadge.classList.add("status-fail");
    } else if (status === "pass") {
      statusBadge.classList.add("status-pass");
    }
    statusBadge.textContent = label;
  }

  function buildCertificateData(student, lesson) {
    const instructorType = currentInstructor === "systems" ? "Systems" : "Ethics";
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0]; // YYYY-MM-DD

    const encodedName = encodeURIComponent(student.trim());
    const encodedLesson = encodeURIComponent(lesson.trim());
    const encodedInstructor = encodeURIComponent(currentInstructor);
    const encodedDate = encodeURIComponent(dateStr);

    const pseudoUrl =
      "https://andrew-davis-ai-portfolio.github.io/Tutor-Ai/certificates/index.html" +
      `?name=${encodedName}&lesson=${encodedLesson}&instructor=${encodedInstructor}&date=${encodedDate}`;

    return {
      studentName: student.trim(),
      lessonName: lesson.trim(),
      instructorType,
      date: dateStr,
      certUrl: pseudoUrl,
    };
  }

  function renderCertificate(cert) {
    certStudent.textContent = cert.studentName;
    certLesson.textContent = cert.lessonName;
    certInstructor.textContent = cert.instructorType;
    certDate.textContent = cert.date;
    certUrl.textContent = cert.certUrl;
    certPreview.classList.remove("is-hidden");
  }

  function validateFields() {
    const student = inputStudent.value.trim();
    const lesson = inputLesson.value.trim();
    const url = inputUrl.value.trim();
    const desc = inputDesc.value.trim();

    if (!student || !lesson || !url || !desc) {
      return {
        ok: false,
        reason: "required",
      };
    }

    return {
      ok: true,
      reason: null,
      student,
      lesson,
      url,
      desc,
    };
  }

  function runEvaluation() {
    if (isEvaluating) return;

    const validation = validateFields();

    certPreview.classList.add("is-hidden");
    ttsSection.classList.add("is-hidden");
    btnNotify.classList.add("is-hidden");
    btnNotify.disabled = true;
    notifyConfirmation.textContent = "";

    if (!validation.ok) {
      // Required fields missing
      setStatus("fail", "❌ Not Certified");
      formError.textContent = "All fields are required. Please complete the form.";
      if (currentInstructor === "systems") {
        resultText.textContent =
          "Systems Instructor: I cannot certify an incomplete submission. Provide your name, lesson name, system URL, and a short description so I can evaluate structure and wiring.";
      } else {
        resultText.textContent =
          "Ethics Instructor: I need all fields completed to review your intent and responsible usage. Explain what you’re building and how you will prevent harm or misuse.";
      }
      return;
    }

    const { student, lesson, url, desc } = validation;

    // Start evaluation
    isEvaluating = true;
    formError.textContent = "";
    setStatus("evaluating", "⏳ Evaluating…");
    resultText.textContent =
      currentInstructor === "systems"
        ? "Systems Instructor: Running a quick structural scan of your system URL, lesson context, and description."
        : "Ethics Instructor: Reviewing your description for intent, clarity, and responsible AI practices.";

    setTimeout(function () {
      isEvaluating = false;

      const urlLooksValid = /^https?:\/\//i.test(url);
      const descLongEnough = desc.length >= 40;
      const lessonLongEnough = lesson.length >= 3;

      let passed = urlLooksValid && descLongEnough && lessonLongEnough;

      if (!passed) {
        setStatus("fail", "❌ Not Certified");

        if (!urlLooksValid) {
          if (currentInstructor === "systems") {
            resultText.textContent =
              "Systems Instructor: Your System URL must be a valid link starting with http or https. Double-check your repo or live demo URL.";
          } else {
            resultText.textContent =
              "Ethics Instructor: I can’t review an invalid URL. Provide a real system or repo link so your responsible-use claims can be verified.";
          }
        } else if (!descLongEnough) {
          if (currentInstructor === "systems") {
            resultText.textContent =
              "Systems Instructor: Your description is too short. Describe your system in at least a few sentences, including key features and behavior.";
          } else {
            resultText.textContent =
              "Ethics Instructor: Your description is too brief to confirm responsible behavior. Explain how you will avoid harm, protect users, and prevent misuse.";
          }
        } else if (!lessonLongEnough) {
          if (currentInstructor === "systems") {
            resultText.textContent =
              "Systems Instructor: Your lesson name is too short. Use a more descriptive title that reflects what you actually built.";
          } else {
            resultText.textContent =
              "Ethics Instructor: Choose a lesson name that clearly signals constructive, responsible learning—vague titles are harder to review.";
          }
        }

        formError.textContent = "";
        return;
      }

      // PASS
      setStatus("pass", "✅ Provisionally Certified");

      if (currentInstructor === "systems") {
        resultText.textContent =
          "Systems Instructor: Your system passed the initial structural scan. The URL, lesson context, and description meet the minimum bar for a provisional certification. Maintain clean wiring and stable behavior as you continue iterating.";
      } else {
        resultText.textContent =
          "Ethics Instructor: Your description and intent meet the baseline for responsible AI usage. This is a provisional ethics clearance—continued accountability and ethical decision-making remain your responsibility.";
      }

      currentCertData = buildCertificateData(student, lesson);
      renderCertificate(currentCertData);

      btnNotify.disabled = false;
      btnNotify.classList.remove("is-hidden");

      if (hasTtsSupport) {
        ttsSection.classList.remove("is-hidden");
        ttsButton.disabled = false;
      } else {
        ttsSection.classList.remove("is-hidden");
      }

      formError.textContent = "";
    }, 900);
  }

  function buildNotifyMailto() {
    if (!currentCertData) return;

    const student = currentCertData.studentName;
    const lesson = currentCertData.lessonName;
    const instructorType = currentCertData.instructorType;
    const url = inputUrl.value.trim();
    const desc = inputDesc.value.trim();
    const certLink = currentCertData.certUrl;

    const subject = `New System Submission – ${student} – ${lesson}`;

    const lines = [
      `Student Name: ${student}`,
      `Lesson Name: ${lesson}`,
      `Instructor Selected: ${instructorType}`,
      "",
      `System URL: ${url}`,
      "",
      "Short Description:",
      desc,
      "",
      `Provisional Certificate URL:`,
      certLink,
      "",
      "Submitted via Flame Division Academy Tutor AI Lab Console.",
    ];

    const body = lines.join("\n");

    const mailtoHref =
      "mailto:flamedivision.academy@proton.me" +
      `?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    return mailtoHref;
  }

  function handleNotifyInstructor() {
    if (!currentCertData) return;

    const mailtoHref = buildNotifyMailto();
    if (!mailtoHref) return;

    window.location.href = mailtoHref;
    notifyConfirmation.textContent =
      "📨 Email window opened. After sending, your submission will be reviewed by a human instructor.";
  }

  function playPassMessage() {
    if (!hasTtsSupport || !currentCertData) return;

    // Stop any ongoing speech
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }

    const { studentName, lessonName } = currentCertData;

    let message;
    if (currentInstructor === "systems") {
      message =
        `System certified provisionally. ${studentName}, your lesson "${lessonName}" has passed the initial systems review. ` +
        "Your structure, wiring, and description meet the baseline for this stage. " +
        "Click the Notify Instructor button to send your work for review by Flame Division.";
    } else {
      message =
        `Ethics criteria provisionally met. ${studentName}, your lesson "${lessonName}" aligns with responsible AI standards at this stage. ` +
        "Remember that ethics is an ongoing practice, not a one-time pass. " +
        "Click Notify Instructor to send your system for human approval.";
    }

    const utterance = new SpeechSynthesisUtterance(message);

    // Choose a neutral voice if possible
    const voices = window.speechSynthesis.getVoices();
    if (voices && voices.length > 0) {
      const preferred = voices.find((v) =>
        /en/i.test(v.lang || "")
      );
      utterance.voice = preferred || voices[0];
    }

    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    window.speechSynthesis.speak(utterance);
  }

  // -----------------------
  // EVENT LISTENERS
  // -----------------------

  instructorButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetInstructor = btn.dataset.instructor === "ethics" ? "ethics" : "systems";
      if (targetInstructor !== currentInstructor) {
        setInstructor(targetInstructor);
      }
    });
  });

  btnEvaluate.addEventListener("click", (e) => {
    e.preventDefault();
    runEvaluation();
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    runEvaluation();
  });

  btnNotify.addEventListener("click", (e) => {
    e.preventDefault();
    handleNotifyInstructor();
  });

  if (ttsButton) {
    ttsButton.addEventListener("click", (e) => {
      e.preventDefault();
      if (!currentCertData) return;
      if (!hasTtsSupport) return;
      playPassMessage();
    });
  }

  // Some browsers load voices asynchronously
  if (hasTtsSupport) {
    window.speechSynthesis.onvoiceschanged = function () {
      // Voices are now loaded; we don't need to do anything explicit here,
      // but this ensures they are ready when playPassMessage is called.
    };
  }

  // Initialize
  resetEvaluationState();
});
