import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 1. Firebase Configuration
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

// 2. Gemini API Key (Integrated)
const ZEDO_AI_KEY = "AIzaSyAyx-HliTT8iy0qjQzZ5rlCXU_7R8ZwnAo"; 

// UI Elements
const fileInput = document.getElementById('fileInput');
const notesList = document.getElementById('notesList');
const sendBtn = document.getElementById('sendBtn');
const userInput = document.getElementById('userInput');
const chatDisplay = document.getElementById('chatDisplay');

// FEATURE: Import Notes to Firebase
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
        alert(`Zedo has imported: ${file.name}`);
        loadNotes();
    } catch (err) {
        console.error("Upload failed:", err);
    }
});

// FEATURE: Display Knowledge Base
async function loadNotes() {
    notesList.innerHTML = "";
    const q = query(collection(db, "notes"), orderBy("timestamp", "desc"));
    const snapshot = await getDocs(q);
    snapshot.forEach(doc => {
        const li = document.createElement('li');
        li.style.padding = "10px";
        li.style.borderBottom = "1px solid #333";
        li.innerHTML = `📄 ${doc.data().name}`;
        notesList.appendChild(li);
    });
}
loadNotes();

// FEATURE: AI RAG Logic
sendBtn.addEventListener('click', async () => {
    const question = userInput.value.trim();
    if (!question) return;

    appendMessage('user', question);
    userInput.value = "";
    
    const typing = appendMessage('zedo', "Zedo is analyzing your notes...");

    try {
        // Step 1: Pull all notes for context
        const snapshot = await getDocs(collection(db, "notes"));
        let context = snapshot.docs.map(doc => `Note: ${doc.data().name}\nContent: ${doc.data().content}`).join("\n\n");

        // Step 2: Query Gemini 1.5 Flash
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${ZEDO_AI_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ 
                    parts: [{ 
                        text: `You are Zedo. Use the provided notes to answer the question accurately.
                        
                        CONTEXT FROM NOTES:
                        ${context}
                        
                        QUESTION:
                        ${question}` 
                    }] 
                }]
            })
        });

        const data = await response.json();
        typing.remove();

        if (data.candidates) {
            appendMessage('zedo', data.candidates[0].content.parts[0].text);
        }
    } catch (err) {
        typing.remove();
        appendMessage('zedo', "Connection error. Please check your API usage limits.");
        console.error(err);
    }
});

function appendMessage(sender, text) {
    const div = document.createElement('div');
    div.className = `message ${sender}`;
    div.innerText = text;
    chatDisplay.appendChild(div);
    chatDisplay.scrollTop = chatDisplay.scrollHeight;
    return div;
}
