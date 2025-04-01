import { TerrainType } from "./Enums";

export const generateTileMap = (width = 30, height = 30, options = {}) => {
    // Default terrain distribution
    const terrainOptions = {
        grassPercentage: options.grassPercentage || 55,
        forestPercentage: options.forestPercentage || 35,
        lakePercentage: options.lakePercentage || 5,
        mountainPercentage: options.mountainPercentage || 10,
        clusteringFactor: options.clusteringFactor || 0.95,
        smoothingPasses: options.smoothingPasses || 3
    };

    // Initialize empty map
    const map = Array(height).fill().map(() => Array(width).fill(TerrainType.GRASS));

    // Create initial random noise
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const random = Math.random() * 100;

            if (random < terrainOptions.grassPercentage) {
                map[y][x] = TerrainType.GRASS;
            } else if (random < terrainOptions.grassPercentage + terrainOptions.forestPercentage) {
                map[y][x] = TerrainType.FOREST;
            } else if (random < terrainOptions.grassPercentage + terrainOptions.forestPercentage + terrainOptions.lakePercentage) {
                map[y][x] = TerrainType.WATER;
            } else {
                map[y][x] = TerrainType.MOUNTAIN;
            }
        }
    }

    // Apply cellular automata for more natural clustering
    for (let i = 0; i < terrainOptions.smoothingPasses; i++) {
        applyCellularAutomata(map, terrainOptions.clusteringFactor);
    }

    return map.map(row => row.map(tile => ({
        type: tile,
        height: 1.0,
    })));
};

const applyCellularAutomata = (map, clusteringFactor) => {
    const height = map.length;
    const width = map[0].length;
    const newMap = JSON.parse(JSON.stringify(map));

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const neighbors = getNeighbors(map, x, y);
            const currentTile = map[y][x];

            // Count occurrences of each terrain type in the neighbors
            const counts = neighbors.reduce((acc, terrain) => {
                acc[terrain] = (acc[terrain] || 0) + 1;
                return acc;
            }, {});

            // Determine the most common terrain around this tile
            let mostCommonTerrain = currentTile;
            let maxCount = 0;

            for (const terrain in counts) {
                if (counts[terrain] > maxCount) {
                    maxCount = counts[terrain];
                    mostCommonTerrain = terrain;
                }
            }

            // Apply clustering based on the factor
            if (Math.random() < clusteringFactor) {
                newMap[y][x] = mostCommonTerrain;
            }
        }
    }

    // Apply changes back to the original map
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            map[y][x] = newMap[y][x];
        }
    }
};

const getNeighbors = (map, x, y) => {
    const height = map.length;
    const width = map[0].length;
    const neighbors = [];

    // Get the 8 surrounding tiles
    for (let ny = Math.max(0, y - 1); ny <= Math.min(height - 1, y + 1); ny++) {
        for (let nx = Math.max(0, x - 1); nx <= Math.min(width - 1, x + 1); nx++) {
            if (nx !== x || ny !== y) { // Skip the center tile
                neighbors.push(map[ny][nx]);
            }
        }
    }

    return neighbors;
};