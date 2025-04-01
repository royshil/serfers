import { ResourceType, BuildingType } from '../utils/Enums.js';
import { resourceNames, buildingNames, buildingCosts } from '../utils/Constants.js';

export class UIManager {
    constructor(game) {
        this.game = game;
        
        // UI elements
        this.resourcesPanel = document.getElementById('resources-panel');
        this.buildingPanel = document.getElementById('building-panel');
        this.warehousePanel = document.getElementById('warehouse-panel');
        this.constructionPanel = document.getElementById('construction-panel');
        this.buildMenuPanel = document.getElementById('build-menu-panel');
        
        // Currently selected building
        this.selectedBuilding = null;
        this.selectedConstruction = null;
        
        // Track if build menu is open
        this.buildMenuOpen = false;
        
        // Available buildings to build
        this.availableBuildings = [
            BuildingType.WOODCUTTER,
            // Add more building types as they become implemented
        ];
    }
    
    init() {
        // Initialize UI
        this._initResourcesPanel();
        this._initBuildMenu();
        
        // Add resource update listener
        this.game.resourceManager.addListener(this._updateResourcesPanel.bind(this));
        
        // Create construction panel if it doesn't exist
        if (!this.constructionPanel) {
            this.constructionPanel = document.createElement('div');
            this.constructionPanel.id = 'construction-panel';
            this.constructionPanel.className = 'hud-panel hidden';
            document.getElementById('hud').appendChild(this.constructionPanel);
        }
        
        // Create build menu panel if it doesn't exist
        if (!this.buildMenuPanel) {
            this.buildMenuPanel = document.createElement('div');
            this.buildMenuPanel.id = 'build-menu-panel';
            this.buildMenuPanel.className = 'hud-panel hidden';
            document.getElementById('hud').appendChild(this.buildMenuPanel);
        }
        
        // Remove any existing build button to avoid duplicates
        const existingButton = document.getElementById('build-button');
        if (existingButton) {
            existingButton.remove();
        }
        
        // Add a build button to the HUD
        const buildButton = document.createElement('button');
        buildButton.id = 'build-button';
        buildButton.className = 'hud-button';
        buildButton.textContent = 'Build (B)';
        buildButton.onclick = () => this.toggleBuildMenu();
        document.getElementById('hud').appendChild(buildButton);
        
        // Add keyboard shortcut for build menu
        document.addEventListener('keydown', (event) => {
            if (event.key === 'b' || event.key === 'B') {
                this.toggleBuildMenu();
            }
            
            // Add escape key to cancel building placement
            if (event.key === 'Escape' && this.game.world.buildingPlacementMode) {
                this.game.world.cancelBuildingPlacement();
            }
        });
        
        console.log('UI initialized with keyboard shortcuts');
    }
    
    // Initialize the build menu with available buildings
    _initBuildMenu() {
        if (!this.buildMenuPanel) {
            console.error('Build menu panel not found');
            return;
        }
        
        // Clear previous content
        this.buildMenuPanel.innerHTML = '<h3>Build</h3>';
        
        // Create a list of available buildings
        const buildingsList = document.createElement('div');
        buildingsList.className = 'buildings-list';
        
        this.availableBuildings.forEach(buildingType => {
            const buildingName = buildingNames[buildingType] || buildingType;
            
            // Create building item
            const buildingItem = document.createElement('div');
            buildingItem.className = 'building-item';
            buildingItem.setAttribute('data-type', buildingType);
            
            // Add building name
            const nameElement = document.createElement('div');
            nameElement.className = 'building-name';
            nameElement.textContent = buildingName;
            buildingItem.appendChild(nameElement);
            
            // Add building costs
            const costsElement = document.createElement('div');
            costsElement.className = 'building-costs';
            
            const costs = buildingCosts[buildingType];
            if (costs) {
                Object.entries(costs).forEach(([resource, amount]) => {
                    const resourceName = resourceNames[resource] || resource;
                    costsElement.innerHTML += `<div>${resourceName}: ${amount}</div>`;
                });
            }
            
            buildingItem.appendChild(costsElement);
            
            // Add click handler
            buildingItem.addEventListener('click', () => {
                this.selectBuildingToBuild(buildingType);
            });
            
            buildingsList.appendChild(buildingItem);
        });
        
        this.buildMenuPanel.appendChild(buildingsList);
        
        // Add close button
        const closeButton = document.createElement('button');
        closeButton.textContent = 'Close';
        closeButton.addEventListener('click', () => this.hideBuildMenu());
        this.buildMenuPanel.appendChild(closeButton);
    }
    
    _initResourcesPanel() {
        this.resourcesPanel.innerHTML = '<h3>Resources</h3>';
        const resources = this.game.resourceManager.getAllResources();
        
        for (const [type, amount] of Object.entries(resources)) {
            const resourceName = resourceNames[type] || type;
            this.resourcesPanel.innerHTML += `
                <div class="resource-item" data-type="${type}">
                    <span class="resource-name">${resourceName}:</span>
                    <span class="resource-amount">${amount}</span>
                </div>
            `;
        }
    }
    
