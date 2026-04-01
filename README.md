# 🧙‍♂️ Browser Dungeon Roguelike

Welcome to the **Browser Dungeon Roguelike**! A classic, turn-based roguelike game built for the web. Explore procedural dungeons, fight monsters, collect powerful loot, and try to find "The Artifact" at the bottom of the dungeon!

> **Created by [Donnie Wilcox](https://dwilcox.me) | DW Group LLC**
> Check out my personal website for more projects, games, and web experiments!

---

## ✨ Features

- **Turn-based Tactical Combat**: Move, attack, or use items. The enemies only move when you do!
- **Procedural Generation**: Every floor of the dungeon is uniquely generated.
- **RPG Mechanics**: Gain XP, level up your stats, and equip a variety of weapons, armors, and spellbooks.
- **Rich User Interface**: Includes a responsive Game Grid, Player Panel, Combat Log, and Action Bar.
- **Retro Sound Effects**: Features custom-triggered sound effects for hits, crits, leveling up, and spellcasting.

## 🛠️ Tech Stack

This project is built using modern web development tools:
- **[React 18](https://react.dev/)** - UI Library
- **[TypeScript](https://www.typescriptlang.org/)** - For type-safe game logic
- **[Vite](https://vitejs.dev/)** - Lightning-fast build tool and dev server
- **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first styling
- **[shadcn/ui](https://ui.shadcn.com/)** - Reusable robust UI components
- **Lucide Icons** - Beautiful SVG icons

## 📂 Project Structure

- `src/game/` - The core game engine. Contains logic for procedural generation (`engine.ts`), state management via reducer, types (`types.ts`), and sound effects (`sfx.ts`).
- `src/components/` - React components including the `GameGrid`, `CombatLog`, `PlayerPanel`, and complex UI dialogs.
- `src/pages/Index.tsx` - The main game loop and layout wiring. Handles keyboard input and mounts the primary components.
- `src/index.css` - Global styles and Tailwind configuration.

## 🚀 How to Run Locally

If you'd like to run this application on your own machine:

1. **Clone the repository** (or download the source code).
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Start the development server**:
   ```bash
   npm run dev
   ```
4. **Open your browser** and navigate to `http://localhost:8080` (or the port Vite provides in your terminal).

## 🔀 Remixing on Lovable

This application was designed to be highly modular and easy to tinker with. If you are viewing this on **Lovable**, feel free to remix it! 
- Try changing the enemy stats in `src/game/engine.ts`.
- Add new item types or spell effects.
- Customize the Tailwind styling to give the dungeon a completely different vibe!

---

**Made by [Donnie Wilcox](https://dwilcox.me)**
If you enjoy this project or want to collaborate, feel free to reach out via my website!
