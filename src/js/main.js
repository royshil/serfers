import { Game } from './core/Game.js';

// Initialize the game
document.addEventListener('DOMContentLoaded', () => {
    const game = new Game();
    game.init();
    game.start();
});