    _updateResourcesPanel(resources) {
        for (const [type, amount] of Object.entries(resources)) {
            const resourceItem = this.resourcesPanel.querySelector(`.resource-item[data-type="${type}"]`);
            if (resourceItem) {
                const amountEl = resourceItem.querySelector('.resource-amount');
                amountEl.textContent = amount;
            }
        }
    }
    
    showBuildingPanel(building) {
        this.selectedBuilding = building;
        this.buildingPanel.classList.remove('hidden');
        
        // Clear previous content
        this.buildingPanel.innerHTML = '';
        
        // Add building info
        this.buildingPanel.innerHTML += `<h3>${building.name}</h3>`;
        
        // Add production info if applicable
        if (building.produces) {
            const resourceName = resourceNames[building.produces.type] || building.produces.type;
            this.buildingPanel.innerHTML += `
                <div class="building-production">
                    <div>Produces: ${resourceName}</div>
                    <div>Rate: ${building.produces.rate} per min</div>
                    <div>Status: ${building.isProducing ? 'Working' : 'Idle'}</div>
                </div>
            `;
        }
        
        // Add storage info if applicable
        if (building.type === 'warehouse') {
            const warehouseButton = document.createElement('button');
            warehouseButton.textContent = 'Show Storage';
            warehouseButton.addEventListener('click', () => this.showWarehousePanel());
            this.buildingPanel.appendChild(warehouseButton);
        }
        
        // Add upgrade button if applicable
        if (building.canUpgrade) {
            const upgradeButton = document.createElement('button');
            upgradeButton.textContent = 'Upgrade';
            upgradeButton.addEventListener('click', () => this._upgradeBuilding(building));
            this.buildingPanel.appendChild(upgradeButton);
        }
        
        // Add close button
        const closeButton = document.createElement('button');
        closeButton.textContent = 'Close';
        closeButton.addEventListener('click', () => this.hideBuildingPanel());
        this.buildingPanel.appendChild(closeButton);
    }
    
    hideBuildingPanel() {
        this.selectedBuilding = null;
        this.buildingPanel.classList.add('hidden');
    }
    
    showWarehousePanel() {
        this.warehousePanel.classList.remove('hidden');
        
        // Clear previous content
        this.warehousePanel.innerHTML = '';
        
        // Add warehouse info
        this.warehousePanel.innerHTML += '<h3>Warehouse Storage</h3>';
        
        // Add resources list
        const resources = this.game.resourceManager.getAllResources();
        
        const resourcesList = document.createElement('div');
        resourcesList.className = 'warehouse-resources';
        
        for (const [type, amount] of Object.entries(resources)) {
            const resourceName = resourceNames[type] || type;
            resourcesList.innerHTML += `
                <div class="warehouse-resource-item">
                    <span class="resource-name">${resourceName}:</span>
                    <span class="resource-amount">${amount}</span>
                </div>
            `;
        }
        
        this.warehousePanel.appendChild(resourcesList);
        
        // Add close button
        const closeButton = document.createElement('button');
        closeButton.textContent = 'Close';
        closeButton.addEventListener('click', () => this.hideWarehousePanel());
        this.warehousePanel.appendChild(closeButton);
    }
    
    hideWarehousePanel() {
        this.warehousePanel.classList.add('hidden');
    }
    
