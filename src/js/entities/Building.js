import * as THREE from 'three';
import { Entity } from './Entity.js';
import { buildingNames, productionChains } from '../utils/Constants.js';

export class Building extends Entity {
    constructor(world, x, y, type) {
        super(world, x, y);
        
        this.type = type;
        this.name = buildingNames[type] || 'Building';
        
        // Building properties
        this.size = { width: 1, height: 1 }; // Size in tiles
        this.level = 1;
        this.maxLevel = 3;
        this.isProducing = false;
        this.canUpgrade = true;
        
        // Define interaction point
        this._defineInteractionPoint();
        
        // Production properties
        const production = productionChains[type] || {};
        this.produces = production.produces || null;
        this.consumes = production.consumes || null;
        
        // Upgrade costs - increase with level
        this.upgradeCost = {
            plank: 10 * this.level,
            stone: 5 * this.level
        };
        
        // Production timer
        this.productionTimer = 0;
        this.productionTime = 5000; // 5 seconds per unit
        
        // Workers assigned to this building
        this.workers = [];
    }
    
    init() {
        this.createMesh();
    }
    
    createMesh() {
        // Create a simple box for the building
        const width = this.size.width * this.world.tileSize;
        const depth = this.size.height * this.world.tileSize;
        const height = 1.5; // Building height
        
        const geometry = new THREE.BoxGeometry(width, height, depth);
        const material = new THREE.MeshStandardMaterial({ color: 0xDDDDDD });
        
        this.mesh = new THREE.Mesh(geometry, material);
        
        // Position the building
        const worldPos = this.world.getWorldPosition(this.position.x, this.position.y);
        this.mesh.position.set(worldPos.x, height / 2, worldPos.z);
        
        // Name the mesh for raycasting
        this.mesh.name = `building_${this.type}_${this.position.x}_${this.position.y}`;
        
        // Mark this as a building for raycasting
        this.mesh.userData.isBuilding = true;
        
        return this.mesh;
    }
    
    update() {
        if (!this.isProducing || !this.produces) return;
        
        // Update production timer
        this.productionTimer += 16.67; // Approx 1 frame at 60fps
        
        if (this.productionTimer >= this.productionTime) {
            this.productionTimer = 0;
            this._produce();
        }
    }
    
    startProduction() {
        // Check if we have resources to consume
        if (this.consumes) {
            const resourceManager = this.world.game.resourceManager;
            if (!resourceManager.hasResources(this.consumes)) {
                console.log(`${this.name} cannot produce - missing resources`);
                return false;
            }
            
            // Consume resources
            resourceManager.consumeResources(this.consumes);
        }
        
        this.isProducing = true;
        return true;
    }
    
    stopProduction() {
        this.isProducing = false;
    }
    
    _produce() {
        if (!this.produces) return;
        
        // Add produced resource to storage
        const resourceManager = this.world.game.resourceManager;
        resourceManager.addResource(this.produces.type, this.produces.rate * this.level);
        
        console.log(`${this.name} produced ${this.produces.rate * this.level} ${this.produces.type}`);
        
        // If we need resources to continue, check and consume them
        if (this.consumes) {
            if (resourceManager.hasResources(this.consumes)) {
                resourceManager.consumeResources(this.consumes);
            } else {
                // Stop production if we don't have resources
                this.stopProduction();
            }
        }
    }
    
    upgrade() {
        if (this.level >= this.maxLevel) {
            console.log(`${this.name} is already at maximum level`);
            return false;
        }
        
        this.level++;
        
        // Update upgrade cost for next level
        this.upgradeCost = {
            plank: 10 * this.level,
            stone: 5 * this.level
        };
        
        // Update mesh to reflect upgrade
        this.mesh.scale.y = 1 + (this.level - 1) * 0.3;
        
        console.log(`${this.name} upgraded to level ${this.level}`);
        return true;
    }
    
    assignWorker(worker) {
        this.workers.push(worker);
        
        // If we have workers and resources, start production
        if (this.workers.length > 0 && this.produces) {
            this.startProduction();
        }
    }
    
    removeWorker(worker) {
        this.workers = this.workers.filter(w => w !== worker);
        
        // If no workers left, stop production
        if (this.workers.length === 0) {
            this.stopProduction();
        }
    }
    
    // Define the interaction point for settlers to approach the building
    _defineInteractionPoint() {
        // By default, the interaction point is at the bottom edge, middle
        this.interactionPoint = {
            x: this.position.x + Math.floor(this.size.width / 2),
            y: this.position.y + this.size.height - 1
        };
        
        // For warehouse, use the bottom right corner
        if (this.type === 'warehouse') {
            this.interactionPoint = {
                x: this.position.x + this.size.width - 1,
                y: this.position.y + this.size.height - 1
            };
        }
    }
    
    // Get the interaction position in world coordinates
    getInteractionPosition() {
        return this.world.getWorldPosition(
            this.interactionPoint.x,
            this.interactionPoint.y
        );
    }
}