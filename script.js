// script.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-app.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.11.1/firebase-auth.js";

import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  addDoc,
  getDocs,
  collection,
  query,
  where,
  serverTimestamp,
  deleteDoc,
  updateDoc,
  writeBatch
} from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";

// Firebase Configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyANtunF3Avr3nUHd0ytggFHEUIMZjZkamE",
  authDomain: "rccg-spellings-app.firebaseapp.com",
  projectId: "rccg-spellings-app",
  storageBucket: "rccg-spellings-app.firebasestorage.app",
  messagingSenderId: "968611256170",
  appId: "1:968611256170:web:1b7f1d50521e1d1f763713",
  measurementId: "G-PVMQJ4B7NC"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Helper functions
function showError(id, message) {
  const el = document.getElementById(id);
  if (el) el.textContent = message;
}

function hideError(id) {
  showError(id, "");
}

function showSpinner(show) {
  let spinner = document.getElementById("loading-spinner");
  if (!spinner) {
    spinner = document.createElement("div");
    spinner.id = "loading-spinner";
    spinner.innerHTML = `<div class="spinner-circle"></div>`;
    document.body.appendChild(spinner);
  }
  spinner.style.display = show ? "flex" : "none";
}


function showToast(message, type = "success", duration = 3000) {
  let toast = document.getElementById("toast");

  // Create if not present
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    toast.className = "toast";
    document.body.appendChild(toast);
  }

  // Reset classes and set type class
  toast.className = "toast " + type;
  toast.textContent = message;

  // Show toast
  toast.classList.add("show");

  // Hide after duration
  setTimeout(() => {
    toast.classList.remove("show");
  }, duration);
}

// Admin Signup
const signupForm = document.getElementById("signup-form");
if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    showSpinner(true);
    hideError("signup-error");

    const email = signupForm["email"].value.trim();
    const password = signupForm["password"].value;
    const confirmPassword = signupForm["confirm-password"].value;

    // Validate presence of inputs
    if (!email || !password || !confirmPassword) {
      showError("signup-error", "All fields are required.");
      showSpinner(false);
      return;
    }

    // Validate Gmail format only
    if (!/^[\w.+-]+@gmail\.com$/.test(email)) {
      showError("signup-error", "Only Gmail addresses are allowed. Example: yourname@gmail.com");
      showSpinner(false);
      return;
    }

    // Validate password match
    if (password !== confirmPassword) {
      showError("signup-error", "Passwords do not match.");
      signupForm["password"].value = "";
      signupForm["confirm-password"].value = "";
      showSpinner(false);
      return;
    }

    try {
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      // Save in Firestore
      await setDoc(doc(db, "admins", userCredential.user.uid), {
        email,
        createdAt: serverTimestamp(),
      });
      // Send email via EmailJS
      emailjs.send("service_22bn4x3", "template_fm7q3kc", {
        to_name: email.split("@")[0], 
        email: email,
        password: password 
      })
        .then(() => {
          // Show a temporary toast message
          showToast("Signup successful! A welcome email has been sent. Redirecting to Dashboard...", "success", 10000);
          // Redirect after short delay
          setTimeout(() => {
            window.location.href = "admin-dashboard.html";
          }, 4000);

        })
        .catch((error) => {
          console.error("Failed to send signup email:", error);

          // Show error toast to user
          showToast("Signup completed but failed to send email.", 4000);
        });


    } catch (err) {
      if (err.code === "auth/email-already-in-use") {
        showError("signup-error", "This email is already registered. Redirecting to login...");
        setTimeout(() => {
          toggleForms();
        }, 2000);
      } else {
        showError("signup-error", err.message);
      }
    } finally {
      showSpinner(false);
    }
  });

  // Hide error when user edits any input
  ["email", "password", "confirm-password"].forEach((field) => {
    const input = signupForm[field];
    if (input) {
      input.addEventListener("input", () => hideError("signup-error"));
    }
  });
}

