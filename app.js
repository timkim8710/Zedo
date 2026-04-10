import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Your Config (From your earlier prompt)
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
const GEMINI_KEY = "REPLACE_WITH_NEW_KEY"; // PUT NEW KEY HERE

// Elements
const fileInput = document.getElementById('fileInput');
const notesList = document.getElementById('notesList');
const sendBtn = document.getElementById('sendBtn');
const userInput = document.getElementById('userInput');
const chatDisplay = document.getElementById('chatDisplay');

// 1. Upload Note to Firebase
fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const text = await file.text();
    try {
        await addDoc(collection(db, "notes"), {
            name: file.name,
            content: text,
            timestamp: new Date()
        });
        alert("Zedo has learned your note!");
        loadNotes();
    } catch (err) { console.error(err); }
});

// 2. Load Note Titles
async function loadNotes() {
    notesList.innerHTML = "";
    const q = query(collection(db, "notes"));
    const snapshot = await getDocs(q);
    snapshot.forEach(doc => {
        const li = document.createElement('li');
        li.textContent = doc.data().name;
        notesList.appendChild(li);
    });
}
loadNotes();

// 3. Ask AI (The RAG process)
sendBtn.addEventListener('click', async () => {
    const question = userInput.value;
    if (!question) return;

    appendMessage('user', question);
    userInput.value = "";

    // Fetch context from Firebase
    const snapshot = await getDocs(collection(db, "notes"));
    let context = snapshot.docs.map(doc => doc.data().content).join("\n\n");

    // Call Gemini
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: `Use these notes to answer: ${context}\n\nQuestion: ${question}` }] }]
        })
    });

    const data = await response.json();
    const aiText = data.candidates[0].content.parts[0].text;
    appendMessage('zedo', aiText);
});

function appendMessage(sender, text) {
    const div = document.createElement('div');
    div.classList.add('message', sender);
    div.textContent = text;
    chatDisplay.appendChild(div);
    chatDisplay.scrollTop = chatDisplay.scrollHeight;
}
