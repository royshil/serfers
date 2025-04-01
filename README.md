# Isometric Settlers

A browser-based isometric strategy game inspired by "The Settlers", built with Three.js.

## Overview

This game simulates an agrarian economy where you manage resources, build structures, and coordinate settlers with different jobs to grow your colony.

Features:
- Isometric 3D view with simple graphics
- Resource gathering and production chains
- Different types of buildings with unique functions
- Settlers with various jobs (woodcutters, porters, builders, etc.)
- Terrain that affects building placement

## How to Run

1. Install dependencies:
```
npm install
```

2. Start the local server:
```
npm start
```

3. The game should automatically open in your browser at http://localhost:3000

## Game Mechanics

### Resources
- Wood, Stone, Iron Ore, Iron, Planks, Wheat, Flour, Bread, Meat

### Buildings
- Warehouse: Central storage for all resources
- Woodcutter's Hut: Produces wood
- Sawmill: Converts wood into planks
- Stonemason's Hut: Produces stone
- Mine: Produces iron ore
- Ironsmith's Forge: Converts iron ore into iron
- Farm: Produces wheat
- Mill: Converts wheat into flour
- Bakery: Converts flour into bread
- Hunter's Hut: Produces meat

### Settlers
- Porters: Carry resources between buildings
- Builders: Construct and upgrade buildings
- Specialized workers: Operate specific buildings

## Development

This project uses:
- Three.js for 3D rendering
- Pure JavaScript for game logic
- HTML/CSS for UI

## Future Plans
- Add more building types
- Improve settler AI and pathfinding
- Add combat mechanics
- Implement multiplayer functionality

## License
MIT