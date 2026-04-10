import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 1. YOUR FIREBASE CONFIG
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

// 2. YOUR NEW GEMINI KEY (REPLACE THIS STRING)
const ZEDO_AI_KEY = "PASTE_YOUR_NEW_REVOKED_KEY_HERE"; 

// UI Elements
const fileInput = document.getElementById('fileInput');
const notesList = document.getElementById('notesList');
const sendBtn = document.getElementById('sendBtn');
const userInput = document.getElementById('userInput');
const chatDisplay = document.getElementById('chatDisplay');

// --- FEATURE: IMPORT NOTES ---
fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    appendMessage('system', `Reading ${file.name}...`);
    const text = await file.text();
    
    try {
        await addDoc(collection(db, "notes"), {
            name: file.name,
            content: text,
            timestamp: new Date()
        });
        appendMessage('system', "Zedo has indexed your note. You can now ask questions about it!");
        loadNotes();
    } catch (err) {
        appendMessage('system', "Error saving note to Firebase.");
        console.error(err);
    }
});

// --- FEATURE: LOAD KNOWLEDGE BASE ---
async function loadNotes() {
    notesList.innerHTML = "";
    const q = query(collection(db, "notes"), orderBy("timestamp", "desc"));
    const snapshot = await getDocs(q);
    snapshot.forEach(doc => {
        const li = document.createElement('li');
        li.innerHTML = `<strong>📄 ${doc.data().name}</strong>`;
        notesList.appendChild(li);
    });
}
loadNotes();

// --- FEATURE: AI CHAT (RAG LOGIC) ---
sendBtn.addEventListener('click', async () => {
    const question = userInput.value.trim();
    if (!question) return;

    if (ZEDO_AI_KEY === "PASTE_YOUR_NEW_REVOKED_KEY_HERE") {
        alert("Please update the ZEDO_AI_KEY in app.js with your new API key!");
        return;
    }

    appendMessage('user', question);
    userInput.value = "";
    
    const typingIndicator = appendMessage('zedo', "Thinking...");

    try {
        // Step 1: Get context from all your notes
        const snapshot = await getDocs(collection(db, "notes"));
        let context = snapshot.docs.map(doc => `File: ${doc.data().name}\nContent: ${doc.data().content}`).join("\n\n");

        // Step 2: Send to Gemini
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${ZEDO_AI_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ 
                    parts: [{ 
                        text: `You are Zedo, a helpful AI assistant. Answer the question based ONLY on the notes provided below. If the answer isn't in the notes, say "I don't have that information in my records."
                        
                        NOTES:
                        ${context}
                        
                        USER QUESTION:
                        ${question}` 
                    }] 
                }]
            })
        });

        const data = await response.json();
        typingIndicator.remove(); // Remove "Thinking..."

        if (data.candidates && data.candidates[0].content.parts[0].text) {
            const aiText = data.candidates[0].content.parts[0].text;
            appendMessage('zedo', aiText);
        } else {
            throw new Error("Invalid response from AI");
        }

    } catch (err) {
        typingIndicator.remove();
        appendMessage('zedo', "Sorry, I ran into an error connecting to my brain. Check your API key!");
        console.error(err);
    }
});

// Helper: Add messages to UI
function appendMessage(sender, text) {
    const div = document.createElement('div');
    div.classList.add('message', sender);
    div.innerText = text;
    chatDisplay.appendChild(div);
    chatDisplay.scrollTop = chatDisplay.scrollHeight;
    return div;
}
