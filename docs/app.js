// Flame Division Academy — Tutor AI Dojo (Phase I)
// app.js — Dojo wiring, Evaluation Coach logic, TTS, Cert Gate

(function () {
  let appError = false;

  // ---------------------------
  // SAFARI / ENV DETECTION
  // ---------------------------
  const isSafari = /^((?!chrome|android).)*safari/i.test(
    navigator.userAgent || ""
  );
  console.log("🔥 Tutor AI Dojo loaded. Safari:", isSafari);

  // ---------------------------
  // TTS CORE
  // ---------------------------
  const TTS = {
    synth: "speechSynthesis" in window ? window.speechSynthesis : null,
    supported:
      "speechSynthesis" in window &&
      typeof window.SpeechSynthesisUtterance !== "undefined",
    voices: [],
  };

  function initVoices() {
    if (!TTS.supported || !TTS.synth) return;

    function load() {
      TTS.voices = TTS.synth.getVoices();
      console.log("🎙 Voices available:", TTS.voices.length);
    }

    load();

    if (!TTS.voices.length) {
      // Safari often fires this after async load
      TTS.synth.onvoiceschanged = load;
    }
  }

  function speak(text) {
    if (!TTS.supported || !TTS.synth || !text) {
      console.log("🔇 TTS not available or empty text.");
      return;
    }

    try {
      if (TTS.synth.speaking) {
        TTS.synth.cancel();
      }

      const msg = new SpeechSynthesisUtterance(text);
      msg.rate = 0.95;
      msg.pitch = 1.0;

      const voices = TTS.voices.length ? TTS.voices : TTS.synth.getVoices();
      if (voices && voices.length) {
        const preferred =
          voices.find((v) =>
            /Samantha|Female|Google US English/i.test(v.name)
          ) || voices[0];
        msg.voice = preferred;
      }

      TTS.synth.speak(msg);
    } catch (err) {
      console.warn("TTS error:", err);
    }
  }

  // ---------------------------
  // DOJO ROOM STATE
  // ---------------------------
  const DOJO_ROOMS = [
    { id: "room1", name: "Orientation & Doctrine", unlocked: true, completed: false },
    { id: "room2", name: "Systems Thinking",        unlocked: false, completed: false },
    { id: "room3", name: "Ethics Under Pressure",   unlocked: false, completed: false },
    { id: "room4", name: "Authority & Communication", unlocked: false, completed: false },
    { id: "room5", name: "Final Defense",           unlocked: false, completed: false },
  ];

  function cloneRooms() {
    return JSON.parse(JSON.stringify(DOJO_ROOMS));
  }

  function loadState() {
    const raw = localStorage.getItem("flameDojoState");
    if (!raw) return cloneRooms();
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return cloneRooms();
      return parsed;
    } catch (e) {
      console.warn("⚠️ Dojo state corrupted, resetting.");
      return cloneRooms();
    }
  }

  function saveState(state) {
    localStorage.setItem("flameDojoState", JSON.stringify(state));
  }

  function completeRoom(roomId) {
    const state = loadState();
    const idx = state.findIndex((r) => r.id === roomId);
    if (idx === -1) return;
    state[idx].completed = true;
    state[idx].unlocked = true;

    const next = state[idx + 1];
    if (next) {
      next.unlocked = true;
    }

    saveState(state);
    renderDojo(roomId);
    updateRoomSelect();
    updateCertGate();
  }

  // ---------------------------
  // ROOM METADATA
  // ---------------------------
  const ROOM_CONFIG = {
    room1: {
      title: "Room 1 — Orientation & Doctrine",
      focus:
        "Understand the dojo laws, certification gates, and why Flame Division certifies systems — not intentions.",
      description:
        "You will demonstrate that you understand the purpose of this dojo: real-world pressure, human review, and no instant wins.",
      checklist: [
        "State your project in one sentence — no fluff.",
        "Describe your core stack in plain language.",
        "Name one thing that could fail and who would feel it first.",
      ],
      entryTTS:
        "Welcome to Orientation and Doctrine. Here you prove you understand what this dojo is and why instant certificates are banned.",
    },
    room2: {
      title: "Room 2 — Systems Thinking",
      focus:
        "Show that you can see your project as a system, not scattered tools.",
      description:
        "Name the components, data flows, and boundaries. Your explanation should let leadership visualize your system on a whiteboard.",
      checklist: [
        "Describe the main layers of your system.",
        "Explain how data flows from user to result.",
        "Name one monitoring or logging strategy you would use.",
      ],
      entryTTS:
        "Room Two. Systems Thinking. If you only list tools, you fail. Show me architecture, not app icons.",
    },
    room3: {
      title: "Room 3 — Ethics Under Pressure",
      focus:
        "Demonstrate that you understand harm, misuse, and edge cases — not just features.",
      description:
        "Speak to bias, abuse, and failure. Who could be harmed and what guardrails do you propose?",
      checklist: [
        "Describe a misuse scenario for your system.",
        "Name who is most vulnerable if the system fails.",
        "Explain one ethical safeguard you would implement.",
      ],
      entryTTS:
        "Room Three. Ethics Under Pressure. This is where we see if you protect humans or just ship features.",
    },
    room4: {
      title: "Room 4 — Authority & Communication",
      focus:
        "Present your system like a responsible owner speaking to leadership.",
      description:
        "No jargon shields. You must explain your system in simple language while taking responsibility for decisions and trade-offs.",
      checklist: [
        "Explain your system in simple language a non-technical leader understands.",
        "Name one trade-off you accepted in your design.",
        "State how you would communicate a major incident.",
      ],
      entryTTS:
        "Room Four. Authority and Communication. Speak like an owner, not a spectator.",
    },
    room5: {
      title: "Room 5 — Final Defense",
      focus:
        "Defend your build as if your certification depends on it — because it does.",
      description:
        "Summarize your system, its strengths, its weaknesses, and how you will evolve it. This is your final verbal defense before human review.",
      checklist: [
        "Summarize your entire system in three sentences or less.",
        "Name the biggest single point of failure you see now.",
        "Explain your next evolution step once this version is stable.",
      ],
      entryTTS:
        "Final Defense. Room Five. This is where you stop sounding like a student and start sounding like an operator.",
    },
  };

  // ---------------------------
  // RENDER: DOJO MODAL & SELECT
  // ---------------------------
  function renderDojo(activeRoomId) {
    const state = loadState();
    const list = document.getElementById("dojo-rooms");
    if (!list) return;

    list.innerHTML = "";

    state.forEach((room) => {
      const li = document.createElement("li");
      const statusIcon = room.completed
        ? "✅"
        : room.unlocked
        ? "🟡"
        : "🔒";

      li.classList.toggle("dojo-locked", !room.unlocked);
      li.classList.toggle("dojo-active", room.id === activeRoomId);

      li.innerHTML = `
        <span>${statusIcon}</span>
        <span class="dojo-room-name">${room.name}</span>
      `;

      list.appendChild(li);
    });
  }

  function updateRoomSelect() {
    const select = document.getElementById("room-select");
    if (!select) return;

    const state = loadState();
    const currentId = document.body.dataset.currentRoomId || "room1";
    select.innerHTML = "";

    state.forEach((room) => {
      const opt = document.createElement("option");
      opt.value = room.id;
      opt.textContent = room.name + (room.completed ? " — ✅" : room.unlocked ? "" : " — 🔒");
      opt.disabled = !room.unlocked;
      if (room.id === currentId) opt.selected = true;
      select.appendChild(opt);
    });
  }

  // ---------------------------
  // CURRENT ROOM HANDLING
  // ---------------------------
  function setCurrentRoom(roomId) {
    const config = ROOM_CONFIG[roomId];
    if (!config) return;

    document.body.dataset.currentRoomId = roomId;

    const titleEl = document.getElementById("room-title");
    const focusEl = document.getElementById("room-focus");
    const descEl = document.getElementById("room-description");
    const checklistEl = document.getElementById("room-checklist");

    if (titleEl) titleEl.textContent = config.title;
    if (focusEl) focusEl.textContent = config.focus;
    if (descEl) descEl.textContent = config.description;

    if (checklistEl) {
      checklistEl.innerHTML = "";
      config.checklist.forEach((item) => {
        const li = document.createElement("li");
        li.textContent = "• " + item;
        checklistEl.appendChild(li);
      });
    }

    renderDojo(roomId);
    updateRoomSelect();
  }

  // ---------------------------
  // EVALUATION COACH LOGIC
  // ---------------------------
  const roomAttemptCount = {};

  function runEvaluation() {
    const repoUrl = document.getElementById("repo-url").value.trim();
    const explanation = document
      .getElementById("system-explanation")
      .value.trim();
    const failures = document.getElementById("failure-notes").value.trim();

    const msgEl = document.getElementById("evaluation-message");
    const statusEl = document.getElementById("evaluation-status");

    if (!msgEl || !statusEl) return;

    const roomId = document.body.dataset.currentRoomId || "room1";
    roomAttemptCount[roomId] = (roomAttemptCount[roomId] || 0) + 1;

    // Basic checks
    const explanationWords = explanation.split(/\s+/).filter(Boolean).length;
    const failuresWords = failures.split(/\s+/).filter(Boolean).length;

    // Force at least one revision per room
    if (roomAttemptCount[roomId] === 1) {
      const text =
        "First submission detected. By dojo law, no one passes on the first attempt. Clarify your explanation and go deeper on failure and harm.";
      msgEl.textContent =
        "First pass blocked by Evaluation Coach. Rewrite your explanation in simpler language and extend your failure notes.";
      statusEl.textContent = "STATUS: REVISION REQUIRED — first attempt rejected by design.";
      statusEl.classList.remove("ready");
      statusEl.classList.add("revision");
      speak(text);
      return;
    }

    // Real checks now
    const missingRepo = !repoUrl.startsWith("http");
    const tooShort = explanationWords < 40 || failuresWords < 25;
    const lacksFailureLanguage =
      !/fail|break|error|down|crash/i.test(failures) ||
      !/user|customer|client|staff|team|people/i.test(failures);

    if (missingRepo || tooShort || lacksFailureLanguage) {
      const reasons = [];
      if (missingRepo)
        reasons.push("• Repo URL must be present and start with http or https.");
      if (tooShort)
        reasons.push(
          "• Your explanation and failure notes must be deeper. You are writing at least a short briefing, not a tweet."
        );
      if (lacksFailureLanguage)
        reasons.push(
          "• You must clearly state what breaks first and who feels the impact."
        );

      msgEl.innerHTML =
        "Your submission is not ready. The Evaluation Coach flags the following:<br>" +
        reasons.join("<br>");
      statusEl.textContent =
        "STATUS: REVISION REQUIRED — strengthen depth, clarity, and harm analysis.";
      statusEl.classList.remove("ready");
      statusEl.classList.add("revision");

      speak(
        "Revision required. Slow down and describe who is hurt when your system fails, and what breaks first in real life."
      );
      return;
    }

    // Passed for this room
    msgEl.textContent =
      "Your explanation meets the minimum dojo threshold for this room. You may advance — human review still required for final certification.";
    statusEl.textContent =
      "STATUS: READY — Room cleared. Progress saved to dojo state.";
    statusEl.classList.remove("revision");
    statusEl.classList.add("ready");

    completeRoom(roomId);

    speak(
      "Room cleared. You may advance in the dojo, but certification is still locked until all rooms are complete and a human has reviewed your work."
    );
  }

  function clearInputs() {
    const ids = ["repo-url", "system-explanation", "failure-notes"];
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });

    const msgEl = document.getElementById("evaluation-message");
    const statusEl = document.getElementById("evaluation-status");
    if (msgEl && statusEl) {
      msgEl.textContent =
        "Inputs cleared. When you submit again, the Evaluation Coach will treat it as a fresh attempt for this room.";
      statusEl.textContent = "STATUS: IDLE — no evaluation yet.";
      statusEl.classList.remove("ready", "revision");
    }
  }

  // ---------------------------
  // CERT GATE
  // ---------------------------
  function allRoomsComplete(state) {
    return state.every((r) => r.completed);
  }

  function updateCertGate() {
    const state = loadState();
    const certBtn = document.getElementById("cert-btn");
    const certHint = document.getElementById("cert-hint");
    if (!certBtn || !certHint) return;

    if (allRoomsComplete(state)) {
      certBtn.style.display = "inline-flex";
      certHint.textContent =
        "All rooms cleared. You may now request human review for provisional certification.";
    } else {
      certBtn.style.display = "none";
      certHint.textContent =
        "Certification locked. Clear every room in the dojo to unlock review.";
    }
  }

  function generateCertSummary() {
    const state = loadState();
    const summaryBox = document.getElementById("cert-summary");
    if (!summaryBox) return;

    const currentRoom = document.body.dataset.currentRoomId || "room1";

    const summary = [
      "FLAME DIVISION DOJO — CERTIFICATION REVIEW REQUEST",
      "",
      "Rooms cleared:",
      ...state.map(
        (r, idx) =>
          `${idx + 1}. ${r.name} — completed: ${
            r.completed ? "YES" : "NO"
          }`
      ),
      "",
      "Primary GitHub repo link:",
      "[PASTE YOUR PRODUCTION REPO LINK HERE]",
      "",
      "My system in one paragraph (plain language):",
      "[Summarize your system here. No jargon. Assume leadership is reading.]",
      "",
      "Biggest failure mode I see and how I would respond:",
      "[Describe the most realistic failure mode and your response plan.]",
      "",
      "Most challenging dojo room for me:",
      `${ROOM_CONFIG[currentRoom]?.title || "N/A"} — [Explain why]`,
    ].join("\n");

    summaryBox.value = summary;

    speak(
      "All rooms cleared. Copy this summary and send it to your instructor for human review. The dojo recommends; a human confirms."
    );
  }

  // ---------------------------
  // BIND UI EVENTS
  // ---------------------------
  document.addEventListener("DOMContentLoaded", function () {
    try {
      initVoices();

      // Set initial room based on saved unlocks
      const state = loadState();
      const firstUnlocked =
        state.find((r) => r.unlocked && !r.completed) ||
        state.find((r) => r.unlocked) ||
        state[0];

      const startingRoomId = firstUnlocked ? firstUnlocked.id : "room1";
      setCurrentRoom(startingRoomId);

      // Room select
      updateRoomSelect();
      const roomSelect = document.getElementById("room-select");
      if (roomSelect) {
        roomSelect.addEventListener("change", function () {
          const selectedId = this.value;
          const state = loadState();
          const room = state.find((r) => r.id === selectedId);
          if (!room || !room.unlocked) {
            speak(
              "That room is still locked. Clear your current training first."
            );
            updateRoomSelect(); // re-sync
            return;
          }
          setCurrentRoom(selectedId);
          const cfg = ROOM_CONFIG[selectedId];
          if (cfg && cfg.entryTTS) speak(cfg.entryTTS);
        });
      }

      // Dojo gate
      const dojoGate = document.getElementById("dojo-gate-btn");
      const dojoModal = document.getElementById("dojo-modal");
      const closeDojo = document.getElementById("close-dojo");

      if (dojoGate && dojoModal && closeDojo) {
        dojoGate.addEventListener("click", function () {
          const currentId =
            document.body.dataset.currentRoomId || "room1";
          renderDojo(currentId);
          dojoModal.classList.remove("hidden");
          dojoModal.setAttribute("aria-hidden", "false");
        });

        closeDojo.addEventListener("click", function () {
          dojoModal.classList.add("hidden");
          dojoModal.setAttribute("aria-hidden", "true");
        });
      }

      // Eval buttons
      const evalBtn = document.getElementById("btn-evaluate");
      if (evalBtn) {
        evalBtn.addEventListener("click", runEvaluation);
      }

      const clearBtn = document.getElementById("btn-clear");
      if (clearBtn) {
        clearBtn.addEventListener("click", clearInputs);
      }

      // Room intro TTS
      const roomTTSBtn = document.getElementById("btn-room-tts");
      if (roomTTSBtn) {
        roomTTSBtn.addEventListener("click", function () {
          const roomId = document.body.dataset.currentRoomId || "room1";
          const cfg = ROOM_CONFIG[roomId];
          if (cfg && cfg.entryTTS) speak(cfg.entryTTS);
        });
      }

      // Instructor intros
      const systemsIntro = document.getElementById("btn-systems-intro");
      if (systemsIntro) {
        systemsIntro.addEventListener("click", function () {
          speak(
            "Systems Instructor online. I care about structure, clarity, and reality. If you cannot name your architecture, you are not ready."
          );
        });
      }

      const coachIntro = document.getElementById("btn-coach-intro");
      if (coachIntro) {
        coachIntro.addEventListener("click", function () {
          speak(
            "Evaluation Coach online. I will not pass you on the first try. Expect interruptions, corrections, and reality checks."
          );
        });
      }

      // Cert gate
      updateCertGate();
      const certBtn = document.getElementById("cert-btn");
      if (certBtn) {
        certBtn.addEventListener("click", generateCertSummary);
      }
    } catch (err) {
      appError = true;
      console.error("App init error:", err);
    }
  });
})();