// Admin Login
const loginForm = document.getElementById("login-form");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    showSpinner(true);
    hideError("login-error");

    const email = loginForm["email"].value.trim();
    const password = loginForm["password"].value;

    // Validate Gmail address
    if (!/^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(email)) {
      showError("login-error", "Please enter a valid gmail address.");
      showSpinner(false);
      return;
    }

    if (!password) {
      showError("login-error", "Password is required.");
      showSpinner(false);
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      showToast("Login successful! Redirecting to Dashboard...", "success", 4000);
      setTimeout(() => {
        window.location.href = "admin-dashboard.html";
      }, 4000);
    } catch (err) {
      let message = "Login failed.";
      if (err.code === "auth/user-not-found") {
        message = "No account with this email.";
      } else if (err.code === "auth/wrong-password") {
        message = "Incorrect password.";
      } else {
        message = err.message;
      }
      showToast(`${message}`, "error", 5000);
    } finally {
      showSpinner(false);
    }
  });

  // Clear error message when editing inputs
  ["email", "password"].forEach((field) => {
    const input = loginForm[field];
    if (input) {
      input.addEventListener("input", () => hideError("login-error"));
    }
  });
}

// Admin Logout
const logoutBtn = document.getElementById("logout");
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    await signOut(auth);
    window.location.href = "admin-login.html";
  });
}

// Admin Delete Account
document.addEventListener("DOMContentLoaded", () => {
  const deleteBtn = document.getElementById("delete-account-btn");
  if (!deleteBtn) return;

  deleteBtn.addEventListener("click", async () => {
    const user = auth.currentUser;

    if (!user) {
      showToast("You must be logged in to delete your account.", "error", 5000);
      return;
    }

    const confirmDelete = confirm("Are you sure you want to delete your account? This will permanently remove all your quizzes and results.");
    if (!confirmDelete) return;

    showToast("Account deletion in progress...", "info", 5000);
    showSpinner(true)
    try {
      // 1. Fetch all quizzes created by this admin
      const quizQuery = query(collection(db, "quizzes"), where("adminId", "==", user.uid));
      const quizSnap = await getDocs(quizQuery);

      const quizIds = quizSnap.docs.map(doc => doc.id); // collect quiz IDs
      const batch = writeBatch(db);

      // 2. Delete all quizzes by this admin
      quizSnap.docs.forEach(doc => batch.delete(doc.ref));

      // 3. Delete results for each quiz
      for (const quizId of quizIds) {
        const resultQuery = query(collection(db, "results"), where("quizId", "==", quizId));
        const resultSnap = await getDocs(resultQuery);
        resultSnap.forEach(resultDoc => batch.delete(resultDoc.ref));
      }

      // 4. Delete admin profile from Firestore
      batch.delete(doc(db, "admins", user.uid));

      // 5. Commit batch delete
      await batch.commit();

      // 6. Delete Auth account
      await user.delete();

      showToast("Account and all data deleted. Redirecting...", "success", 4000);
      setTimeout(() => {
        window.location.href = "index.html";
      }, 4000);

    } catch (err) {
      if (err.code === "auth/requires-recent-login") {
        showToast("Please re-login to confirm your identity before deleting.", "error", 6000);
        setTimeout(() => {
          window.location.href = "admin-login.html";
        }, 4000);
      } else {
        console.error("Error deleting account:", err);
        showToast("Failed to delete account: " + err.message, "error", 6000);
      }
    }
  });
});

// Send password reset email
document.addEventListener("DOMContentLoaded", () => {
  const forgotLink = document.getElementById("forgot-password-link");

  if (!forgotLink) return;

  forgotLink.addEventListener("click", async () => {
    const email = prompt("Enter your registered Gmail address:");
    if (!email) return;

    const trimmedEmail = email.trim();

    // Validate Gmail format only
    if (!/^[\w.+-]+@gmail\.com$/.test(trimmedEmail)) {
      showToast("Please enter a valid Gmail address.", "error", 5000);
      return;
    }

    try {
      await sendPasswordResetEmail(auth, trimmedEmail, {
        url: `${window.location.origin}/admin-login.html`
      });

      showToast(
        `We've sent a reset link to: ${trimmedEmail}. Check your inbox.`,
        "success",
        6000
      );
    } catch (error) {
      if (error.code === "auth/user-not-found") {
        showToast("This email is not registered.", "error", 6000);
      } else if (error.code === "auth/invalid-email") {
        showToast("Invalid email format.", "error", 6000);
      } else {
        console.error("Password reset error:", error);
        showToast("Error sending reset link. Try again.", "error", 6000);
      }
    }
  });
});

// Admin Dashboard Quiz Creation
const quizForm = document.getElementById("quiz-form");

