import { ResourceType } from '../utils/Enums.js';

export class ResourceManager {
    constructor() {
        // Initialize resources with starting values
        this.resources = {
            [ResourceType.WOOD]: 20,
            [ResourceType.STONE]: 10,
            [ResourceType.IRON_ORE]: 0,
            [ResourceType.IRON]: 0,
            [ResourceType.PLANK]: 10,
            [ResourceType.WHEAT]: 0,
            [ResourceType.FLOUR]: 0,
            [ResourceType.BREAD]: 10,
            [ResourceType.MEAT]: 5
        };
        
        this.listeners = [];
    }
    
    getResource(type) {
        return this.resources[type] || 0;
    }
    
    addResource(type, amount) {
        if (!this.resources[type]) {
            this.resources[type] = 0;
        }
        
        this.resources[type] += amount;
        this._notifyListeners();
        return true;
    }
    
    removeResource(type, amount) {
        if (!this.resources[type] || this.resources[type] < amount) {
            return false;
        }
        
        this.resources[type] -= amount;
        this._notifyListeners();
        return true;
    }
    
    // Consume a single resource of a specific type (used for construction)
    consumeResource(type, amount) {
        return this.removeResource(type, amount);
    }
    
    hasResources(requirements) {
        for (const [type, amount] of Object.entries(requirements)) {
            if (!this.resources[type] || this.resources[type] < amount) {
                return false;
            }
        }
        
        return true;
    }
    
    consumeResources(requirements) {
        if (!this.hasResources(requirements)) {
            return false;
        }
        
        for (const [type, amount] of Object.entries(requirements)) {
            this.resources[type] -= amount;
        }
        
        this._notifyListeners();
        return true;
    }
    
    addListener(callback) {
        this.listeners.push(callback);
    }
    
    removeListener(callback) {
        this.listeners = this.listeners.filter(listener => listener !== callback);
    }
    
    _notifyListeners() {
        for (const listener of this.listeners) {
            listener(this.resources);
        }
    }
    
    getAllResources() {
        return { ...this.resources };
    }
}