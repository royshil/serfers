import * as THREE from 'three';
import { Building } from '../Building.js';
import { BuildingType, ResourceType } from '../../utils/Enums.js';
import { buildingCosts } from '../../utils/Constants.js';

// Construction is a special building class that represents a building under construction
export class Construction extends Building {
    constructor(world, x, y, targetBuildingType) {
        super(world, x, y, BuildingType.WAREHOUSE);  // Temporarily use warehouse type
        
        // Store the target building type
        this.targetBuildingType = targetBuildingType;
        
        // Get the target building size from the constants or default to 1x1
        this.size = { 
            width: targetBuildingType === BuildingType.WAREHOUSE ? 2 : 1, 
            height: targetBuildingType === BuildingType.WAREHOUSE ? 2 : 1 
        };
        
        // Define interaction point
        this._defineInteractionPoint();
        
        // Construction progress (0-100%)
        this.progress = 0;
        this.constructionSpeed = 0.5; // Progress increment per frame (increased for faster testing)
        
        // Resources needed for construction
        this.requiredResources = {...buildingCosts[targetBuildingType]};
        this.allocatedResources = {};
        Object.keys(this.requiredResources).forEach(resource => {
            this.allocatedResources[resource] = 0;
        });
        
        // Debug: Log resources required for construction
        console.log(`Construction requires resources:`, this.requiredResources);
        
        // Create a group for the mesh immediately
        this.mesh = new THREE.Group();
        
        // Load the construction sprite texture
        this.textureLoaded = false;
        this.textureLoader = new THREE.TextureLoader();
        
        console.log(`Construction started at grid position: ${x}, ${y} for ${targetBuildingType}`);
        
        // Create the construction mesh
        this.createMesh();
    }
    
    createMesh() {
        const width = this.size.width * this.world.tileSize;
        const depth = this.size.height * this.world.tileSize;
        
        // Clear any existing children
        while (this.mesh.children.length > 0) {
            this.mesh.remove(this.mesh.children[0]);
        }
        
        // Path to the construction sprite
        const spritePath = '/assets/sprites/construction.png';
        
        this.textureLoader.load(spritePath,
            // Success callback
            (texture) => {
                console.log("Successfully loaded construction texture:", spritePath);
                this._setupConstructionSprite(texture, width, depth);
            },
            // Progress callback
            undefined,
            // Error callback
            (error) => {
                console.warn("Error loading construction texture:", error);
                this._createFallbackMesh(width, depth);
            });
        
        // Position the construction on the terrain
        const worldPos = this.world.getWorldPosition(this.position.x, this.position.y);
        const terrainHeight = this.world.terrain[this.position.y][this.position.x].height;
        
        // Place at the correct position
        this.mesh.position.set(
            worldPos.x + width / 2,
            terrainHeight,
            worldPos.z + depth / 2
        );
        
        // Create progress bar
        this._createProgressBar(width);
        
        // Name the mesh for raycasting
        this.mesh.name = `construction_${this.targetBuildingType}_${this.position.x}_${this.position.y}`;
        
        // Mark as a building for raycasting
        this.mesh.userData.isBuilding = true;
        this.mesh.userData.isConstruction = true;
        
        return this.mesh;
    }
    