if (quizForm) {
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.href = "admin-login.html";
      return;
    }

    // Load quizzes for this admin
    loadAdminQuizzes();

    quizForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      showSpinner(true);

      const title = document.getElementById("quiz-title").value.trim();
      const timerMinutes = parseInt(document.getElementById("quiz-timer").value, 10);
      const timer = isNaN(timerMinutes) ? 60 : timerMinutes * 60;

      const words = document
        .getElementById("quiz-words")
        .value.split(",")
        .map(w => w.trim())
        .filter(Boolean);

      // Validation
      if (!title || !timerMinutes || words.length === 0) {
        showToast("Please fill in all quiz fields correctly.", "error", 5000);
        showSpinner(false);
        return;
      }

      try {
        const quizRef = await addDoc(collection(db, "quizzes"), {
          title,
          timer,
          words,
          adminId: user.uid,
          createdAt: serverTimestamp()
        });

        quizForm.reset();
        loadAdminQuizzes();

        showToast(`Quiz created! Share this code: ${quizRef.id}`, "success", 6000);
      } catch (err) {
        console.error("Quiz creation error:", err);
        showToast("Error creating quiz. Try again later.", "error", 6000);
      } finally {
        showSpinner(false);
      }
    });
  });
}

function showInstructionModal(startCallback, words = [], timeInSeconds = 0) {
  const modal = document.getElementById("instructionModal");
  const startBtn = document.getElementById("start-quiz-btn");
  const overlay = document.getElementById("modal-overlay");

  if (!modal || !startBtn || !overlay) {
    console.error("Instruction modal elements not found in HTML.");
    return;
  }

  // Format time as mm:ss
  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = timeInSeconds % 60;
  const formattedTime = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  // Check for compound words
  const hasCompound = words.some(word => word.includes("-") || word.includes(" "));
  const compoundNote = hasCompound
    ? `<li>Some words contain <strong>hyphens</strong> or <strong>spaces</strong>. Type them exactly as you hear them.</li>`
    : "";

  // Dynamically update the <ul> in the modal
  const instructionList = modal.querySelector("ul");
  if (instructionList) {
    instructionList.innerHTML = `
      <li>You will be spelling <strong>${words.length}</strong> word${words.length !== 1 ? "s" : ""}.</li>
      <li>You have <strong>${formattedTime}</strong> minutes to complete the quiz.</li>
      <li>Click on the 🔊 Pronounce button to hear the word.</li>
      <li>Use the navigation buttons to move through questions.</li>
      <li>The quiz will automatically submit when your time is up.</li>
      ${compoundNote}
    `;
  }

  // Show modal and overlay
  modal.style.display = "block";
  overlay.style.display = "block";

  // Remove previous click listeners (to avoid stacking)
  startBtn.replaceWith(startBtn.cloneNode(true));
  const newStartBtn = document.getElementById("start-quiz-btn");

  newStartBtn.addEventListener("click", () => {
    modal.style.display = "none";
    overlay.style.display = "none";
    startCallback();
  });
}