    // Show the construction panel for a selected construction site
    showConstructionPanel(construction) {
        this.selectedConstruction = construction;
        
        // Hide any other panels
        this.hideBuildingPanel();
        this.hideWarehousePanel();
        this.hideBuildMenu();
        
        if (!this.constructionPanel) {
            console.error('Construction panel not found');
            return;
        }
        
        this.constructionPanel.classList.remove('hidden');
        
        // Clear previous content
        this.constructionPanel.innerHTML = '';
        
        // Add construction info
        const buildingName = buildingNames[construction.targetBuildingType] || 'Building';
        this.constructionPanel.innerHTML += `<h3>${buildingName} Construction</h3>`;
        
        // Add progress bar
        const progressContainer = document.createElement('div');
        progressContainer.className = 'construction-progress-container';
        
        const progressBar = document.createElement('div');
        progressBar.className = 'construction-progress-bar';
        progressBar.style.width = `${construction.progress}%`;
        
        const progressText = document.createElement('div');
        progressText.className = 'construction-progress-text';
        progressText.textContent = `${Math.floor(construction.progress)}%`;
        
        progressContainer.appendChild(progressBar);
        progressContainer.appendChild(progressText);
        this.constructionPanel.appendChild(progressContainer);
        
        // Add resource requirements
        const resourcesElement = document.createElement('div');
        resourcesElement.className = 'construction-resources';
        resourcesElement.innerHTML = '<h4>Required Resources:</h4>';
        
        Object.entries(construction.requiredResources).forEach(([resource, amount]) => {
            const resourceName = resourceNames[resource] || resource;
            const allocated = construction.allocatedResources[resource] || 0;
            
            resourcesElement.innerHTML += `
                <div class="resource-requirement">
                    <span class="resource-name">${resourceName}:</span>
                    <span class="resource-amount">${allocated}/${amount}</span>
                </div>
            `;
        });
        
        this.constructionPanel.appendChild(resourcesElement);
        
        // Add close button
        const closeButton = document.createElement('button');
        closeButton.textContent = 'Close';
        closeButton.addEventListener('click', () => this.hideConstructionPanel());
        this.constructionPanel.appendChild(closeButton);
        
        // Update the panel every 10 frames to show progress
        this.constructionUpdateInterval = setInterval(() => {
            if (this.selectedConstruction) {
                const progressBar = this.constructionPanel.querySelector('.construction-progress-bar');
                const progressText = this.constructionPanel.querySelector('.construction-progress-text');
                
                if (progressBar && progressText) {
                    progressBar.style.width = `${this.selectedConstruction.progress}%`;
                    progressText.textContent = `${Math.floor(this.selectedConstruction.progress)}%`;
                }
                
                // Update resource allocation display
                const resourceElements = this.constructionPanel.querySelectorAll('.resource-requirement');
                
                Object.entries(this.selectedConstruction.requiredResources).forEach(([resource, amount], index) => {
                    if (index < resourceElements.length) {
                        const allocated = this.selectedConstruction.allocatedResources[resource] || 0;
                        const amountElement = resourceElements[index].querySelector('.resource-amount');
                        if (amountElement) {
                            amountElement.textContent = `${allocated}/${amount}`;
                        }
                    }
                });
            }
        }, 100);
    }
    
    hideConstructionPanel() {
        if (this.constructionUpdateInterval) {
            clearInterval(this.constructionUpdateInterval);
            this.constructionUpdateInterval = null;
        }
        
        this.selectedConstruction = null;
        
        if (this.constructionPanel) {
            this.constructionPanel.classList.add('hidden');
        }
    }
    
    // Toggle the build menu
    toggleBuildMenu() {
        console.log('Toggle build menu called. Current state:', this.buildMenuOpen);
        if (this.buildMenuOpen) {
            this.hideBuildMenu();
        } else {
            this.showBuildMenu();
        }
    }
    
    showBuildMenu() {
        // Hide other panels
        this.hideBuildingPanel();
        this.hideWarehousePanel();
        this.hideConstructionPanel();
        
        // Make sure panel exists and is properly initialized
        if (!this.buildMenuPanel) {
            this.buildMenuPanel = document.getElementById('build-menu-panel');
            if (!this.buildMenuPanel) {
                console.error('Build menu panel not found in DOM');
                return;
            }
        }
        
        // Re-initialize menu content
        this._initBuildMenu();
        
        // Show build menu
        this.buildMenuPanel.classList.remove('hidden');
        this.buildMenuOpen = true;
        console.log('Build menu shown');
    }
    
    hideBuildMenu() {
        if (this.buildMenuPanel) {
            this.buildMenuPanel.classList.add('hidden');
            this.buildMenuOpen = false;
            console.log('Build menu hidden');
        }
    }
    
    // Select a building to place
    selectBuildingToBuild(buildingType) {
        // Get costs for the selected building
        const costs = buildingCosts[buildingType];
        
        // Check if we have enough resources
        if (!this.game.resourceManager.hasResources(costs)) {
            console.log('Not enough resources to build');
            // TODO: Show error message
            return;
        }
        
        // Start building placement mode
        this.game.world.startBuildingPlacement(buildingType);
        
        // Hide the build menu after selection
        this.hideBuildMenu();
        
        // Show placement instructions
        this._showPlacementInstructions(buildingType);
    }
    
    // Show a floating message with placement instructions
    _showPlacementInstructions(buildingType) {
        const buildingName = buildingNames[buildingType] || 'Building';
        
        // Create a message element
        const message = document.createElement('div');
        message.className = 'placement-instructions';
        message.textContent = `Click on a valid grass tile to place ${buildingName}. Press Escape to cancel.`;
        
        // Add to HUD
        document.getElementById('hud').appendChild(message);
        
        // Remove after 5 seconds
        setTimeout(() => {
            message.remove();
        }, 5000);
        
        // Add escape key handler to cancel placement
        const escHandler = (event) => {
            if (event.key === 'Escape') {
                this.game.world.cancelBuildingPlacement();
                document.removeEventListener('keydown', escHandler);
                message.remove();
            }
        };
        
        document.addEventListener('keydown', escHandler);
    }
    
    _upgradeBuilding(building) {
        // Check if we have resources for upgrade
        if (this.game.resourceManager.hasResources(building.upgradeCost)) {
            // Consume resources
            this.game.resourceManager.consumeResources(building.upgradeCost);
            
            // Upgrade building
            building.upgrade();
            
            // Update UI
            this.showBuildingPanel(building);
        } else {
            console.log('Not enough resources for upgrade');
            // TODO: Show error message to user
        }
    }
}