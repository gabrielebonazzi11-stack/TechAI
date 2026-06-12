export const globalCss = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');

@keyframes slideInUp { 
  from { opacity: 0; transform: translateY(28px); } 
  to { opacity: 1; transform: translateY(0); } 
}

@keyframes fadeIn { 
  from { opacity: 0; } 
  to { opacity: 1; } 
}

.slide-in { animation: slideInUp 0.32s cubic-bezier(0.16, 1, 0.3, 1) both; }
.fade-in  { animation: fadeIn 0.22s ease both; }

* { 
  font-family: 'Inter', 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif !important; 
  box-sizing: border-box;

  /* Firefox */
  scrollbar-width: thin;
  scrollbar-color: #60a5fa rgba(120, 120, 120, 0.16);
}

html, body, #root { 
  width: 100%; 
  height: 100%; 
  margin: 0; 
  overflow: hidden; 
}

button { 
  font-family: inherit; 
  transition: transform 0.15s ease, opacity 0.15s ease !important; 
}

button:hover:not(:disabled) { transform: scale(1.05); }
button:active:not(:disabled) { transform: scale(0.97); }
button:disabled { opacity: 0.5; cursor: not-allowed; }

input::placeholder, textarea::placeholder { opacity: 0.55; }

/* Scrollbar globale TechAI */
*::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

*::-webkit-scrollbar-track {
  background: rgba(120, 120, 120, 0.12);
  border-radius: 999px;
}

*::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, #60a5fa, #3b82f6);
  border-radius: 999px;
  border: 2px solid rgba(5, 5, 5, 0.75);
}

*::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(180deg, #93c5fd, #60a5fa);
}

*::-webkit-scrollbar-corner {
  background: transparent;
}
`;