// Display quizzes created by this admin
async function loadAdminQuizzes() {
  const quizzesContainer = document.getElementById("quizzes-container");
  if (!quizzesContainer) return;

  quizzesContainer.innerHTML = "<p>Loading quizzes...</p>";

  try {
    const adminId = auth.currentUser?.uid;
    if (!adminId) {
      quizzesContainer.innerHTML = "<p>You must be logged in to view quizzes.</p>";
      return;
    }

    const q = query(collection(db, "quizzes"), where("adminId", "==", adminId));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      quizzesContainer.innerHTML = "<p>No quizzes created yet.</p>";
      return;
    }

    let html = `<ul style="padding: 25px;">`;

    snapshot.forEach((doc) => {
      const quiz = doc.data();
      const quizId = doc.id;
      const date = quiz.createdAt?.toDate().toLocaleString() || "Unknown date";
      const timerInMinutes = Math.round(quiz.timer / 60);

      html += `
        <li style="margin-bottom: 1em; list-style-type: number;">
          <strong>Title:</strong> ${quiz.title}<br>
          <strong>Code:</strong> ${quizId}<br>
          <strong>Timer:</strong> ${timerInMinutes} minutes<br>
          <strong>Words:</strong> ${quiz.words.join(", ")}<br>
          <strong>Created At:</strong> ${date}<br>
          <div style="margin-top: 8px;">
            <button class="view-results-btn" data-id="${quizId}">📊 View Results</button>
            <button class="edit-quiz-btn" data-id="${quizId}">✏️ Edit</button>
            <button class="delete-quiz-btn" data-id="${quizId}">🗑️ Delete</button>
            <button class="share-quiz-btn" data-id="${quizId}" data-title="${quiz.title}">🔗 Share</button>
          </div>
        </li>
      `;
    });

    html += "</ul>";
    quizzesContainer.innerHTML = html;

    // === Event Bindings ===

    // View results
    document.querySelectorAll(".view-results-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const quizId = btn.dataset.id;
        loadQuizResults(quizId);
      });
    });

    // Edit quiz
    document.querySelectorAll(".edit-quiz-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const quizId = btn.dataset.id;
        const ref = doc(db, "quizzes", quizId);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          showToast("Quiz not found.", "error");
          return;
        }

        const quiz = snap.data();
        document.getElementById("edit-title").value = quiz.title;
        document.getElementById("edit-timer").value = Math.round(quiz.timer / 60);
        document.getElementById("edit-words").value = quiz.words.join(", ");
        document.getElementById("editModal").style.display = "block";
        document.getElementById("modal-overlay").style.display = "block";
        document.getElementById("editModal").dataset.quizId = quizId;
      });
    });

    // Delete quiz
    document.querySelectorAll(".delete-quiz-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const quizId = btn.dataset.id;

        const confirmed = confirm("Are you sure you want to delete this quiz?");
        if (!confirmed) return;

        btn.disabled = true;
        const originalText = btn.textContent;
        btn.textContent = "Deleting...";

        try {
          await deleteDoc(doc(db, "quizzes", quizId));
          showToast("Quiz deleted successfully.");
          loadAdminQuizzes(); // Refresh list
        } catch (err) {
          showToast("Failed to delete quiz: " + err.message, "error");
        } finally {
          btn.textContent = originalText;
          btn.disabled = false;
        }
      });
    });

    // Share quiz
    document.querySelectorAll(".share-quiz-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const quizId = btn.dataset.id;
        const title = btn.dataset.title;
        const quizUrl = `${window.location.origin}/index.html?code=${quizId}`;
        const message = `Quiz Title: ${title}\nCode: ${quizId}\nClick here: ${quizUrl}`;
        const subject = encodeURIComponent("Join Quiz: " + title);
        const body = encodeURIComponent(message);

        // Update share modal
        document.getElementById("share-message").innerHTML = `
          <strong>Quiz Title:</strong> ${title}<br>
          <strong>Code:</strong> ${quizId}<br>
          <strong>Click here:</strong> <a href="${quizUrl}" target="_blank">${quizUrl}</a>
        `;

        // Set share links
        document.getElementById("share-whatsapp").href = `https://wa.me/?text=${encodeURIComponent(message)}`;
        document.getElementById("share-telegram").href = `https://t.me/share/url?url=${encodeURIComponent(quizUrl)}&text=${encodeURIComponent(message)}`;
        document.getElementById("share-email").href = `mailto:?subject=${subject}&body=${body}`;

        // Copy to clipboard
        document.getElementById("copyLinkBtn").onclick = () => {
          navigator.clipboard.writeText(quizUrl).then(() => {
            showToast("Quiz link copied to clipboard!", "success");
          });
        };

        // Show modal
        document.getElementById("shareModal").style.display = "block";
        document.getElementById("modal-overlay").style.display = "block";
      });
    });

    // Close share modal
    document.getElementById("close-share-modal").addEventListener("click", () => {
      document.getElementById("shareModal").style.display = "none";
      document.getElementById("modal-overlay").style.display = "none";
    });

  } catch (err) {
    console.error("Error loading quizzes:", err);
    quizzesContainer.innerHTML = `<p>Error loading quizzes: ${err.message}</p>`;
  }
}

// Auto-fill quiz code from URL (for participants)
document.addEventListener("DOMContentLoaded", () => {
  const urlParams = new URLSearchParams(window.location.search);
  const quizCode = urlParams.get("code");

  const codeInput = document.getElementById("code");
  const nameInput = document.getElementById("name");

  if (quizCode && codeInput) {
    codeInput.value = quizCode;
    nameInput?.focus();
  }
});

