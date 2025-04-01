import * as THREE from 'three';
import { Settler } from '../Settler.js';
import { SettlerType } from '../../utils/Enums.js';
import { PathFinder } from '../../utils/PathFinding.js';

export class Builder extends Settler {
    constructor(world, x, y) {
        super(world, x, y, SettlerType.BUILDER);

        // Builder-specific properties
        this.targetConstruction = null;
        this.buildingTime = 5000; // 5 seconds of building time
        this.currentBuildingTime = 0;
        this.isBuilding = false;
        this.pathFinder = new PathFinder(world);

        // States
        this.state = 'IDLE'; // IDLE, MOVING_TO_CONSTRUCTION, BUILDING
    }

    createMesh() {
        // Create a group for the builder
        this.mesh = new THREE.Group();

        // Create the builder figure (orange cylinder) - larger size for visibility
        const geometry = new THREE.CylinderGeometry(0.3, 0.3, 1.2, 8);
        const material = new THREE.MeshStandardMaterial({ color: 0xFF6600 }); // Bright orange for builders

        const figure = new THREE.Mesh(geometry, material);
        figure.position.y = 0.6; // Half the height of the taller cylinder
        this.mesh.add(figure);

        // Position the builder
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

        // Handle states
        switch (this.state) {
            case 'IDLE':
                this._findConstructionToBuild();
                break;
            case 'MOVING_TO_CONSTRUCTION':
                this._moveToConstruction();
                break;
            case 'BUILDING':
                this._performBuilding();
                break;
        }
    }

    _findConstructionToBuild() {
        // Look for construction sites that have all resources and need building
        const readyConstructions = this.world.constructions.filter(construction => {
            return construction._hasAllResources() && construction.progress < 100;
        });

        if (readyConstructions.length > 0) {
            // Find the closest construction site
            let closestConstruction = null;
            let closestDistance = Infinity;

            for (const construction of readyConstructions) {
                const distance = Math.abs(this.position.x - construction.position.x) +
                    Math.abs(this.position.y - construction.position.y);

                if (distance < closestDistance) {
                    closestDistance = distance;
                    closestConstruction = construction;
                }
            }

            // Target this construction
            this.targetConstruction = closestConstruction;
            console.log(`Builder found construction to build at ${this.targetConstruction.position.x}, ${this.targetConstruction.position.y}`);

            // Change state
            this.state = 'MOVING_TO_CONSTRUCTION';
        } else {
            // No construction needs building, wait a bit and check again
            setTimeout(() => {
                if (this.state === 'IDLE') {
                    this._findConstructionToBuild();
                }
            }, 2000);
        }
    }

    _moveToConstruction() {
        // Ensure the construction site still exists
        if (!this.targetConstruction || !this.world.constructions.includes(this.targetConstruction)) {
            console.log('Target construction no longer exists');
            this.targetConstruction = null;
            this.state = 'IDLE';
            return;
        }

        // Check if we're close to the construction site interaction point - using world coordinates and proximity detection
        const builderWorldPos = this.world.getWorldPosition(this.position.x, this.position.y);
        const constructionWorldPos = this.world.getWorldPosition(
            this.targetConstruction.interactionPoint.x,
            this.targetConstruction.interactionPoint.y
        );

        const distance = Math.sqrt(
            Math.pow(builderWorldPos.x - constructionWorldPos.x, 2) +
            Math.pow(builderWorldPos.z - constructionWorldPos.z, 2)
        );

        // Consider close enough if within 1 tile distance
        if (distance < this.world.tileSize * 2) {
            // Start building
            this.state = 'BUILDING';
            this.isBuilding = true;
            this.currentBuildingTime = 0;
            console.log(`Builder starts building at ${this.position.x}, ${this.position.y}`);
            return;
        }

        // Find path to construction interaction point
        const path = this.pathFinder.findPath(
            this.position.x, this.position.y,
            this.targetConstruction.interactionPoint.x, this.targetConstruction.interactionPoint.y
        );

        if (path.length > 0) {
            console.log(`Builder moving to construction site along path of ${path.length} steps`);
            // Directly move to construction if path is too complex or nonexistent
            if (path.length > 10) {
                console.log("Path too complex, taking direct route");
                this.moveTo({ x: this.targetConstruction.interactionPoint.x, y: this.targetConstruction.interactionPoint.y });
            } else {
                this.followPath(path);
            }
        } else {
            console.log('No path to construction site found, taking direct route');
            // Direct route as fallback
            this.moveTo({ x: this.targetConstruction.interactionPoint.x, y: this.targetConstruction.interactionPoint.y });
        }
    }

    _performBuilding() {
        // Check if construction still exists
        if (!this.targetConstruction || !this.world.constructions.includes(this.targetConstruction)) {
            console.log('Target construction no longer exists');
            this.isBuilding = false;
            this.targetConstruction = null;
            this.state = 'IDLE';
            return;
        }

        // Update building time
        this.currentBuildingTime += 16.67; // Approx 1 frame at 60fps

        // Create building effect (particle animation)
        if (Math.random() < 0.1) { // Occasionally spawn particles
            this._createBuildingEffect();
        }

        // Check if building is complete
        if (this.currentBuildingTime >= this.buildingTime) {
            console.log('Builder finished construction');
            this.isBuilding = false;
            this.targetConstruction.progress = 100; // Mark as complete
            this.targetConstruction = null;
            this.state = 'IDLE';
        }
    }

    _createBuildingEffect() {
        // Create a simple particle effect to show building activity
        const geometry = new THREE.SphereGeometry(0.05, 8, 8);
        const material = new THREE.MeshBasicMaterial({
            color: Math.random() < 0.5 ? 0xFFFF00 : 0xFF0000, // Yellow or red sparks
            transparent: true,
            opacity: 0.8
        });

        const particle = new THREE.Mesh(geometry, material);

        // Position at the construction site with random offset
        const worldPos = this.world.getWorldPosition(
            this.targetConstruction.position.x,
            this.targetConstruction.position.y
        );

        const offsetX = (Math.random() - 0.5) * 0.8;
        const offsetY = Math.random() * 0.8 + 0.5; // Above ground
        const offsetZ = (Math.random() - 0.5) * 0.8;

        particle.position.set(
            worldPos.x + offsetX,
            offsetY,
            worldPos.z + offsetZ
        );

        // Add to scene
        this.world.scene.add(particle);

        // Animate and remove
        let life = 1.0;
        const animateInterval = setInterval(() => {
            life -= 0.05;

            // Move upward
            particle.position.y += 0.02;

            // Fade out
            material.opacity = life;

            if (life <= 0) {
                clearInterval(animateInterval);
                this.world.scene.remove(particle);
            }
        }, 50);
    }
}