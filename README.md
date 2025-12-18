# Connect 4 — Browser Game (Human vs Human / Human vs AI)

A polished **Connect 4** game you can play directly in the browser. Challenge a friend (**Human vs Human**) or take on an AI opponent (**Human vs AI**) with four difficulty levels. Includes smooth, gravity-style disc drop animations, undo support, and a clean modern UI.

**Created by:** Salim Kashou  
**GitHub:** https://github.com/SalimKashou  
**Note:** Personal, non-profit project built for learning, experimentation, and fun • Created using ChatGPT 5.2

---

## Features

- ✅ **Human vs Human** and **Human vs AI**
- ✅ **AI difficulties:** Easy / Medium / Hard / Extreme  
  - AI uses **minimax + alpha–beta pruning** (difficulty changes search depth + move ordering)
- ✅ **Realistic falling disc animation** (gravity-inspired timing)
- ✅ **Undo** (in Human vs AI it undoes the AI move too)
- ✅ **Reset settings + new game**
- ✅ Keyboard controls for faster play
- ✅ Lightweight self-tests (optional)

---

## Play / Run Locally

This project is pure **vanilla HTML/CSS/JS** — no build step.

### Option 1: Open directly
1. Download or clone the repo
2. Open `index.html` in your browser

### Option 2 (recommended): Run a local server
Some browsers are picky about local file access — using a server avoids issues.

**VS Code Live Server**
- Install the “Live Server” extension
- Right-click `index.html` → “Open with Live Server”

**Python**
```bash
python -m http.server 8000
