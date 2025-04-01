import * as THREE from 'three';
import { Entity } from './Entity.js';
import { settlerNames } from '../utils/Constants.js';

export class Settler extends Entity {
    constructor(world, x, y, type) {
        super(world, x, y);
        
        this.type = type;
        this.name = settlerNames[type] || 'Settler';
        
        // Settler properties
        this.speed = 0.05; // Increased speed for better visibility
        this.path = [];
        this.targetPosition = null;
        this.isMoving = false;
        this.assignedBuilding = null;
        
        // For carriers
        this.carriedResource = null;
        this.carriedAmount = 0;
        
        // To detect stuck movement
        this.lastPosition = { x: 0, z: 0 };
        this.stuckCounter = 0;
        this.stuckThreshold = 100; // Frames without significant movement
    }
    
    init() {
        this.createMesh();
    }
    
    createMesh() {
        // Create a simple cylinder for the settler
        const geometry = new THREE.CylinderGeometry(0.2, 0.2, 0.8, 8);
        const material = new THREE.MeshStandardMaterial({ color: 0x0000FF });
        
        this.mesh = new THREE.Mesh(geometry, material);
        
        // Position the settler
        const worldPos = this.world.getWorldPosition(this.position.x, this.position.y);
        this.mesh.position.set(worldPos.x, 0.4, worldPos.z);
        
        // Name the mesh for raycasting
        this.mesh.name = `settler_${this.type}_${this.position.x}_${this.position.y}`;
        
        return this.mesh;
    }
    
    update() {
        if (this.isMoving && this.targetPosition) {
            this._moveToTarget();
        } else if (this.assignedBuilding) {
            this._performJob();
        } else {
            // Idle, look for work
            this._findWork();
        }
    }
    
    _moveToTarget() {
        // Simple movement towards target
        const target = new THREE.Vector3(
            this.targetPosition.x,
            this.mesh.position.y,
            this.targetPosition.z
        );
        
        const distance = this.mesh.position.distanceTo(target);
        
        // Check for reaching target
        if (distance < 0.25) { // Increased threshold for more reliable proximity detection
            // Reached target
            this.isMoving = false;
            this.targetPosition = null;
            this.stuckCounter = 0; // Reset stuck counter
            
            // Get grid position
            const gridPos = this.world.getGridPosition(
                this.mesh.position.x,
                this.mesh.position.z
            );
            
            this.position.x = gridPos.x;
            this.position.y = gridPos.z;
            
            console.log(`${this.type} reached target at grid (${this.position.x}, ${this.position.y})`);
            
            // If we have a path, get next point
            if (this.path && this.path.length > 0) {
                // Short delay before moving to next point to avoid rapid state changes
                setTimeout(() => {
                    if (!this.isMoving && this.path && this.path.length > 0) {
                        this.moveTo(this.path.shift());
                    }
                }, 50);
            }
        } else {
            // Check if we're stuck
            const movementThreshold = 0.001;
            const isStuck = 
                Math.abs(this.mesh.position.x - this.lastPosition.x) < movementThreshold &&
                Math.abs(this.mesh.position.z - this.lastPosition.z) < movementThreshold;
                
            if (isStuck) {
                this.stuckCounter++;
                
                // If stuck for too long, try to recover
                if (this.stuckCounter > this.stuckThreshold) {
                    console.log(`${this.type} is stuck! Attempting recovery...`);
                    
                    // Try a small random displacement
                    const randomOffsetX = (Math.random() - 0.5) * 0.5;
                    const randomOffsetZ = (Math.random() - 0.5) * 0.5;
                    
                    this.mesh.position.x += randomOffsetX;
                    this.mesh.position.z += randomOffsetZ;
                    
                    // Reset counter
                    this.stuckCounter = 0;
                    
                    // If still stuck after several recoveries, just teleport to target
                    if (Math.random() < 0.3) { // Increased probability
                        console.log(`${this.type} emergency teleport to target`);
                        this.mesh.position.x = this.targetPosition.x;
                        this.mesh.position.z = this.targetPosition.z;
                        
                        // Force update grid position
                        const gridPos = this.world.getGridPosition(
                            this.mesh.position.x,
                            this.mesh.position.z
                        );
                        
                        this.position.x = gridPos.x;
                        this.position.y = gridPos.z;
                        
                        // Mark as reached target
                        this.isMoving = false;
                        this.targetPosition = null;
                        
                        // If we're following a path, continue
                        if (this.path && this.path.length > 0) {
                            setTimeout(() => this.moveTo(this.path.shift()), 50);
                        }
                    }
                }
            } else {
                // Not stuck, reset counter
                this.stuckCounter = 0;
            }
            
            // Save current position for next stuck check
            this.lastPosition.x = this.mesh.position.x;
            this.lastPosition.z = this.mesh.position.z;
            
            // Move towards target
            const direction = new THREE.Vector3()
                .subVectors(target, this.mesh.position)
                .normalize();
            
            // Update position
            const newX = this.mesh.position.x + direction.x * this.speed;
            const newZ = this.mesh.position.z + direction.z * this.speed;
            
            // Get the grid coordinates to find terrain height
            const gridPos = this.world.getGridPosition(newX, newZ);
            
            // Update all components of position
            this.mesh.position.x = newX;
            this.mesh.position.z = newZ;
            
            // Debug logging for porter movement
            if (this.type === 'porter' && Math.random() < 0.01) {
                console.log(`Porter moving to ${this.targetPosition.x.toFixed(2)}, ${this.targetPosition.z.toFixed(2)}, distance: ${distance.toFixed(2)}, path remaining: ${this.path ? this.path.length : 0}`);
            }
            
            // Update height based on terrain if grid position is valid
            if (gridPos.x >= 0 && gridPos.x < this.world.size.width && 
                gridPos.z >= 0 && gridPos.z < this.world.size.height) {
                const terrainHeight = this.world.terrain[gridPos.z][gridPos.x].height;
                this.mesh.position.y = terrainHeight + 0.1; // Slightly above terrain
            }
        }
    }
    
