import * as THREE from 'three';
import { Building } from '../Building.js';
import { BuildingType } from '../../utils/Enums.js';

export class Woodcutter extends Building {
    constructor(world, x, y) {
        super(world, x, y, BuildingType.WOODCUTTER);

        // Woodcutter is a 1x1 building
        this.size = { width: 1, height: 1 };

        // Create a group for the mesh immediately
        this.mesh = new THREE.Group();

        // Load the sprite texture
        this.textureLoaded = false;
        this.textureLoader = new THREE.TextureLoader();

        console.log(`Woodcutter initialized at grid position: ${x}, ${y}`);

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

        // Path to the woodcutter sprite
        const spritePath = '/assets/sprites/woodcutter.png';

        this.textureLoader.load(spritePath,
            // Success callback
            (texture) => {
                console.log("Successfully loaded woodcutter texture:", spritePath);
                // Use the helper method to create the sprite
                this._setupWoodcutterSprite(texture, width, depth);
            },
            // Progress callback
            undefined,
            // Error callback
            (error) => {
                console.warn("Error loading woodcutter texture:", error);
                // Create a fallback mesh if texture loading fails
                this._createFallbackMesh(width, depth);
            });

        // Position the woodcutter on the terrain
        const worldPos = this.world.getWorldPosition(this.position.x, this.position.y);
        const terrainHeight = this.world.terrain[this.position.y][this.position.x].height;

        // Place the woodcutter at the correct position
        this.mesh.position.set(
            worldPos.x + width / 2,
            terrainHeight,  // On the terrain
            worldPos.z + depth / 2
        );

        console.log(`Woodcutter placed at world position: (${this.mesh.position.x}, ${this.mesh.position.y}, ${this.mesh.position.z})`);

        // Name the mesh for raycasting
        this.mesh.name = `building_${this.type}_${this.position.x}_${this.position.y}`;

        // Mark this as a building for raycasting
        this.mesh.userData.isBuilding = true;

        return this.mesh;
    }

    // Helper method to create the sprite with a loaded texture
    _setupWoodcutterSprite(texture, width, depth) {
        this.textureLoaded = true;
        console.log("Setting up woodcutter sprite with texture:", texture);

        // Calculate sprite size based on image aspect ratio if available
        let imageAspect = 1;
        if (texture.image && texture.image.width && texture.image.height) {
            imageAspect = texture.image.width / texture.image.height;
            console.log(`Texture dimensions: ${texture.image.width}x${texture.image.height}, aspect ratio: ${imageAspect}`);
        }

        // Create billboard sprite material
        const spriteMaterial = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            alphaTest: 0.01,
            depthTest: true,
            depthWrite: true,
            sizeAttenuation: true,
            color: 0xffffff
        });

        // Create the sprite
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.scale.set(width * 1.5, width * 1.5, 1); // Make sprite slightly larger for visibility

        // Position above the base
        sprite.position.set(0, width / 4, 0);
        this.mesh.add(sprite);

        // Add a shadow beneath the building
        const shadowGeometry = new THREE.PlaneGeometry(width, depth);
        const shadowMaterial = new THREE.MeshBasicMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0.3,
            depthWrite: false
        });

        const shadow = new THREE.Mesh(shadowGeometry, shadowMaterial);
        shadow.rotation.x = -Math.PI / 2; // Lay flat on the ground
        shadow.position.y = 0.01; // Slightly above the terrain to prevent z-fighting
        this.mesh.add(shadow);

        console.log("Woodcutter sprite created successfully");
    }

    // Create a fallback mesh if the texture cannot be loaded
    _createFallbackMesh(width, depth) {
        const height = 1.5;
        const geometry = new THREE.BoxGeometry(width, height, depth);
        const material = new THREE.MeshStandardMaterial({ color: 0x8B4513 }); // Brown color for wood

        const box = new THREE.Mesh(geometry, material);
        box.position.y = height / 2;
        this.mesh.add(box);

        console.log("Created fallback mesh for woodcutter");
    }
}