// Save edits from modal
const saveEditBtn = document.getElementById("saveEdit");
if (saveEditBtn) {
  saveEditBtn.addEventListener("click", async () => {
    const quizId = document.getElementById("editModal").dataset.quizId;
    const titleInput = document.getElementById("edit-title");
    const timerInput = document.getElementById("edit-timer");
    const wordsInput = document.getElementById("edit-words");

    const title = titleInput.value.trim();
    const timerMinutes = parseInt(timerInput.value);
    const words = wordsInput.value.split(",").map(w => w.trim()).filter(Boolean);

    if (!title || isNaN(timerMinutes) || words.length === 0) {
      showToast("Please fill in all quiz fields.", "error", 5000);
      return;
    }

    // Disable button to prevent duplicate clicks
    saveEditBtn.disabled = true;
    const originalText = saveEditBtn.textContent;
    saveEditBtn.textContent = "Saving...";

    try {
      await updateDoc(doc(db, "quizzes", quizId), {
        title,
        timer: timerMinutes * 60,
        words
      });

      showToast("Quiz updated successfully!", "success", 4000);

      // Hide modal
      document.getElementById("editModal").style.display = "none";
      document.getElementById("modal-overlay").style.display = "none";

      // Refresh the list
      loadAdminQuizzes();
    } catch (err) {
      console.error("Update error:", err);
      showToast("Failed to update quiz: " + err.message, "error", 6000);
    } finally {
      saveEditBtn.disabled = false;
      saveEditBtn.textContent = originalText;
    }
  });
}

// Reusable function to close modals
function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  const overlay = document.getElementById("modal-overlay");

  if (modal) modal.style.display = "none";
  if (overlay) overlay.style.display = "none";
}

// Close edit modal on cancel
const cancelEditBtn = document.getElementById("cancelEdit");
if (cancelEditBtn) {
  cancelEditBtn.addEventListener("click", () => {
    closeModal("editModal");
  });
}

// Displays results for quizzes taken
async function loadQuizResults(quizId) {
  document.querySelector('[data-tab="results-tab"]').click();
  const resultsList = document.getElementById("results-list");
  resultsList.innerHTML = "<p>Loading...</p>";

  try {
    const quizDoc = await getDoc(doc(db, "quizzes", quizId));
    const quizData = quizDoc.exists() ? quizDoc.data() : null;
    const quizTitle = quizData ? quizData.title : "Quiz";

    const q = query(collection(db, "results"), where("quizId", "==", quizId));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      resultsList.innerHTML = `<p><strong>${quizTitle}</strong></p><p>No results found for this quiz.</p>`;
      return;
    }

    const results = snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    }));

    let html = `
      <h2 class="results-heading">Results for Quiz: ${quizTitle}</h2>

      <div class="results-scroll-wrapper">
      <table class="results-table">
        <thead>
          <tr>
            <th>S/N</th>
            <th>Participant Name</th>
            <th>Score</th>
            <th>Attempted</th>
            <th>Time Used</th>
            <th>Submitted At</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
    `;

    results.forEach((r, index) => {
      const timeUsed = formatTime(r.timeUsed || 0);
      const submittedAt = r.submittedAt?.toDate?.().toLocaleString() || "N/A";

      html += `
        <tr>
          <td>${index + 1}</td>
          <td class="participant-name">${r.participant}</td>
          <td>${r.score} / ${r.total}</td>
          <td>${r.attempted || 0}</td>
          <td>${timeUsed}</td>
          <td>${submittedAt}</td>
          <td>
            <button class="delete-result-btn" data-id="${r.id}" data-quiz="${quizId}">🗑 Delete</button>
          </td>
        </tr>
      `;
    });

    html += `
        </tbody>
      </table>
      </div>
      <div class="results-actions">
        <button id="export-btn">📁 Export CSV</button>
        <button id="clear-all-btn">🧹 Clear All Results</button>
      </div>
    `;

    resultsList.innerHTML = html;

    // Delete Individual Result
    document.querySelectorAll(".delete-result-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const resultId = btn.dataset.id;
        const quizId = btn.dataset.quiz;

        if (!confirm("Are you sure you want to delete this result?")) return;

        btn.disabled = true;
        btn.innerHTML = `<span class="spinner" style="margin-right:5px;"></span>Deleting...`;

        try {
          await deleteDoc(doc(db, "results", resultId));
          showToast("Result deleted successfully.");
          setTimeout(() => loadQuizResults(quizId), 500);
        } catch (err) {
          console.error("Error deleting result:", err.message);
          showToast("Error deleting result.", "error");
          btn.disabled = false;
          btn.textContent = "Delete";
        }
      });
    });

    // Clear All Results
    const clearAllBtn = document.getElementById("clear-all-btn");
    clearAllBtn.addEventListener("click", async () => {
      if (!confirm("Are you sure you want to delete all results for this quiz?")) return;

      clearAllBtn.disabled = true;
      clearAllBtn.innerHTML = `<span class="spinner" style="margin-right:5px;"></span>Clearing...`;

      try {
        const batch = writeBatch(db);
        snapshot.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();

        showToast("All results deleted successfully.");
        setTimeout(() => loadQuizResults(quizId), 500);
      } catch (err) {
        console.error("Error clearing results:", err.message);
        showToast("Error clearing results.", "error");
        clearAllBtn.disabled = false;
        clearAllBtn.textContent = "🧹 Clear All Results";
      }
    });

    // Export CSV
    document.getElementById("export-btn").addEventListener("click", () => {
      exportResultsToCSV(quizTitle, results);
    });

  } catch (err) {
    resultsList.innerHTML = `<p>Error loading results: ${err.message}</p>`;
  }
}

