import * as THREE from 'three';

export class Entity {
    constructor(world, x, y) {
        this.world = world;
        this.position = { x, y };
        this.mesh = null;
    }
    
    init() {
        // Abstract method to be implemented by subclasses
    }
    
    update() {
        // Abstract method to be implemented by subclasses
    }
    
    createMesh() {
        // Abstract method to be implemented by subclasses
    }
    
    destroy() {
        if (this.mesh) {
            this.world.scene.remove(this.mesh);
        }
    }
}