    _performJob() {
        // Different behavior based on settler type
        switch (this.type) {
            case 'porter':
                this._performPorterJob();
                break;
            case 'builder':
                this._performBuilderJob();
                break;
            default:
                // Most workers just stay at their building
                break;
        }
    }
    
    _performPorterJob() {
        // Porter logic: Find resources to carry or buildings that need resources
        if (this.carriedResource) {
            // Find where to deliver
            // For now, just go to warehouse
            const warehouse = this.world.buildings.find(b => b.type === 'warehouse');
            
            if (warehouse) {
                this.moveTo({ x: warehouse.position.x, y: warehouse.position.y });
                
                // Once we reach warehouse, deposit resources
                if (!this.isMoving) {
                    this.world.game.resourceManager.addResource(
                        this.carriedResource,
                        this.carriedAmount
                    );
                    
                    this.carriedResource = null;
                    this.carriedAmount = 0;
                }
            }
        } else {
            // Find building with output to collect
            // For simplicity, just go to a random production building
            const productionBuildings = this.world.buildings.filter(
                b => b.isProducing && b !== this.assignedBuilding
            );
            
            if (productionBuildings.length > 0) {
                const randomBuilding = productionBuildings[
                    Math.floor(Math.random() * productionBuildings.length)
                ];
                
                this.moveTo({ x: randomBuilding.position.x, y: randomBuilding.position.y });
                
                // Once we reach building, collect resources
                if (!this.isMoving && randomBuilding.produces) {
                    this.carriedResource = randomBuilding.produces.type;
                    this.carriedAmount = 1; // Simplified: just carry 1 unit
                }
            }
        }
    }
    
    _performBuilderJob() {
        // Builder logic: Find buildings to build or upgrade
        // For now, just move around randomly
        if (!this.isMoving) {
            const randomX = Math.floor(Math.random() * this.world.size.width);
            const randomY = Math.floor(Math.random() * this.world.size.height);
            
            this.moveTo({ x: randomX, y: randomY });
        }
    }
    
    _findWork() {
        // Find a building that needs workers
        // For simplicity, just find any building
        const availableBuildings = this.world.buildings.filter(b => b.workers.length < 2);
        
        if (availableBuildings.length > 0) {
            const randomBuilding = availableBuildings[
                Math.floor(Math.random() * availableBuildings.length)
            ];
            
            this.assignToBuilding(randomBuilding);
        }
    }
    
    moveTo(position) {
        // Set target position in world coordinates
        const worldPos = this.world.getWorldPosition(position.x, position.y);
        
        this.targetPosition = {
            x: worldPos.x,
            z: worldPos.z
        };
        
        this.isMoving = true;
    }
    
    followPath(path) {
        // Make a defensive copy of the path
        this.path = path ? [...path] : [];
        
        // Log the path for debugging
        if (this.type === 'porter') {
            console.log(`Porter following path of ${this.path.length} steps from (${this.position.x}, ${this.position.y})`);
            
            // Show the first few steps
            if (this.path.length > 0) {
                console.log(`Path starts: ${JSON.stringify(this.path.slice(0, Math.min(3, this.path.length)))}`);
            }
        }
        
        // Clear any existing movement
        this.isMoving = false;
        this.targetPosition = null;
        
        // Start following the path if it's not empty
        if (this.path.length > 0) {
            // Small delay before starting to move
            setTimeout(() => {
                if (this.path && this.path.length > 0) {
                    this.moveTo(this.path.shift());
                }
            }, 50);
        }
    }
    
    assignToBuilding(building) {
        // Unassign from previous building
        if (this.assignedBuilding) {
            this.assignedBuilding.removeWorker(this);
        }
        
        // Assign to new building
        this.assignedBuilding = building;
        building.assignWorker(this);
        
        // Move to building
        this.moveTo({ x: building.position.x, y: building.position.y });
    }
}