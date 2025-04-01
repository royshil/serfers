import * as THREE from 'three';
import { Settler } from '../Settler.js';
import { SettlerType, ResourceType } from '../../utils/Enums.js';
import { PathFinder } from '../../utils/PathFinding.js';

export class Porter extends Settler {
    constructor(world, x, y) {
        super(world, x, y, SettlerType.PORTER);

        // Porter-specific properties
        this.carriedResource = null;
        this.carriedAmount = 0;
        this.targetConstruction = null;
        this.resourceSprite = null;
        this.pathFinder = new PathFinder(world);

        // States for the porter's workflow
        this.state = 'IDLE'; // IDLE, FETCHING_RESOURCE, DELIVERING_RESOURCE
    }

    createMesh() {
        // Create a group for the porter and carried resources
        this.mesh = new THREE.Group();

        // Create the porter figure (blue cylinder) - larger size for visibility
        const geometry = new THREE.CylinderGeometry(0.3, 0.3, 1.2, 8);
        const material = new THREE.MeshStandardMaterial({ color: 0x0088FF }); // Bright blue for porters

        const figure = new THREE.Mesh(geometry, material);
        figure.position.y = 0.6; // Half the height of the taller cylinder
        this.mesh.add(figure);

        // Position the porter
        const worldPos = this.world.getWorldPosition(this.position.x, this.position.y);
        const terrainHeight = this.world.terrain[this.position.y][this.position.x].height;
        this.mesh.position.set(worldPos.x, terrainHeight + 0.1, worldPos.z); // Slightly above terrain

        // Name the mesh for raycasting
        this.mesh.name = `settler_${this.type}_${this.position.x}_${this.position.y}`;

        return this.mesh;
    }

    update() {
        // First handle movement if we're moving
        if (this.isMoving && this.targetPosition) {
            this._moveToTarget();
            return;
        }

        // Occasionally log the current state (for debugging)
        if (Math.random() < 0.005) {
            console.log(`Porter state: ${this.state}, carrying: ${this.carriedResource || 'nothing'}, target construction: ${this.targetConstruction ? 'yes' : 'no'}`);
        }

        // Handle states
        switch (this.state) {
            case 'IDLE':
                this._findConstructionInNeedOfResources();
                break;
            case 'FETCHING_RESOURCE':
                this._fetchResourceFromWarehouse();
                break;
            case 'DELIVERING_RESOURCE':
                this._deliverResourceToConstruction();
                break;
            default:
                // If we somehow get into an invalid state, reset to IDLE
                console.error(`Porter in invalid state: ${this.state}, resetting to IDLE`);
                this.state = 'IDLE';
                this.targetPosition = null;
                this.isMoving = false;
                this.path = [];
        }
    }

    _findConstructionInNeedOfResources() {
        // Find a construction site that needs resources
        const constructions = this.world.constructions.filter(construction => {
            return !construction._hasAllResources();
        });

        if (constructions.length > 0) {
            // Find the closest construction site
            let closestConstruction = null;
            let closestDistance = Infinity;

            // Prioritize the construction we were already working on (if it still exists)
            const existingConstruction = constructions.find(c => c === this.targetConstruction);
            if (existingConstruction) {
                closestConstruction = existingConstruction;
                console.log(`Porter continuing to work on existing construction`);
            } else {
                // Otherwise find the closest one
                for (const construction of constructions) {
                    const distance = Math.abs(this.position.x - construction.position.x) +
                        Math.abs(this.position.y - construction.position.y);

                    if (distance < closestDistance) {
                        closestDistance = distance;
                        closestConstruction = construction;
                    }
                }
            }

            // Target this construction
            this.targetConstruction = closestConstruction;

            // Determine what resource to fetch
            for (const [resourceType, required] of Object.entries(closestConstruction.requiredResources)) {
                const allocated = closestConstruction.allocatedResources[resourceType] || 0;

                if (allocated < required) {
                    // We need to fetch this resource
                    this.resourceToFetch = resourceType;
                    break;
                }
            }

            console.log(`Porter assigned to fetch ${this.resourceToFetch} for construction at ${this.targetConstruction.position.x}, ${this.targetConstruction.position.y}`);

            // Change state
            this.state = 'FETCHING_RESOURCE';
        } else {
            // No construction needs resources, wait a bit and check again
            setTimeout(() => {
                if (this.state === 'IDLE') {
                    this._findConstructionInNeedOfResources();
                }
            }, 2000);
        }
    }

