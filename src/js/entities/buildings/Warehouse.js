import * as THREE from 'three';
import { Building } from '../Building.js';
import { BuildingType } from '../../utils/Enums.js';

export class Warehouse extends Building {
    constructor(world, x, y) {
        super(world, x, y, BuildingType.WAREHOUSE);

        // Warehouse is larger than normal buildings
        this.size = { width: 2, height: 2 };

        // Warehouse has higher upgrade costs
        this.upgradeCost = {
            plank: 20 * this.level,
            stone: 10 * this.level
        };

        // Create a group for the mesh immediately
        this.mesh = new THREE.Group();

        // Load the sprite texture
        this.textureLoaded = false;
        this.textureLoader = new THREE.TextureLoader();

        console.log(`Warehouse initialized at grid position: ${x}, ${y}`);

        // Create a simple fallback mesh to ensure visibility
        this.createMesh();
    }

    createMesh() {
        const width = this.size.width * this.world.tileSize;
        const depth = this.size.height * this.world.tileSize;

        // Mesh is already created in the constructor
        // Just clear any existing children
        while (this.mesh.children.length > 0) {
            this.mesh.remove(this.mesh.children[0]);
        }

        // Fallback to loading it ourselves - try direct paths
        const spritePath = '/assets/sprites/warehouse.png'; // Correct path in public directory

        this.textureLoader.load(spritePath,
            // Success callback
            (texture) => {
                console.log("Successfully loaded warehouse texture:", spritePath);
                // Use the helper method to create the sprite
                this._setupWarehouseSprite(texture, width, depth);
            },
            // Progress callback
            undefined,
            // Error callback - try alternative paths
            (error) => {
                console.warn("Error loading warehouse texture from primary path:", error);
            });

        // Position the warehouse on the terrain
        const worldPos = this.world.getWorldPosition(this.position.x, this.position.y);
        const terrainHeight = this.world.terrain[this.position.y][this.position.x].height;

        // Place the warehouse at the correct position - elevated higher than the terrain
        this.mesh.position.set(
            worldPos.x + width / 2,
            0,  // Slightly elevated for better visibility
            worldPos.z + depth / 2
        );

        console.log(`Warehouse placed at world position: (${this.mesh.position.x}, ${this.mesh.position.y}, ${this.mesh.position.z})`);
        console.log(`Terrain height at position: ${terrainHeight}`);

        // Name the mesh for raycasting
        this.mesh.name = `building_${this.type}_${this.position.x}_${this.position.y}`;

        // Mark this as a building for raycasting
        this.mesh.userData.isBuilding = true;

        return this.mesh;
    }

    // Helper method to create the sprite with a loaded texture
    _setupWarehouseSprite(texture, width, depth) {
        this.textureLoaded = true;
        console.log("Setting up warehouse sprite with texture:", texture);

        // Calculate sprite size based on image aspect ratio if available
        let imageAspect = 1;
        if (texture.image && texture.image.width && texture.image.height) {
            imageAspect = texture.image.width / texture.image.height;
            console.log(`Texture dimensions: ${texture.image.width}x${texture.image.height}, aspect ratio: ${imageAspect}`);
        } else {
            console.warn("Texture loaded but image dimensions not available");
        }

        // Make sprite exactly match the 2x2 grid size
        const spriteHeight = depth; // Exactly 2 grid cells tall
        const spriteWidth = width; // Exactly 2 grid cells wide

        // Create billboard sprite material with explicit settings for visibility
        const spriteMaterial = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            alphaTest: 0.01, // Lower value to ensure the sprite is visible
            depthTest: true, // Enable depth testing for proper z-ordering
            depthWrite: true, // Enable depth writing
            sizeAttenuation: true, // Enable size attenuation for proper scaling
            color: 0xffffff // Ensure full brightness
        });

        // Create the sprite
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.scale.set(spriteWidth, spriteHeight, 1);

        // Position exactly at the center and above the base
        sprite.position.set(0, spriteHeight / 4, 0);
        this.mesh.add(sprite);

        // Remove the fallback mesh - we'll use the sprite only
        // Just add a small base for collision detection
        // const baseGeometry = new THREE.BoxGeometry(width, 0.5, depth);
        // const baseMaterial = new THREE.MeshBasicMaterial({
        //     color: 0x333333,
        //     transparent: true,
        //     opacity: 0.1
        // });
        // const base = new THREE.Mesh(baseGeometry, baseMaterial);
        // base.position.y = 0.25; // Half its height
        // this.mesh.add(base);

        // // Add a simple shadow plane beneath the building
        const shadowGeometry = new THREE.PlaneGeometry(width, depth);
        const shadowMaterial = new THREE.MeshBasicMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0.3,
            depthWrite: false
        });

        const shadow = new THREE.Mesh(shadowGeometry, shadowMaterial);
        shadow.rotation.x = -Math.PI / 2; // Lay flat on the ground
        shadow.position.y = -0.01; // Slightly above the terrain to prevent z-fighting
        this.mesh.add(shadow);

        console.log("Warehouse sprite created successfully");
    }

    // Override methods specific to warehouse
    update() {
        // Warehouse doesn't produce anything, so override default behavior

        // If we want the sprite to always face the camera (billboarding)
        // we could add that logic here, but THREE.Sprite already does this automatically
    }
}