// Helper: format time in mm:ss
function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
}

// Exporting the result
function exportResultsToCSV(title, results) {
  let csv = `S/N,Participant Name,Score,Questions Attempted,Time Used,Submitted At\n`;

  results.forEach((r, index) => {
    const time = formatTime(r.timeUsed || 0);
    const date = r.submittedAt?.toDate?.().toLocaleString?.() || "N/A";
    const attempted = r.attempted ?? "";
    csv += `"${index + 1}","${r.participant}","${r.score} / ${r.total}","${attempted}","${time}","${date}"\n`;

  });

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const fileName = `${title.replace(/\s+/g, '_')}_results.csv`;

  // Create and trigger download link
  if (navigator.msSaveBlob) {
    // IE fallback
    navigator.msSaveBlob(blob, fileName);
  } else {
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link); // Clean up
  }
}

// Tabs functionality for admin dashboard
const tabs = document.querySelectorAll(".tab-btn");
const tabContents = document.querySelectorAll(".tab-content");

function activateTab(tab) {
  // Remove active state from all tabs
  tabs.forEach((btn) => {
    btn.classList.remove("active");
    btn.setAttribute("aria-selected", "false");
  });

  // Add active state to clicked tab
  tab.classList.add("active");
  tab.setAttribute("aria-selected", "true");

  // Show the selected tab's content
  const target = tab.dataset.tab;
  tabContents.forEach((content) => {
    content.style.display = content.id === target ? "block" : "none";
  });
}

// Attach click events to all tabs
tabs.forEach((tab) =>
  tab.addEventListener("click", () => activateTab(tab))
);

// Automatically activate the default tab on page load
const defaultTab = document.querySelector(".tab-btn.active") || tabs[0];
if (defaultTab) activateTab(defaultTab);


// Quiz Page Logic
const homeBtn = document.getElementById("homeBtn");
const quizBox = document.getElementById("quiz-box");
const submitBtn = document.getElementById("submit-quiz");
let currentQuestionIndex = 0;
let quizData = [];
let userAnswers = [];
let timerInterval;