    _fetchResourceFromWarehouse() {
        // Find the warehouse
        const warehouse = this.world.buildings.find(b => b.type === 'warehouse');

        if (!warehouse) {
            console.error('No warehouse found');
            this.state = 'IDLE';
            return;
        }

        // check if resource is still needed
        if (this.targetConstruction && this.targetConstruction._hasAllResources()) {
            console.log('Target construction has all resources, going back to idle');
            this.carriedResource = null;
            this.carriedAmount = 0;
            this._removeResourceSprite();
            this.state = 'IDLE';
            return;
        }

        // Check if we're close to the warehouse interaction point - using world coordinates and proximity detection
        const porterWorldPos = this.world.getWorldPosition(this.position.x, this.position.y);
        const warehouseWorldPos = this.world.getWorldPosition(
            warehouse.interactionPoint.x,
            warehouse.interactionPoint.y
        );

        const distance = Math.sqrt(
            Math.pow(porterWorldPos.x - warehouseWorldPos.x, 2) +
            Math.pow(porterWorldPos.z - warehouseWorldPos.z, 2)
        );

        // Debug output to help understand proximity calculation
        if (Math.random() < 0.01) { // Only log occasionally
            console.log(`Porter distance to warehouse: ${distance.toFixed(2)} vs threshold ${this.world.tileSize}`);
        }

        // Consider close enough if within 1 tile distance
        if (distance < this.world.tileSize * 2.1) { // Slightly increased detection range
            // Get resource from warehouse
            const resourceManager = this.world.game.resourceManager;

            if (resourceManager.getResource(this.resourceToFetch) > 0) {
                // Take 1 resource
                resourceManager.removeResource(this.resourceToFetch, 1);
                this.carriedResource = this.resourceToFetch;
                this.carriedAmount = 1;

                // Add resource sprite to porter
                this._addResourceSprite();

                // Change state
                this.state = 'DELIVERING_RESOURCE';

                console.log(`Porter picked up ${this.carriedResource}`);

                // Set target position to null to ensure proper movement
                this.targetPosition = null;
                this.isMoving = false;
                this.path = [];
            } else {
                // No resources available, wait for resources
                console.log(`Warehouse has no ${this.resourceToFetch} available`);

                // Check again after a delay
                setTimeout(() => {
                    if (this.state === 'FETCHING_RESOURCE') {
                        this._fetchResourceFromWarehouse();
                    }
                }, 2000);
            }
        } else {
            // Move to warehouse interaction point
            // const path = this.pathFinder.findPath(
            //     this.position.x, this.position.y,
            //     warehouse.interactionPoint.x, warehouse.interactionPoint.y
            // );
            const path = [];

            if (path.length > 0) {
                console.log(`Porter moving to warehouse along path of ${path.length} steps`);
                // Directly move to warehouse if path is too complex
                if (path.length > 10) {
                    console.log("Path too complex, taking direct route");
                    this.moveTo({ x: warehouse.interactionPoint.x, y: warehouse.interactionPoint.y });
                } else {
                    // Clear the current path before starting a new one
                    this.path = [];
                    this.followPath(path);
                }
            } else {
                console.log('No path to warehouse found, taking direct route');
                // Direct route as fallback
                this.targetPosition = null; // Clear any existing target
                this.moveTo({ x: warehouse.interactionPoint.x, y: warehouse.interactionPoint.y });
            }
        }
    }

