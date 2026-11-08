# 🐍 Mini Snake Game

A modern, responsive Snake game built with plain HTML, CSS, and JavaScript. It has no dependencies and no build step.

## Features
- Smooth, interpolated snake movement (canvas + `requestAnimationFrame`)
- Keyboard controls (Arrow keys / WASD), plus an on-screen D-pad and swipe gestures on mobile
- Score, best score (saved in your browser), and level tracking
- Speed increases every 5 points
- Start, Pause/Resume, and Restart buttons
- Game Over screen
- Responsive layout for desktop and mobile

## How to Run
1. Clone the repository:
   ```bash
   git clone https://github.com/mortuzatonmoy/mini-snake-game.git
   cd mini-snake-game
   ```
2. Open `index.html` in any modern browser (double-click it).

Or serve it locally (optional):
```bash
python -m http.server 8000
# then visit http://localhost:8000
```

## Controls
| Key | Action |
|-----|--------|
| Arrow keys / W A S D | Move |
| Space | Pause / Resume |
| Enter | Restart |

## Project Structure
```
mini-snake-game/
├── index.html   # Markup
├── style.css    # Styles
├── script.js    # Game logic
├── README.md
└── .gitignore
```