function displayQuestion(index) {
  const questionArea = document.getElementById("question-area");
  const word = quizData[index];

  if (!word) {
    questionArea.innerHTML = "<p>Error: Word not found.</p>";
    return;
  }

  // Render the quiz UI
  questionArea.innerHTML = `
    <p><strong>Word ${index + 1} of ${quizData.length}</strong></p>
    <button type="button" onclick="playAudio('${word}')">🔊 Pronounce</button>
    <p id="definition-${index}" style="font-style: italic; color: #555;">Loading definition...</p>
    <input type="text" id="answer-${index}" placeholder="Type the spelling" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" 
    inputmode="none" style="margin: 10px 0; padding: 8px; width: 100%; max-width: 300px;">
    <div style="margin-top: 10px;">
      <button id="prev-btn" ${index === 0 ? "disabled" : ""}>Previous</button>
      <button id="next-btn" ${index === quizData.length - 1 ? "disabled" : ""}>Next</button>
    </div>
  `;

  function lockInputField(index) {
    const input = document.getElementById(`answer-${index}`);
    if (!input) return;

    input.setAttribute("autocomplete", "off");
    input.setAttribute("autocorrect", "off");
    input.setAttribute("autocapitalize", "off");
    input.setAttribute("spellcheck", "false");
    input.setAttribute("inputmode", "none");

    // Disable right-click, copy, paste, cut, drag
    ["contextmenu", "copy", "paste", "cut", "dragstart", "drop"].forEach(eventType => {
      input.addEventListener(eventType, (e) => e.preventDefault());
    });
  }

  // Load definition dynamically
  fetchDefinition(word, `definition-${index}`);

  // Restore previous answer if available
  const inputEl = document.getElementById(`answer-${index}`);
  if (userAnswers[index]) inputEl.value = userAnswers[index];

  // Handle navigation
  document.getElementById("prev-btn").onclick = () => {
    saveAnswer(index);
    if (currentQuestionIndex > 0) {
      currentQuestionIndex--;
      displayQuestion(currentQuestionIndex);
      lockInputField(currentQuestionIndex);
    }
  };

  document.getElementById("next-btn").onclick = () => {
    saveAnswer(index);
    if (currentQuestionIndex < quizData.length - 1) {
      currentQuestionIndex++;
      displayQuestion(currentQuestionIndex);
      lockInputField(currentQuestionIndex);
    }
  };
}

function saveAnswer(index) {
  const val = document.getElementById(`answer-${index}`)?.value.trim() || "";
  userAnswers[index] = val;
}

let secondsRemaining;
let manualSubmit = false;

// Timer Function using the global formatTime(seconds)
function startTimer(seconds) {
  const timerDisplay = document.getElementById("quiz-timer-display");
  if (!timerDisplay) return;

  window.secondsRemaining = seconds;
  timerDisplay.textContent = `Time Left: ${formatTime(window.secondsRemaining)}`;

  timerInterval = setInterval(() => {
    window.secondsRemaining--;
    timerDisplay.textContent = `Time Left: ${formatTime(window.secondsRemaining)}`;

    if (window.secondsRemaining <= 0) {
      clearInterval(timerInterval);
      showToast("Time's up!", "info");
      manualSubmit = false;
      submitBtn?.click(); // Use optional chaining in case the button is not found
    }
  }, 1000);
}

if (quizBox && submitBtn) {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  const name = params.get("name");
  const quizContainer = document.getElementById("quiz-container");

  if (!code || !name) {
    alert("Missing quiz code or name.");
    window.location.href = "index.html";
  }

  let quiz = {};
  async function loadQuiz() {
    try {
      const quizSnap = await getDoc(doc(db, "quizzes", code));
      if (!quizSnap.exists()) {
        alert("Quiz not found!");
        window.location.href = "index.html";
        return;
      }

      quiz = quizSnap.data();
      quizData = quiz.words;

      if (!quiz.words || !Array.isArray(quiz.words)) {
        alert("Quiz data is malformed.");
        return;
      }

      userAnswers = Array(quizData.length).fill("");

      function lockInputField(index) {
        const input = document.getElementById(`answer-${index}`);
        if (!input) return;
        input.setAttribute("autocomplete", "off");
        input.setAttribute("autocorrect", "off");
        input.setAttribute("autocapitalize", "off");
        input.setAttribute("spellcheck", "false");
        input.setAttribute("inputmode", "none");

        // Disable right-click, copy, paste, cut, drag and drop
        ["contextmenu", "copy", "paste", "cut", "dragstart", "drop"].forEach(eventType => {
          input.addEventListener(eventType, (e) => e.preventDefault());
        });
      }

      // Show instructions then start quiz
      showInstructionModal(() => {
        displayQuestion(currentQuestionIndex);
        lockInputField(currentQuestionIndex);
        setTimeout(() => {
          quizContainer.style.display = "block";
        }, 300);

        secondsRemaining = quiz.timer;
        startTimer(secondsRemaining);
      }, quiz.words, quiz.timer);

    } catch (err) {
      console.error("Failed to load quiz:", err.message);
      alert("An error occurred while loading the quiz.");
      window.location.href = "index.html";
    }
  }

  // Save current answer and handle submit button click
  submitBtn.addEventListener("click", () => {
    manualSubmit = true;
    submitQuiz();
  });

  async function submitQuiz() {
    saveAnswer(currentQuestionIndex);

    if (manualSubmit) {
      const confirmSubmit = confirm("Are you sure you want to submit?");
      if (!confirmSubmit) return;
    }
    homeBtn.style.display = "none"
    clearInterval(timerInterval);
    const timeUsed = quiz.timer - window.secondsRemaining;

    let score = 0;
    let attempted = 0;

    quizData.forEach((word, i) => {
      const answer = (userAnswers[i] || "").trim();
      if (answer) attempted++;
      if (answer.toLowerCase() === word.toLowerCase()) score++;
    });

    try {
      await addDoc(collection(db, "results"), {
        quizId: code,
        participant: name,
        answers: userAnswers,
        score,
        attempted,
        total: quizData.length,
        submittedAt: serverTimestamp(),
        timeUsed,
      });

      const takenDate = new Date().toLocaleString();

      quizBox.innerHTML = `
        <h2>Quiz Complete!</h2>
        <p>${name}, you scored: <strong>${score}/${quizData.length}</strong></p>
        <p>Time used: <strong>${formatTime(timeUsed)}</strong></p>
        <p>Taken on: ${takenDate}</p>
        <button onclick="window.location.href='index.html'" style="margin-top:10px;">Back to Home</button>
      `;

      manualSubmit = false;
    } catch (err) {
      console.error("Submission error:", err.message);
      alert("Error saving results: " + err.message);
    }
  }

  // Handle manual home exit
  document.addEventListener("DOMContentLoaded", () => {
    const homeBtn = document.getElementById("homeBtn");
    if (homeBtn) {
      homeBtn.addEventListener("click", () => {
        if (confirm("Are you sure you want to end the quiz and return to home?")) {
          clearInterval(timerInterval);
          quizBox.innerHTML = "<p>Quiz ended. Redirecting to home...</p>";
          setTimeout(() => {
            window.location.href = "index.html";
          }, 1000);
        }
      });
    }
  });

  loadQuiz();
}

