# 📚 StudyDeck — Student Productivity Dashboard

🔴 **[View the Live Project Here](https://aryankr12.github.io/studydeck-dashboard/)**

StudyDeck is a clean, actionable student productivity dashboard that turns a simple list of assignments into a focused daily view. Built entirely with Vanilla JavaScript, it requires no backend, no frameworks, and no build steps—just open the link and start managing your tasks.

---

## ✨ Features

### Core Requirements
- **Task Management:** Create tasks with titles, subjects, deadlines, priority levels, and completion states.
- **Daily Dashboard:** Automatically organizes tasks into **Overdue**, **Today**, and **Upcoming** buckets.
- **Smart Filtering:** Filter tasks instantly by Subject, Priority (High/Medium/Low), or search by title/subject.
- **Local Persistence:** All tasks, theme preferences, and active views are saved automatically to your browser's `localStorage`.

### 🌟 Brownie Points / Extra Features
- **🎯 Drag-and-Drop Board:** Switch to the "Priority Board" view to drag and drop tasks between High, Medium, and Low columns.
- **📊 Progress Ring:** A dynamic SVG progress ring tracks your daily completion percentage in real-time.
- **⌨️ Keyboard Shortcuts:** Fully navigable via the keyboard (press `?` in the app to see all shortcuts).
- **🌗 Dark/Light Theme:** A beautiful, modern UI that automatically detects your system preference and saves your manual toggle choice.
- **📱 Responsive Design:** The layout gracefully collapses into a single-column view for mobile devices, making it easy to check assignments on the go.

---

## 🛠️ Tech Stack & Architecture
- **HTML5:** Semantic markup, native `<dialog>` elements.
- **CSS3:** Custom properties (CSS variables) for dynamic theming, CSS Grid/Flexbox for layout, and responsive media queries. 
- **Vanilla JavaScript (ES6+):** 
  - **State Management:** Unidirectional data flow using a central `state` object. Every UI update triggers a full re-render from the state.
  - **Drag & Drop:** Native HTML5 Drag and Drop API.
  - **No dependencies:** 0% frameworks, 100% performance.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `N` | Open the "New Task" dialog |
| `/` | Focus the search bar |
| `T` | Toggle between Dark and Light mode |
| `1` | Switch to Dashboard View |
| `2` | Switch to Priority Board View |
| `?` | Show the Keyboard Shortcuts help menu |
| `Esc` | Close any open dialog |
| `Cmd/Ctrl + Enter` | Save a task while the dialog is open |

---

## 🚀 How to Run Locally

If you want to run this project on your own machine:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/aryankr12/studydeck-dashboard.git