# Tic-Tac-Toe Pro 🎮

A professional-quality, fully responsive Tic-Tac-Toe web application built with pure HTML, CSS, and JavaScript.

## Features

### Game Modes
- **Player vs Player** – Two humans take turns on the same device
- **Player vs AI** – Play against the computer with three difficulty levels

### AI Difficulty
| Level  | Behaviour |
|--------|-----------|
| Easy   | Fully random moves |
| Medium | 55% Minimax, 45% random |
| Hard   | Perfect play via Minimax + Alpha-Beta pruning |

### UI & UX
- Dark / Light theme toggle (persists via LocalStorage)
- Glassmorphism-inspired card design with neon glow accents
- Smooth animations: cell pop-in, winning glow, score pulse, win overlay
- Confetti burst on win
- Responsive layout – works on phones, tablets and desktops
- Reduced-motion respect (`prefers-reduced-motion`)

### Game Features
- Customisable player names
- Scoreboard (X Wins / O Wins / Draws)
- Move history with colour-coded entries
- Undo last move (undoes 2 moves in PvA mode)
- Turn timer (enable via `state.timerEnabled = true` in script.js)
- Draw / Win detection with highlighted winning combo
- Statistics modal (total games, win %, draw %)
- All scores and preferences stored in LocalStorage

### Sound Effects
Generated via Web Audio API – no audio files needed:
- Cell click tone
- Win fanfare
- Draw tone

## File Structure
```
tic-tac-toe/
├── index.html    – Markup & structure
├── style.css     – Design system, animations, responsive layout
├── script.js     – Game logic, AI, LocalStorage, sounds
└── README.md
```

## Running Locally
Just open `index.html` in any modern browser — no build step or server required.

## Deploying to GitHub Pages
1. Push the folder contents to a GitHub repository
2. Go to **Settings → Pages**
3. Set source to the `main` branch, root folder
4. Your game will be live at `https://<username>.github.io/<repo-name>/`

## Browser Support
Chrome 80+, Firefox 75+, Safari 14+, Edge 80+

## Tech Stack
- HTML5 (semantic, ARIA roles)
- CSS3 (custom properties, grid, animations)
- Vanilla JavaScript ES6+ (classes-free functional style)