// Fetch definition from dictionary API (excluding the word itself)
async function fetchDefinition(word, elId) {
  const targetEl = document.getElementById(elId);
  if (!targetEl) return;

  try {
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word.toLowerCase()}`);

    if (res.status === 404) {
      targetEl.textContent = "No definition found.";
      return;
    }

    if (!res.ok) throw new Error(`Fetch error: ${res.status}`);

    const data = await res.json();
    const defs = data[0]?.meanings?.[0]?.definitions;
    const rawDef = defs?.[0]?.definition;

    if (!rawDef) {
      targetEl.textContent = "No definition available.";
      return;
    }

    // Replace word with blanks in the definition
    const safeDef = rawDef.replace(new RegExp(`\\b${word}\\b`, "gi"), "_____");
    targetEl.textContent = safeDef;
  } catch (err) {
    targetEl.textContent = "Error loading definition.";
    console.error("Definition fetch failed:", err.message);
  }
}

// Pronounce the word using API audio or fallback to browser TTS
async function playAudio(word) {
  const delay = (ms) => new Promise((res) => setTimeout(res, ms));

  const speakWithTTS = (text) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    speechSynthesis.cancel(); // Stop any current speech
    speechSynthesis.speak(utterance);
  };

  try {
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word.toLowerCase()}`);

    if (!res.ok) throw new Error("Audio not found in API.");

    const data = await res.json();
    const audioURL = data[0]?.phonetics?.find(p => p.audio)?.audio;

    if (audioURL) {
      await delay(100); // Give slight delay before playing
      const audio = new Audio(audioURL);
      await audio.play().catch(() => speakWithTTS(word)); // Fallback if audio fails
    } else {
      speakWithTTS(word); // Fallback to browser voice
    }
  } catch (err) {
    speakWithTTS(word); // Final fallback
    console.warn("Pronunciation fallback:", err.message);
  }
}

// Make playAudio globally accessible for inline onclick calls
window.playAudio = playAudio;

//Capitalize First Letter of Each Word
document.addEventListener("DOMContentLoaded", () => {
  const capitalizeInputs = document.querySelectorAll(".capitalize-input");

  capitalizeInputs.forEach(input => {
    input.addEventListener("input", () => {
      const formatted = input.value
        .toLowerCase()
        .replace(/\b\w/g, char => char.toUpperCase());
      input.value = formatted;
    });
  });
});
