import { TerrainType } from './Enums.js';

// A* pathfinding algorithm for settlers to find paths through the terrain
export class PathFinder {
    constructor(world) {
        this.world = world;
    }
    
    // Find the shortest path between two points
    findPath(startX, startY, endX, endY) {
        // Create a grid representation of the terrain
        const grid = this._createGrid();
        
        // A* algorithm implementation
        const openSet = [];
        const closedSet = new Set();
        const cameFrom = new Map();
        
        // Cost from start to current node
        const gScore = new Map();
        // Estimated total cost from start to goal through current node
        const fScore = new Map();
        
        // Start node
        const startNode = this._nodeKey(startX, startY);
        gScore.set(startNode, 0);
        fScore.set(startNode, this._heuristic(startX, startY, endX, endY));
        openSet.push({ key: startNode, x: startX, y: startY, f: fScore.get(startNode) });
        
        while (openSet.length > 0) {
            // Sort by fScore and take the lowest
            openSet.sort((a, b) => a.f - b.f);
            const current = openSet.shift();
            
            // If we reached the goal
            if (current.x === endX && current.y === endY) {
                return this._reconstructPath(cameFrom, current.key);
            }
            
            closedSet.add(current.key);
            
            // Get neighbors
            const neighbors = this._getNeighbors(current.x, current.y, grid);
            
            for (const neighbor of neighbors) {
                const neighborKey = this._nodeKey(neighbor.x, neighbor.y);
                
                // Skip if already evaluated
                if (closedSet.has(neighborKey)) continue;
                
                // Calculate tentative gScore
                const tentativeGScore = (gScore.get(current.key) || Infinity) + 1;
                
                // Add to open set if not already there
                const existingIndex = openSet.findIndex(n => n.key === neighborKey);
                if (existingIndex === -1) {
                    openSet.push({
                        key: neighborKey,
                        x: neighbor.x,
                        y: neighbor.y,
                        f: tentativeGScore + this._heuristic(neighbor.x, neighbor.y, endX, endY)
                    });
                } else if (tentativeGScore >= (gScore.get(neighborKey) || Infinity)) {
                    // This is not a better path
                    continue;
                }
                
                // This path is the best until now
                cameFrom.set(neighborKey, current.key);
                gScore.set(neighborKey, tentativeGScore);
                fScore.set(neighborKey, tentativeGScore + this._heuristic(neighbor.x, neighbor.y, endX, endY));
                
                // Update existing node in openSet if needed
                if (existingIndex !== -1) {
                    openSet[existingIndex].f = fScore.get(neighborKey);
                }
            }
        }
        
        // No path found
        return [];
    }
    
    // Create a grid representation of the terrain
    _createGrid() {
        const grid = [];
        for (let y = 0; y < this.world.size.height; y++) {
            grid[y] = [];
            for (let x = 0; x < this.world.size.width; x++) {
                // Check if tile is passable
                grid[y][x] = this._isPassable(x, y);
            }
        }
        return grid;
    }
    
    // Check if a tile is passable
    _isPassable(x, y) {
        // Check bounds
        if (x < 0 || y < 0 || x >= this.world.size.width || y >= this.world.size.height) {
            return false;
        }
        
        const terrain = this.world.terrain[y][x];
        
        // Water and mountains are impassable
        if (terrain.type === TerrainType.WATER || terrain.type === TerrainType.MOUNTAIN) {
            return false;
        }
        
        // Check if tile is occupied by a building
        if (terrain.building) {
            // The only exception is the entry point of a building
            const building = terrain.building;
            
            // For warehouse, the entry point is the bottom right corner
            if (building.type === 'warehouse') {
                const entryX = building.position.x + building.size.width - 1;
                const entryY = building.position.y + building.size.height - 1;
                return x === entryX && y === entryY;
            }
            
            // For other buildings, only the bottom edge is accessible
            const isBottomEdge = y === building.position.y + building.size.height - 1;
            const isWithinBuilding = 
                x >= building.position.x && 
                x < building.position.x + building.size.width;
                
            return isBottomEdge && isWithinBuilding;
        }
        
        // Forest is passable but with higher cost (handled in getNeighbors)
        
        return true;
    }
    
    // Get neighbors of a node
    _getNeighbors(x, y, grid) {
        const neighbors = [];
        const directions = [
            { dx: 0, dy: -1 }, // North
            { dx: 1, dy: 0 },  // East
            { dx: 0, dy: 1 },  // South
            { dx: -1, dy: 0 }  // West
            // Can add diagonals if needed
        ];
        
        for (const dir of directions) {
            const newX = x + dir.dx;
            const newY = y + dir.dy;
            
            // Check bounds
            if (newX < 0 || newY < 0 || newX >= this.world.size.width || newY >= this.world.size.height) {
                continue;
            }
            
            // Check if passable
            if (grid[newY][newX]) {
                neighbors.push({ x: newX, y: newY });
            }
        }
        
        return neighbors;
    }
    
    // Heuristic function (Manhattan distance)
    _heuristic(x1, y1, x2, y2) {
        return Math.abs(x1 - x2) + Math.abs(y1 - y2);
    }
    
    // Create a key for a node
    _nodeKey(x, y) {
        return `${x},${y}`;
    }
    
    // Reconstruct path from cameFrom map
    _reconstructPath(cameFrom, currentKey) {
        const path = [];
        let current = currentKey;
        
        while (cameFrom.has(current)) {
            const [x, y] = current.split(',').map(Number);
            path.unshift({ x, y });
            current = cameFrom.get(current);
        }
        
        return path;
    }
}