    _deliverResourceToConstruction() {
        // Ensure the construction site still exists
        if (!this.targetConstruction || !this.world.constructions.includes(this.targetConstruction)) {
            console.log('Target construction no longer exists');
            this.carriedResource = null;
            this.carriedAmount = 0;
            this._removeResourceSprite();
            this.state = 'IDLE';
            return;
        }

        // Check if we're close to the construction site interaction point - using world coordinates and proximity detection
        const porterWorldPos = this.world.getWorldPosition(this.position.x, this.position.y);
        const constructionWorldPos = this.world.getWorldPosition(
            this.targetConstruction.interactionPoint.x,
            this.targetConstruction.interactionPoint.y
        );

        const distance = Math.sqrt(
            Math.pow(porterWorldPos.x - constructionWorldPos.x, 2) +
            Math.pow(porterWorldPos.z - constructionWorldPos.z, 2)
        );

        // Debug output to help understand proximity calculation
        if (Math.random() < 0.01) { // Only log occasionally
            console.log(`Porter distance to construction: ${distance.toFixed(2)} vs threshold ${this.world.tileSize}`);
        }

        // Consider close enough if within 1 tile distance (with a bit of buffer)
        if (distance < this.world.tileSize * 1.2) {
            // Deliver the resource
            this.targetConstruction.allocatedResources[this.carriedResource] =
                (this.targetConstruction.allocatedResources[this.carriedResource] || 0) + this.carriedAmount;

            console.log(`Porter delivered ${this.carriedAmount} ${this.carriedResource} to construction`);

            // Create resource sprite at construction site
            this._createResourceAtConstruction();

            // Reset carried resource
            this.carriedResource = null;
            this.carriedAmount = 0;
            this._removeResourceSprite();

            // Clear movement state to prevent getting stuck
            this.targetPosition = null;
            this.isMoving = false;
            this.path = [];

            // Check if construction still needs resources - if so, go directly to fetch more
            if (!this.targetConstruction._hasAllResources()) {
                console.log(`Construction still needs resources, going to fetch more`);

                // Store current construction to continue working on it
                const currentConstruction = this.targetConstruction;

                // Reset state to fetch resources from warehouse
                this.state = 'FETCHING_RESOURCE';

                // Give a small delay to ensure states don't change too quickly
                setTimeout(() => {
                    if (this.state === 'FETCHING_RESOURCE') {
                        this._fetchResourceFromWarehouse();
                    }
                }, 100);
            } else {
                console.log(`Construction has all needed resources, looking for other work`);
                // Reset target construction
                this.targetConstruction = null;
                // Back to idle state to find new work
                this.state = 'IDLE';
            }
        } else {
            // Move to construction site interaction point
            const path = this.pathFinder.findPath(
                this.position.x, this.position.y,
                this.targetConstruction.interactionPoint.x, this.targetConstruction.interactionPoint.y
            );

            if (path && path.length > 0) {
                console.log(`Porter moving to construction site along path of ${path.length} steps`);
                // Directly move to construction if path is too complex
                if (path.length > 10) {
                    console.log("Path too complex, taking direct route");
                    this.targetPosition = null; // Clear any existing target
                    this.moveTo({ x: this.targetConstruction.interactionPoint.x, y: this.targetConstruction.interactionPoint.y });
                } else {
                    // Clear the current path before starting a new one
                    this.path = [];
                    this.followPath(path);
                }
            } else {
                console.log('No path to construction site found, taking direct route');
                // Direct route as fallback
                this.targetPosition = null; // Clear any existing target
                this.moveTo({ x: this.targetConstruction.interactionPoint.x, y: this.targetConstruction.interactionPoint.y });
            }
        }
    }

    _addResourceSprite() {
        // Remove any existing resource sprite
        this._removeResourceSprite();

        // Load the appropriate resource sprite based on resource type
        const textureLoader = new THREE.TextureLoader();
        let spritePath;

        if (this.carriedResource === ResourceType.PLANK) {
            spritePath = '/assets/sprites/plank_carried.png';
        } else {
            // Default for other resources
            spritePath = '/assets/sprites/plank_carried.png';
        }

        textureLoader.load(spritePath, texture => {
            const spriteMaterial = new THREE.SpriteMaterial({
                map: texture,
                transparent: true,
                depthTest: true
            });

            const sprite = new THREE.Sprite(spriteMaterial);
            sprite.scale.set(0.5, 0.25, 1);
            sprite.position.set(0, 0.8, 0); // Position above the porter

            this.resourceSprite = sprite;
            this.mesh.add(sprite);
        });
    }

    _removeResourceSprite() {
        if (this.resourceSprite) {
            this.mesh.remove(this.resourceSprite);
            this.resourceSprite = null;
        }
    }

    _createResourceAtConstruction() {
        // Only handle planks for now
        if (this.carriedResource !== ResourceType.PLANK) return;

        const textureLoader = new THREE.TextureLoader();

        textureLoader.load('/assets/sprites/planks_on_ground.png', texture => {
            const spriteMaterial = new THREE.SpriteMaterial({
                map: texture,
                transparent: true,
                depthTest: true
            });

            const sprite = new THREE.Sprite(spriteMaterial);
            sprite.scale.set(0.8, 0.4, 1);

            // Create a random position near the construction site
            const offsetX = (Math.random() - 0.5) * 0.8;
            const offsetZ = (Math.random() - 0.5) * 0.8;

            const worldPos = this.world.getWorldPosition(
                this.targetConstruction.position.x,
                this.targetConstruction.position.y
            );

            // Position slightly above ground to avoid z-fighting
            sprite.position.set(worldPos.x + offsetX, 0.05, worldPos.z + offsetZ);

            // Add to scene for a while, then fade out
            this.world.scene.add(sprite);

            // Fade out after the construction is complete
            const checkInterval = setInterval(() => {
                // Check if construction is complete or no longer exists
                if (!this.world.constructions.includes(this.targetConstruction)) {
                    clearInterval(checkInterval);

                    // Fade out
                    let opacity = 1.0;
                    const fadeInterval = setInterval(() => {
                        opacity -= 0.05;
                        spriteMaterial.opacity = opacity;

                        if (opacity <= 0) {
                            clearInterval(fadeInterval);
                            this.world.scene.remove(sprite);
                        }
                    }, 100);
                }
            }, 1000);
        });
    }
}