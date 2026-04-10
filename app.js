import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDTRgfKgdma39T7SWkMelAuFWsBv6n_Zr8",
    authDomain: "zedo-6f33b.firebaseapp.com",
    projectId: "zedo-6f33b",
    storageBucket: "zedo-6f33b.firebasestorage.app",
    messagingSenderId: "335247934923",
    appId: "1:335247934923:web:5dbcdce9d4c29307e3e24e"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const ZEDO_AI_KEY = "AIzaSyAyx-HliTT8iy0qjQzZ5rlCXU_7R8ZwnAo"; 

const fileInput = document.getElementById('fileInput');
const notesList = document.getElementById('notesList');
const sendBtn = document.getElementById('sendBtn');
const clearBtn = document.getElementById('clearBtn');
const userInput = document.getElementById('userInput');
const chatDisplay = document.getElementById('chatDisplay');

// Clear search
clearBtn.addEventListener('click', () => { userInput.value = ""; userInput.focus(); });

// Upload Note
fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    try {
        await addDoc(collection(db, "notes"), { name: file.name, content: text, timestamp: new Date() });
        alert("Note synced with Zedo!");
        loadNotes();
    } catch (err) { console.error(err); }
});

// Load Library
async function loadNotes() {
    notesList.innerHTML = "";
    const snapshot = await getDocs(query(collection(db, "notes"), orderBy("timestamp", "desc")));
    snapshot.forEach(doc => {
        const li = document.createElement('li');
        li.textContent = `📄 ${doc.data().name}`;
        notesList.appendChild(li);
    });
}
loadNotes();

// Chat Logic
sendBtn.addEventListener('click', async () => {
    const q = userInput.value.trim();
    if (!q) return;
    appendMessage('user', q);
    userInput.value = "";
    const typing = appendMessage('zedo', "Analyzing knowledge...");

    try {
        const snap = await getDocs(collection(db, "notes"));
        let context = snap.docs.map(doc => `Note: ${doc.data().name}\nContent: ${doc.data().content}`).join("\n\n");

        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${ZEDO_AI_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: `You are Zedo. Use these notes to answer: ${context}\n\nQuestion: ${q}` }] }]
            })
        });

        const data = await res.json();
        typing.remove();
        appendMessage('zedo', data.candidates[0].content.parts[0].text);
    } catch (err) {
        typing.remove();
        appendMessage('zedo', "Error connecting to AI brain.");
    }
});

function appendMessage(sender, text) {
    const div = document.createElement('div');
    div.className = `msg ${sender}`;
    div.innerText = text;
    chatDisplay.appendChild(div);
    chatDisplay.scrollTop = chatDisplay.scrollHeight;
    return div;
}

// Enter key support
userInput.addEventListener('keypress', (e) => { if(e.key === 'Enter') sendBtn.click(); });