    // Helper method to create the construction sprite
    _setupConstructionSprite(texture, width, depth) {
        this.textureLoaded = true;
        
        // Create billboard sprite material
        const spriteMaterial = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            alphaTest: 0.01,
            depthTest: true,
            sizeAttenuation: true
        });
        
        // Create the sprite
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.scale.set(width * 1.2, width * 1.2, 1);
        
        // Position above the base
        sprite.position.set(0, width/4, 0);
        this.mesh.add(sprite);
        
        // Add a shadow beneath
        const shadowGeometry = new THREE.PlaneGeometry(width, depth);
        const shadowMaterial = new THREE.MeshBasicMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0.3,
            depthWrite: false
        });
        
        const shadow = new THREE.Mesh(shadowGeometry, shadowMaterial);
        shadow.rotation.x = -Math.PI / 2;
        shadow.position.y = 0.01;
        this.mesh.add(shadow);
    }
    
    // Create a fallback mesh if texture loading fails
    _createFallbackMesh(width, depth) {
        const height = 0.5;
        const geometry = new THREE.BoxGeometry(width, height, depth);
        const material = new THREE.MeshStandardMaterial({ color: 0xA0522D });
        
        const base = new THREE.Mesh(geometry, material);
        base.position.y = height / 2;
        this.mesh.add(base);
        
        // Add vertical beams at corners
        const beamHeight = 1.5;
        const beamSize = 0.2;
        const beamGeometry = new THREE.BoxGeometry(beamSize, beamHeight, beamSize);
        const beamMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
        
        // Calculate positions for the corners
        const halfWidth = width / 2 - beamSize / 2;
        const halfDepth = depth / 2 - beamSize / 2;
        
        // Create beams at each corner
        const corners = [
            { x: -halfWidth, z: -halfDepth },
            { x: halfWidth, z: -halfDepth },
            { x: -halfWidth, z: halfDepth },
            { x: halfWidth, z: halfDepth }
        ];
        
        corners.forEach(corner => {
            const beam = new THREE.Mesh(beamGeometry, beamMaterial);
            beam.position.set(corner.x, height + beamHeight / 2, corner.z);
            this.mesh.add(beam);
        });
    }
    
    // Create a progress bar above the construction
    _createProgressBar(width) {
        const progressBarWidth = width;
        const progressBarHeight = 0.2;
        const progressBarElevation = width / 2 + 0.5;
        
        // Background bar
        const backgroundGeometry = new THREE.BoxGeometry(progressBarWidth, progressBarHeight, progressBarHeight);
        const backgroundMaterial = new THREE.MeshBasicMaterial({ color: 0x333333 });
        this.progressBarBackground = new THREE.Mesh(backgroundGeometry, backgroundMaterial);
        this.progressBarBackground.position.set(0, progressBarElevation, 0);
        this.mesh.add(this.progressBarBackground);
        
        // Progress fill
        const fillGeometry = new THREE.BoxGeometry(0.01, progressBarHeight * 0.8, progressBarHeight * 0.8);
        const fillMaterial = new THREE.MeshBasicMaterial({ color: 0x00FF00 });
        this.progressBarFill = new THREE.Mesh(fillGeometry, fillMaterial);
        
        // Position at the left edge of the background
        this.progressBarFill.position.set(-progressBarWidth / 2, progressBarElevation, 0);
        this.mesh.add(this.progressBarFill);
        
        // Store info for updating the progress bar
        this.progressBarInfo = {
            width: progressBarWidth,
            startX: -progressBarWidth / 2,
            endX: progressBarWidth / 2
        };
        
        // Create resource indicators
        this._createResourceIndicators(width);
    }
    
    // Create indicators showing required resources
    _createResourceIndicators(width) {
        if (Object.keys(this.requiredResources).length === 0) return;
        
        const textureLoader = new THREE.TextureLoader();
        const resourceSprites = {};
        
        // Planks are currently the main resource
        if (this.requiredResources[ResourceType.PLANK]) {
            textureLoader.load('/assets/sprites/plank_carried.png', texture => {
                const material = new THREE.SpriteMaterial({
                    map: texture,
                    transparent: true,
                    depthTest: true
                });
                
                const sprite = new THREE.Sprite(material);
                sprite.scale.set(0.4, 0.2, 1);
                
                // Position to the right of the construction site
                sprite.position.set(width / 2 + 0.3, 0.5, 0);
                
                // Add a text indicator showing required amount
                const amount = this.requiredResources[ResourceType.PLANK];
                this._createTextIndicator(`0/${amount}`, width / 2 + 0.3, 0.8, sprite);
                
                resourceSprites[ResourceType.PLANK] = {
                    sprite,
                    textSprite: this.resourceTextSprites[ResourceType.PLANK]
                };
                
                this.mesh.add(sprite);
            });
        }
        
        // Store for later updates
        this.resourceSprites = resourceSprites;
    }
    
    // Create a text indicator for resources
    _createTextIndicator(text, x, y, parent) {
        // Create canvas for text
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 64;
        canvas.height = 32;
        
        // Draw text
        context.fillStyle = 'white';
        context.font = '20px Arial';
        context.textAlign = 'center';
        context.fillText(text, canvas.width / 2, canvas.height / 2);
        
        // Create texture and sprite
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true
        });
        
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(0.5, 0.25, 1);
        sprite.position.set(0, y, 0);
        
        // Add to parent or mesh
        if (parent) {
            parent.add(sprite);
        } else {
            this.mesh.add(sprite);
        }
        
        // Store for updating
        if (!this.resourceTextSprites) {
            this.resourceTextSprites = {};
        }
        
        const resourceType = Object.keys(this.requiredResources).find(
            type => this.requiredResources[type] === parseInt(text.split('/')[1])
        );
        
        if (resourceType) {
            this.resourceTextSprites[resourceType] = {
                sprite,
                canvas,
                context
            };
        }
        
        return sprite;
    }
    
    // Update resource indicators
    _updateResourceIndicators() {
        if (!this.resourceTextSprites) return;
        
        // Update each resource indicator
        Object.entries(this.requiredResources).forEach(([resourceType, amount]) => {
            const allocated = this.allocatedResources[resourceType] || 0;
            
            if (this.resourceTextSprites[resourceType]) {
                const { context, canvas, sprite } = this.resourceTextSprites[resourceType];
                
                // Clear canvas
                context.clearRect(0, 0, canvas.width, canvas.height);
                
                // Draw updated text
                context.fillStyle = 'white';
                context.font = '20px Arial';
                context.textAlign = 'center';
                context.fillText(`${allocated}/${amount}`, canvas.width / 2, canvas.height / 2);
                
                // Update texture
                sprite.material.map.needsUpdate = true;
            }
        });
    }
    
    // Update the progress bar based on construction progress
    _updateProgressBar() {
        if (!this.progressBarFill) return;
        
        // Calculate the width of the fill bar based on progress
        const fillWidth = (this.progress / 100) * this.progressBarInfo.width;
        this.progressBarFill.scale.x = fillWidth;
        
        // Position the fill bar so its left edge stays at the start
        const newX = this.progressBarInfo.startX + fillWidth / 2;
        this.progressBarFill.position.x = newX;
        
        // Update resource indicators
        this._updateResourceIndicators();
    }
    
    // Attempt to allocate resources from the warehouse
    _allocateResources() {
        const resourceManager = this.world.game.resourceManager;
        let resourcesAllocated = false;
        
        // Try to allocate resources for each required resource type
        Object.entries(this.requiredResources).forEach(([resource, amount]) => {
            // How much is still needed
            const neededAmount = amount - this.allocatedResources[resource];
            
            if (neededAmount > 0) {
                // Check if resource is available
                const available = resourceManager.getResource(resource);
                
                if (available > 0) {
                    // Allocate 1 unit at a time
                    resourceManager.consumeResource(resource, 1);
                    this.allocatedResources[resource]++;
                    resourcesAllocated = true;
                }
            }
        });
        
        return resourcesAllocated;
    }
    
    // Check if all required resources have been allocated
    _hasAllResources() {
        return Object.entries(this.requiredResources).every(
            ([resource, amount]) => this.allocatedResources[resource] >= amount
        );
    }
    
    // Update method called every frame
    update() {
        // Don't auto-allocate resources anymore - porters will do this
        
        // Progress is controlled by builders now
        // We just need to check if progress is complete
        if (this.progress >= 100) {
            this._completeConstruction();
        }
        
        // Update the progress bar
        this._updateProgressBar();
    }
    
    // Complete construction and replace with actual building
    _completeConstruction() {
        console.log(`Construction completed for ${this.targetBuildingType} at ${this.position.x}, ${this.position.y}`);
        
        // Tell the world to replace this construction with the actual building
        this.world.completeConstruction(this);
    }
}