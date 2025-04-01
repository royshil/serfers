import * as THREE from 'three';
import { TerrainType, VisibilityState, BuildingType, SettlerType } from '../utils/Enums.js';
import { Warehouse } from '../entities/buildings/Warehouse.js';
import { Woodcutter } from '../entities/buildings/Woodcutter.js';
import { Construction } from '../entities/buildings/Construction.js';
import { Porter } from '../entities/settlers/Porter.js';
import { Builder } from '../entities/settlers/Builder.js';
import * as MapGen from '../utils/MapGen.js';
import { FOG_OF_WAR, buildingCosts } from '../utils/Constants.js';

export class World {
    constructor(game) {
        this.game = game;
        this.scene = game.scene;

        // World settings - massive world
        this.size = { width: 500, height: 500 };
        this.tileSize = 2;

        // Texture loader for terrain sprites
        this.textureLoader = new THREE.TextureLoader();
        this.textures = {}; // Cache for loaded textures

        // World data
        this.terrain = [];
        this.buildings = [];
        this.settlers = [];
        this.constructions = []; // Track buildings under construction

        // Fog of War
        this.fogOfWar = [];
        this.fogOfWarMesh = null;

        // Raycaster for mouse interaction
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        // Building placement mode
        this.buildingPlacementMode = false;
        this.buildingTypeToPlace = null;
        this.placementPreviewMesh = null;
        this.placementValid = false;

        // Bind methods
        this._onMouseMove = this._onMouseMove.bind(this);
        this._onClick = this._onClick.bind(this);
    }

    init() {
        // Load terrain textures first
        this._loadTerrainTextures(() => {
            // Initialize terrain grid
            this._initTerrain();

            // Initialize fog of war
            this._initFogOfWar();

            // Add starting buildings
            this._addStartingBuildings();

            // Add grass sprites
            this._addGrassSprites();

            // Update fog of war for starting area
            if (FOG_OF_WAR.ENABLED) {
                this._updateFogOfWar();
            }
        });

        // Add event listeners for mouse interaction
        window.addEventListener('mousemove', this._onMouseMove);
        window.addEventListener('click', this._onClick);

        console.log('World initialized');
    }

    // Load all terrain textures
    _loadTerrainTextures(callback) {
        const texturesToLoad = [
            // Grass textures with various path formats - trying direct paths first for more reliability
            { name: 'grass1', path: '/assets/textures/grass1.png' }, // New grass texture
            { name: 'grass2', path: '/assets/textures/grass2.png' }, // New grass texture
            { name: 'grass3', path: '/assets/textures/grass3.png' }, // New grass texture
            { name: 'grass4', path: '/assets/textures/grass4.png' }, // New grass texture
            { name: 'grass5', path: '/assets/textures/grass5.png' }, // New grass texture
            { name: 'grass6', path: '/assets/textures/grass6.png' }, // New grass texture
            { name: 'grass7', path: '/assets/textures/grass7.png' }, // New grass texture
            { name: 'grass8', path: '/assets/textures/grass8.png' }, // New grass texture
            { name: 'grass9', path: '/assets/textures/grass9.png' }, // New grass texture
            { name: 'grass10', path: '/assets/textures/grass10.png' }, // New grass texture

            // Tree textures for forest areas
            { name: 'tree1', path: '/assets/sprites/tree1.png' },
            { name: 'tree2', path: '/assets/sprites/tree2.png' },
            { name: 'tree3', path: '/assets/sprites/tree3.png' },
            { name: 'tree4', path: '/assets/sprites/tree4.png' },
            { name: 'tree5', path: '/assets/sprites/tree5.png' },
            { name: 'tree6', path: '/assets/sprites/tree6.png' },
            { name: 'tree7', path: '/assets/sprites/tree7.png' },
            { name: 'tree8', path: '/assets/sprites/tree8.png' },
            { name: 'tree9', path: '/assets/sprites/tree9.png' },
            { name: 'tree10', path: '/assets/sprites/tree10.png' },
        ];

        let loadedCount = 0;
        const totalToLoad = texturesToLoad.length;

        texturesToLoad.forEach(texture => {
            this.textureLoader.load(
                texture.path,
                (loadedTexture) => {
                    // Store the loaded texture
                    this.textures[texture.name] = loadedTexture;
                    loadedCount++;

                    console.log(`Loaded texture: ${texture.name} from ${texture.path}`);

                    // If all textures are loaded, call the callback
                    if (loadedCount === totalToLoad) {
                        console.log('All terrain textures loaded');
                        callback();
                    }
                },
                undefined, // progress callback
                (error) => {
                    console.error(`Error loading texture ${texture.name}:`, error);
                    loadedCount++;

                    // Continue even if texture loading fails
                    if (loadedCount === totalToLoad) {
                        console.log('Completed terrain texture loading with some errors');
                        callback();
                    }
                }
            );
        });
    }

    update() {
        // Update all settlers
        for (const settler of this.settlers) {
            settler.update();
        }

        // Update all buildings
        for (const building of this.buildings) {
            building.update();
        }

        // Update all constructions
        for (const construction of this.constructions) {
            construction.update();
        }

        // Update building placement preview if in placement mode
        if (this.buildingPlacementMode) {
            this._updatePlacementPreview();
        }

        // Update fog of war if enabled - uncomment when needed
        // Currently updating only when buildings are added
        // if (FOG_OF_WAR.ENABLED) {
        //     this._updateFogOfWar();
        // }
    }

    _initTerrain() {
        console.log("Generating terrain...");

        // Create a more detailed terrain geometry
        const gridGeometry = new THREE.PlaneGeometry(
            this.size.width * this.tileSize,
            this.size.height * this.tileSize,
            this.size.width,
            this.size.height
        );
        gridGeometry.rotateX(-Math.PI / 2); // Make it horizontal

        // Get position attribute for modifying heights
        const position = gridGeometry.attributes.position;

        // Arrays to store colors and updated positions
        const colors = [];
        const vertices = [];

        // Generate terrain using MapGen
        console.log("Using MapGen to create terrain...");
        this.terrain = MapGen.generateTileMap(this.size.width, this.size.height);

        // Update vertex positions and colors based on terrain data
        for (let i = 0; i < position.count; i++) {
            const x = Math.floor(i % (this.size.width + 1));
            const y = Math.floor(i / (this.size.width + 1));

            // Get current vertex
            const vertex = new THREE.Vector3(
                position.getX(i),
                position.getY(i),
                position.getZ(i)
            );

            // If within bounds, modify based on terrain height
            if (x < this.size.width && y < this.size.height) {
                const terrain = this.terrain[y][x];

                // Modify Y coordinate (height)
                // vertex.y = terrain.height;

                // Assign color based on terrain type
                switch (terrain) {
                    case TerrainType.GRASS:
                        // Varied green for grass, brighter at higher elevations
                        colors.push(0.21, 0.85, 0.21);
                        break;

                    case TerrainType.WATER:
                        colors.push(0.0, 0.3, 0.5);
                        break;

                    case TerrainType.SAND:
                        // Sandy beaches - tan color
                        colors.push(0.76, 0.7, 0.5);
                        break;

                    case TerrainType.FOREST:
                        // Darker green for forests
                        colors.push(0.0, 0.35, 0.0);
                        break;

                    case TerrainType.MOUNTAIN:
                        // Rocky mountains - gray with subtle variations
                        colors.push(0.4, 0.4, 0.4);
                        break;

                    case TerrainType.SNOW:
                        // Snow-capped peaks - white with slight blue tint
                        colors.push(0.9, 0.9, 1.0);
                        break;

                    case TerrainType.STONE:
                        // Stone/rock - grey brown
                        colors.push(0.5, 0.45, 0.4);
                        break;

                    default:
                        colors.push(1, 1, 1); // White
                        break;
                }
            } else {
                // Edge vertices - set to lowest surrounding height
                const nearX = Math.min(Math.max(x, 0), this.size.width - 1);
                const nearY = Math.min(Math.max(y, 0), this.size.height - 1);

                if (this.terrain[nearY] && this.terrain[nearY][nearX]) {
                    vertex.y = this.terrain[nearY][nearX].height;
                }

                colors.push(0.8, 0.8, 0.8); // Light grey for edges
            }

            // Store updated position
            position.setXYZ(i, vertex.x, vertex.y, vertex.z);
        }

        // Update the geometry after modifying positions
        position.needsUpdate = true;
        gridGeometry.computeVertexNormals(); // Recalculate normals for proper lighting

        // Set vertex colors
        gridGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

        // Create grid material with basic material (unaffected by lighting)
        const gridMaterial = new THREE.MeshBasicMaterial({
            vertexColors: true,
            side: THREE.DoubleSide
        });

        // Create grid mesh
        const gridMesh = new THREE.Mesh(gridGeometry, gridMaterial);
        gridMesh.name = 'terrain';

        // Allow terrain to receive shadows
        gridMesh.receiveShadow = true;
        gridMesh.castShadow = true;

        // Position the grid so (0,0) is at the bottom-left, and the center of the grid is at (0,0,0) in world space
        gridMesh.position.x = 0;
        gridMesh.position.z = 0;

        this.scene.add(gridMesh);

        // Add grid helper for reference (now at water level)
        // For a massive world, we need fewer grid lines for performance
        const gridSize = this.size.width * this.tileSize;
        const gridDivisions = 50; // Just 50 grid lines instead of hundreds

        const gridHelper = new THREE.GridHelper(
            gridSize,
            gridDivisions,
            0x000000, // Black color for main grid lines
            0x444444  // Darker gray color for secondary grid lines
        );
        gridHelper.position.y = 2.5; // At water level
        gridHelper.position.x = 0;
        gridHelper.position.z = 0;
        gridHelper.material.opacity = 0.2; // More transparent for less visual clutter
        gridHelper.material.transparent = true;
        this.scene.add(gridHelper);

        // Store the terrain mesh for later reference
        this.terrainMesh = gridMesh;

        console.log("Terrain generation complete!");
    }

    // Initialize fog of war system
    _initFogOfWar() {
        if (!FOG_OF_WAR.ENABLED) return;

        console.log("Initializing fog of war...");

        // Create a fog of war overlay
        const fogGeometry = new THREE.PlaneGeometry(
            this.size.width * this.tileSize,
            this.size.height * this.tileSize,
            this.size.width,
            this.size.height
        );
        fogGeometry.rotateX(-Math.PI / 2); // Make it horizontal like the terrain

        // Create fog material - black with transparency
        const fogMaterial = new THREE.MeshBasicMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide,
            depthWrite: false // Don't write to depth buffer so it doesn't interfere with raycasting
        });

        // Create fog mesh
        this.fogOfWarMesh = new THREE.Mesh(fogGeometry, fogMaterial);
        this.fogOfWarMesh.name = 'fogOfWar';

        // Position the fog slightly above the terrain to avoid z-fighting
        this.fogOfWarMesh.position.x = 0;
        this.fogOfWarMesh.position.y = 0.1; // Just slightly above terrain
        this.fogOfWarMesh.position.z = 0;

        // Add to scene
        this.scene.add(this.fogOfWarMesh);

        // Initialize fog of war data
        for (let y = 0; y < this.size.height; y++) {
            this.fogOfWar[y] = [];
            for (let x = 0; x < this.size.width; x++) {
                this.fogOfWar[y][x] = {
                    visible: false, // Is tile currently visible?
                    explored: false // Has tile been seen before?
                };
            }
        }

        console.log("Fog of war initialized");
    }

    // Update fog of war based on building positions
    _updateFogOfWar() {
        if (!FOG_OF_WAR.ENABLED || !this.fogOfWarMesh) return;

        // Get fog geometry
        const fogGeometry = this.fogOfWarMesh.geometry;
        const position = fogGeometry.attributes.position;

        // Create color array for vertex colors (black for fog, transparent for visible areas)
        const colors = [];

        // First, calculate which tiles are currently visible based on buildings
        // Reset visibility first
        for (let y = 0; y < this.size.height; y++) {
            for (let x = 0; x < this.size.width; x++) {
                this.terrain[y][x].visibility = this.fogOfWar[y][x].explored ?
                    VisibilityState.EXPLORED : VisibilityState.UNEXPLORED;
            }
        }

        // Then check each building's visibility radius
        for (const building of this.buildings) {
            const buildingType = building.type;
            const radius = FOG_OF_WAR.BUILDING_VISIBILITY_RADIUS[buildingType] ||
                FOG_OF_WAR.INITIAL_VISIBILITY_RADIUS;

            // Make tiles within radius visible
            this._revealArea(building.position.x, building.position.y, radius);
        }

        // Update color array based on visibility
        for (let i = 0; i < position.count; i++) {
            const x = Math.floor(i % (this.size.width + 1));
            const y = Math.floor(i / (this.size.width + 1));

            if (x < this.size.width && y < this.size.height) {
                const visibility = this.terrain[y][x].visibility;

                // Set color based on visibility state
                switch (visibility) {
                    case VisibilityState.VISIBLE:
                        // Fully visible - transparent
                        colors.push(0, 0, 0, 0); // RGBA (fully transparent)
                        break;
                    case VisibilityState.EXPLORED:
                        // Previously explored - semi-transparent dark
                        colors.push(0, 0, 0, 0.5); // RGBA (semi-transparent)
                        break;
                    case VisibilityState.UNEXPLORED:
                    default:
                        // Unexplored - solid black
                        colors.push(0, 0, 0, 1); // RGBA (black)
                        break;
                }
            } else {
                // Edge vertices - fully dark
                colors.push(0, 0, 0, 1);
            }
        }

        // Update the fog mesh with new colors
        fogGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 4));
        fogGeometry.attributes.color.needsUpdate = true;
    }

    // Reveal an area around a point (make tiles visible)
    _revealArea(centerX, centerY, radius) {
        const radiusSquared = radius * radius;

        // Check all tiles within a square, but apply a circular mask
        for (let y = centerY - radius; y <= centerY + radius; y++) {
            for (let x = centerX - radius; x <= centerX + radius; x++) {
                // Skip if out of bounds
                if (y < 0 || y >= this.size.height || x < 0 || x >= this.size.width) {
                    continue;
                }

                // Calculate squared distance
                const dx = x - centerX;
                const dy = y - centerY;
                const distanceSquared = dx * dx + dy * dy;

                // If within radius, make visible and mark as explored
                if (distanceSquared <= radiusSquared) {
                    this.terrain[y][x].visibility = VisibilityState.VISIBLE;
                    this.fogOfWar[y][x].visible = true;
                    this.fogOfWar[y][x].explored = true;
                }
            }
        }
    }

    _addStartingBuildings() {
        console.log("Finding suitable location for starting buildings...");

        // Always start at the exact center of the map
        let startX = Math.floor(this.size.width / 2);
        let startY = Math.floor(this.size.height / 2);

        console.log(`Starting at the center of the map: (${startX}, ${startY})`);

        // Force the center to be buildable - don't search for a natural spot
        let foundSuitableSpot = false;

        // For debugging only - to see if there's a naturally good spot nearby
        // This code will run but won't change our starting position
        const searchRadius = Math.min(this.size.width, this.size.height) / 4;
        for (let attempts = 0; attempts < 10 && !foundSuitableSpot; attempts++) {
            // Try random positions near the center
            const testX = Math.floor(startX + (Math.random() * 2 - 1) * searchRadius);
            const testY = Math.floor(startY + (Math.random() * 2 - 1) * searchRadius);

            // Check if this position and surrounding area is suitable
            if (this._isAreaSuitableForWarehouse(testX, testY, 3, 3)) {
                // Don't actually change startX/Y - just log for debugging
                console.log(`Found naturally suitable spot at ${testX}, ${testY}, but using center anyway`);
                foundSuitableSpot = true;
                break;
            }
        }

        // If no natural spot is found, force-create one
        if (!foundSuitableSpot) {
            console.log("No natural suitable spot found. Creating a flat area...");

            // Flatten and prepare a larger area centered exactly on the warehouse position
            // Since warehouse is at (startX-1, startY-1) and is 2x2, we center a 30x30 area around it
            this._flattenArea(startX - 15, startY - 15, 30, 30, 1.8); // Lower elevation to match new height scale
        }

        // Make sure a 3x3 area for the warehouse and immediate surroundings is buildable grass
        for (let y = startY - 1; y <= startY + 1; y++) {
            for (let x = startX - 1; x <= startX + 1; x++) {
                if (y >= 0 && y < this.size.height && x >= 0 && x < this.size.width) {
                    this.terrain[y][x].type = TerrainType.GRASS;
                    this.terrain[y][x].buildable = true;
                }
            }
        }

        // Create and add the warehouse exactly at the center of the map
        // For a 2x2 building, we place it so its center aligns with the map center
        const warehouseX = startX - 1; // Offset by 1 since warehouse is 2x2
        const warehouseY = startY - 1;

        // Create warehouse at the exact center
        const warehouse = new Warehouse(this, warehouseX, warehouseY);
        this.addBuilding(warehouse);

        console.log(`Warehouse placed at grid coordinates: (${warehouseX}, ${warehouseY})`);
        console.log(`Map center is at grid coordinates: (${startX}, ${startY})`);

        // Add initial settlers
        this._addStartingSettlers(warehouseX, warehouseY);


        console.log("Starting buildings added!");

        // Center the camera on the warehouse rather than the exact center
        // This ensures we're looking at the warehouse, which is slightly offset from center
        this._centerCameraOnStartingArea(startX - 1, startY - 1);
    }

    // Check if an area is suitable for building (flat enough, not water)
    _isAreaSuitableForWarehouse(startX, startY, width, height) {
        // Make sure the area is within the map bounds
        if (startX < 0 || startY < 0 ||
            startX + width > this.size.width ||
            startY + height > this.size.height) {
            return false;
        }

        // Check if the entire area is buildable and flat enough
        let baseHeight = null;
        let maxHeightDiff = 0.3; // Maximum allowable height difference

        for (let y = startY; y < startY + height; y++) {
            for (let x = startX; x < startX + width; x++) {
                const terrain = this.terrain[y][x];

                // Reject water or mountains
                if (terrain.type === TerrainType.WATER ||
                    terrain.type === TerrainType.MOUNTAIN) {
                    return false;
                }

                // Check height difference
                if (baseHeight === null) {
                    baseHeight = terrain.height;
                } else if (Math.abs(terrain.height - baseHeight) > maxHeightDiff) {
                    return false;
                }
            }
        }

        // Also check surrounding area to make sure it's not isolated on a tiny plateau
        const buffer = 2; // Check 2 tiles around the building area
        let accessibleTiles = 0;

        for (let y = startY - buffer; y < startY + height + buffer; y++) {
            for (let x = startX - buffer; x < startX + width + buffer; x++) {
                // Skip the building area itself
                if (x >= startX && x < startX + width && y >= startY && y < startY + height) {
                    continue;
                }

                // Check if this position is in bounds
                if (y >= 0 && y < this.size.height && x >= 0 && x < this.size.width) {
                    const terrain = this.terrain[y][x];

                    // Count buildable tiles that are close in height to our base
                    if (terrain.type === TerrainType.GRASS &&
                        Math.abs(terrain.height - baseHeight) < 1.0) {
                        accessibleTiles++;
                    }
                }
            }
        }

        // Ensure we have enough accessible tiles around (at least 50% of the perimeter)
        const requiredAccessible = (width + height) * 2;
        return accessibleTiles >= requiredAccessible;
    }

    // Flatten an area to a specific height
    _flattenArea(startX, startY, width, height, targetHeight) {
        // Clamp to map bounds
        const endX = Math.min(startX + width, this.size.width);
        const endY = Math.min(startY + height, this.size.height);
        const clampedStartX = Math.max(0, startX);
        const clampedStartY = Math.max(0, startY);

        console.log(`Flattening area from (${clampedStartX}, ${clampedStartY}) to (${endX}, ${endY}) at height ${targetHeight}`);

        // Flatten central area completely
        for (let y = clampedStartY; y < endY; y++) {
            for (let x = clampedStartX; x < endX; x++) {
                this.terrain[y][x].height = targetHeight;
                this.terrain[y][x].type = TerrainType.GRASS;
                this.terrain[y][x].buildable = true;
            }
        }

        // Create a gradual slope around the flattened area (for a natural look)
        const fadeDistance = 5; // Increased distance for a more gradual transition

        for (let fadeLevel = 1; fadeLevel <= fadeDistance; fadeLevel++) {
            // Calculate the height adjustment for this fade level
            const fadeFactor = 1 - (fadeLevel / (fadeDistance + 1));
            const heightAdjustment = (targetHeight - 1.0) * fadeFactor;

            // Process each side of the rectangle (top, right, bottom, left)
            // Top side
            for (let x = clampedStartX - fadeLevel; x < endX + fadeLevel; x++) {
                const y = clampedStartY - fadeLevel;
                if (y >= 0 && y < this.size.height && x >= 0 && x < this.size.width) {
                    // Blend with existing height
                    const originalHeight = this.terrain[y][x].height;
                    this.terrain[y][x].height = 1.0 + heightAdjustment;

                    // If it's not water, make it buildable grass
                    if (this.terrain[y][x].height >= 1.2) {
                        this.terrain[y][x].type = TerrainType.GRASS;
                        this.terrain[y][x].buildable = true;
                    }
                }
            }

            // Bottom side
            for (let x = clampedStartX - fadeLevel; x < endX + fadeLevel; x++) {
                const y = endY + fadeLevel - 1;
                if (y >= 0 && y < this.size.height && x >= 0 && x < this.size.width) {
                    const originalHeight = this.terrain[y][x].height;
                    this.terrain[y][x].height = 1.0 + heightAdjustment;

                    if (this.terrain[y][x].height >= 1.2) {
                        this.terrain[y][x].type = TerrainType.GRASS;
                        this.terrain[y][x].buildable = true;
                    }
                }
            }

            // Left side
            for (let y = clampedStartY - fadeLevel + 1; y < endY + fadeLevel - 1; y++) {
                const x = clampedStartX - fadeLevel;
                if (y >= 0 && y < this.size.height && x >= 0 && x < this.size.width) {
                    const originalHeight = this.terrain[y][x].height;
                    this.terrain[y][x].height = 1.0 + heightAdjustment;

                    if (this.terrain[y][x].height >= 1.2) {
                        this.terrain[y][x].type = TerrainType.GRASS;
                        this.terrain[y][x].buildable = true;
                    }
                }
            }

            // Right side
            for (let y = clampedStartY - fadeLevel + 1; y < endY + fadeLevel - 1; y++) {
                const x = endX + fadeLevel - 1;
                if (y >= 0 && y < this.size.height && x >= 0 && x < this.size.width) {
                    const originalHeight = this.terrain[y][x].height;
                    this.terrain[y][x].height = 1.0 + heightAdjustment;

                    if (this.terrain[y][x].height >= 1.2) {
                        this.terrain[y][x].type = TerrainType.GRASS;
                        this.terrain[y][x].buildable = true;
                    }
                }
            }
        }

        // After modifying terrain, we need to update the terrain mesh
        this._updateTerrainMesh();
    }

    // Update the terrain mesh to reflect changes in the terrain data
    _updateTerrainMesh() {
        // Find the terrain mesh
        const terrainMesh = this.scene.getObjectByName('terrain');
        if (!terrainMesh) return;

        // Get the position attribute
        const position = terrainMesh.geometry.attributes.position;

        // Update all vertex positions and colors
        const colors = [];

        for (let i = 0; i < position.count; i++) {
            const x = Math.floor(i % (this.size.width + 1));
            const y = Math.floor(i / (this.size.width + 1));

            if (x < this.size.width && y < this.size.height) {
                const terrain = this.terrain[y][x];

                // Update height
                position.setY(i, terrain.height);

                // Update color
                switch (terrain.type) {
                    case TerrainType.GRASS:
                        // Varied green for grass, brighter at higher elevations
                        const greenShade = 0.5 + (terrain.height / 8) * 0.4;
                        colors.push(0.1, greenShade, 0.1);
                        break;

                    case TerrainType.WATER:
                        // Deep water is darker blue, shallow water is lighter
                        if (terrain.height < 1.5) {
                            // Deep ocean - dark blue
                            colors.push(0.0, 0.0, 0.4);
                        } else {
                            // Shallow water - lighter blue
                            const blueShade = 0.3 + (terrain.height - 1.5);
                            colors.push(0.0, 0.3, blueShade);
                        }
                        break;

                    case TerrainType.SAND:
                        // Sandy beaches - tan color
                        colors.push(0.76, 0.7, 0.5);
                        break;

                    case TerrainType.FOREST:
                        // Darker green for forests
                        colors.push(0.0, 0.35, 0.0);
                        break;

                    case TerrainType.MOUNTAIN:
                        // Rocky mountains - gray with subtle variations
                        const greyShade = 0.4 + (terrain.height - 10) * 0.05;
                        colors.push(greyShade, greyShade, greyShade);
                        break;

                    case TerrainType.SNOW:
                        // Snow-capped peaks - white with slight blue tint
                        const snowBrightness = 0.8 + (terrain.height - 13) * 0.1;
                        colors.push(snowBrightness, snowBrightness, snowBrightness + 0.1);
                        break;

                    case TerrainType.STONE:
                        // Stone/rock - grey brown
                        colors.push(0.5, 0.45, 0.4);
                        break;

                    default:
                        colors.push(1, 1, 1); // White
                        break;
                }
            } else {
                // Edge vertices - match heights with closest edge tile
                const nearX = Math.min(Math.max(x, 0), this.size.width - 1);
                const nearY = Math.min(Math.max(y, 0), this.size.height - 1);

                if (this.terrain[nearY] && this.terrain[nearY][nearX]) {
                    position.setY(i, this.terrain[nearY][nearX].height);
                }

                colors.push(0.8, 0.8, 0.8);
            }
        }

        // Update position and colors
        position.needsUpdate = true;
        terrainMesh.geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

        // Recalculate normals
        terrainMesh.geometry.computeVertexNormals();
    }

    addBuilding(building) {
        this.buildings.push(building);

        // Mark tiles as occupied
        for (let y = building.position.y; y < building.position.y + building.size.height; y++) {
            for (let x = building.position.x; x < building.position.x + building.size.width; x++) {
                if (y >= 0 && y < this.size.height && x >= 0 && x < this.size.width) {
                    this.terrain[y][x].building = building;
                    this.terrain[y][x].buildable = false;
                }
            }
        }

        // Make sure the building has a mesh
        if (!building.mesh) {
            console.error("Building has no mesh!");
            return;
        }

        // Position the building properly on the terrain
        const worldPos = this.getWorldPosition(building.position.x, building.position.y);
        const terrainHeight = this.terrain[building.position.y][building.position.x].height;
        const width = building.size.width * this.tileSize;
        const depth = building.size.height * this.tileSize;

        // Set position on the terrain
        building.mesh.position.set(
            worldPos.x + width / 2,
            terrainHeight + 1,  // Elevated for visibility
            worldPos.z + depth / 2
        );

        console.log(`Building positioned at: (${building.mesh.position.x}, ${building.mesh.position.y}, ${building.mesh.position.z})`);

        // Add visual representation to the scene
        this.scene.add(building.mesh);

        // Update fog of war for new building
        if (FOG_OF_WAR.ENABLED) {
            this._updateFogOfWar();
        }
    }

    // Add a construction site
    addConstruction(construction) {
        this.constructions.push(construction);

        // Mark tiles as occupied
        for (let y = construction.position.y; y < construction.position.y + construction.size.height; y++) {
            for (let x = construction.position.x; x < construction.position.x + construction.size.width; x++) {
                if (y >= 0 && y < this.size.height && x >= 0 && x < this.size.width) {
                    this.terrain[y][x].building = construction;
                    this.terrain[y][x].buildable = false;
                }
            }
        }

        // Add visual representation to the scene
        this.scene.add(construction.mesh);

        // Update fog of war
        if (FOG_OF_WAR.ENABLED) {
            this._updateFogOfWar();
        }
    }

    // Complete construction and replace with actual building
    completeConstruction(construction) {
        // Remove construction from the list
        this.constructions = this.constructions.filter(c => c !== construction);

        // Create the actual building
        let newBuilding;

        switch (construction.targetBuildingType) {
            case BuildingType.WAREHOUSE:
                newBuilding = new Warehouse(this, construction.position.x, construction.position.y);
                break;
            case BuildingType.WOODCUTTER:
                newBuilding = new Woodcutter(this, construction.position.x, construction.position.y);
                break;
            // Add cases for other building types as they are implemented
            default:
                console.error(`Unknown building type: ${construction.targetBuildingType}`);
                return;
        }

        // Remove construction mesh from scene
        this.scene.remove(construction.mesh);

        // Add the new building
        this.addBuilding(newBuilding);
    }

    // Start building placement mode
    startBuildingPlacement(buildingType) {
        // Exit placement mode if already active
        if (this.buildingPlacementMode) {
            this.cancelBuildingPlacement();
        }

        this.buildingPlacementMode = true;
        this.buildingTypeToPlace = buildingType;

        // Create preview mesh based on building type
        this._createPlacementPreview();

        console.log(`Started building placement mode for ${buildingType}`);
    }

    // Cancel building placement mode
    cancelBuildingPlacement() {
        if (!this.buildingPlacementMode) return;

        this.buildingPlacementMode = false;
        this.buildingTypeToPlace = null;

        // Remove preview mesh
        if (this.placementPreviewMesh) {
            this.scene.remove(this.placementPreviewMesh);
            this.placementPreviewMesh = null;
        }

        console.log("Cancelled building placement mode");
    }

    // Create a preview mesh for building placement
    _createPlacementPreview() {
        // Determine building size
        const size = {
            width: this.buildingTypeToPlace === BuildingType.WAREHOUSE ? 2 : 1,
            height: this.buildingTypeToPlace === BuildingType.WAREHOUSE ? 2 : 1
        };

        const width = size.width * this.tileSize;
        const depth = size.height * this.tileSize;

        // Create a group for the preview mesh
        this.placementPreviewMesh = new THREE.Group();

        // Create base outline
        const outlineGeometry = new THREE.BoxGeometry(width, 0.1, depth);
        const validMaterial = new THREE.MeshBasicMaterial({
            color: 0x00FF00,
            transparent: true,
            opacity: 0.5
        });
        const invalidMaterial = new THREE.MeshBasicMaterial({
            color: 0xFF0000,
            transparent: true,
            opacity: 0.5
        });

        // Create the outline mesh with valid material initially
        this.previewOutline = new THREE.Mesh(outlineGeometry, validMaterial);
        this.previewOutline.position.y = 0.05; // Just above ground
        this.placementPreviewMesh.add(this.previewOutline);

        // Try to load the building sprite for preview
        let spritePath;
        switch (this.buildingTypeToPlace) {
            case BuildingType.WOODCUTTER:
                spritePath = '/assets/sprites/woodcutter.png';
                break;
            case BuildingType.WAREHOUSE:
                spritePath = '/assets/sprites/warehouse.png';
                break;
            default:
                // Default to construction sprite
                spritePath = '/assets/sprites/construction.png';
        }

        // Load the texture
        this.textureLoader.load(spritePath, (texture) => {
            // Create sprite material
            const spriteMaterial = new THREE.SpriteMaterial({
                map: texture,
                transparent: true,
                opacity: 0.7,
                depthTest: true
            });

            // Create sprite
            this.previewSprite = new THREE.Sprite(spriteMaterial);
            this.previewSprite.scale.set(width * 1.5, width * 1.5, 1);
            this.previewSprite.position.y = width / 2; // Float above the ground
            this.placementPreviewMesh.add(this.previewSprite);
        });

        // Add the preview to the scene
        this.scene.add(this.placementPreviewMesh);
    }

    // Update the placement preview position and validity
    _updatePlacementPreview() {
        if (!this.placementPreviewMesh) return;

        // Raycast to find mouse position on terrain
        this.raycaster.setFromCamera(this.mouse, this.game.camera);
        const intersects = this.raycaster.intersectObjects([this.scene.getObjectByName('terrain')]);

        if (intersects.length > 0) {
            const intersect = intersects[0];

            // Get grid position from world position
            const gridPos = this.getGridPosition(intersect.point.x, intersect.point.z);

            // Check if placement is valid
            this.placementValid = this._isPlacementValid(gridPos.x, gridPos.z);

            // Update outline color based on validity
            if (this.previewOutline) {
                this.previewOutline.material = this.placementValid ?
                    new THREE.MeshBasicMaterial({ color: 0x00FF00, transparent: true, opacity: 0.5 }) :
                    new THREE.MeshBasicMaterial({ color: 0xFF0000, transparent: true, opacity: 0.5 });
            }

            // Determine building size
            const size = {
                width: this.buildingTypeToPlace === BuildingType.WAREHOUSE ? 2 : 1,
                height: this.buildingTypeToPlace === BuildingType.WAREHOUSE ? 2 : 1
            };

            // Get world position for center of building area
            const worldPos = this.getWorldPosition(gridPos.x, gridPos.z);
            const width = size.width * this.tileSize;
            const depth = size.height * this.tileSize;

            // Determine terrain height at this position
            const terrainHeight = this._getAverageTerrainHeight(gridPos.x, gridPos.z, size.width, size.height);

            // Update preview position
            this.placementPreviewMesh.position.set(
                worldPos.x + width / 2,
                terrainHeight + 0.1, // Just above terrain
                worldPos.z + depth / 2
            );

            // Store the grid position for placement
            this.placementGridPosition = { x: gridPos.x, y: gridPos.z };
        }
    }

    // Get average terrain height for an area
    _getAverageTerrainHeight(startX, startY, width, height) {
        let totalHeight = 0;
        let count = 0;

        for (let y = startY; y < startY + height; y++) {
            for (let x = startX; x < startX + width; x++) {
                if (y >= 0 && y < this.size.height && x >= 0 && x < this.size.width) {
                    totalHeight += this.terrain[y][x].height;
                    count++;
                }
            }
        }

        return count > 0 ? totalHeight / count : 0;
    }

    // Check if a building can be placed at the given position
    _isPlacementValid(x, y) {
        // Determine building size
        const size = {
            width: this.buildingTypeToPlace === BuildingType.WAREHOUSE ? 2 : 1,
            height: this.buildingTypeToPlace === BuildingType.WAREHOUSE ? 2 : 1
        };

        // Check if the entire area is within bounds
        if (x < 0 || y < 0 || x + size.width > this.size.width || y + size.height > this.size.height) {
            return false;
        }

        // Check if the entire area is buildable
        for (let gridY = y; gridY < y + size.height; gridY++) {
            for (let gridX = x; gridX < x + size.width; gridX++) {
                const tile = this.terrain[gridY][gridX];

                // Check if tile is grass and not occupied
                if (tile.type !== TerrainType.GRASS || tile.building) {
                    return false;
                }
            }
        }

        // Check if we can afford to build it
        const costs = buildingCosts[this.buildingTypeToPlace];
        if (!this.game.resourceManager.hasResources(costs)) {
            return false;
        }

        return true;
    }

    // Place the building at the current preview position
    _placeBuilding() {
        if (!this.placementValid || !this.placementGridPosition) {
            console.log("Invalid placement");
            return;
        }

        const x = this.placementGridPosition.x;
        const y = this.placementGridPosition.y;

        console.log(`Placing ${this.buildingTypeToPlace} at grid position: ${x}, ${y}`);

        // Consume resources
        const costs = buildingCosts[this.buildingTypeToPlace];
        this.game.resourceManager.consumeResources(costs);

        // Create a construction site
        const construction = new Construction(this, x, y, this.buildingTypeToPlace);
        this.addConstruction(construction);

        // Exit placement mode
        this.cancelBuildingPlacement();
    }

    _onMouseMove(event) {
        // Update mouse position
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        // If in building placement mode, update the preview
        if (this.buildingPlacementMode) {
            this._updatePlacementPreview();
        }
    }

    _onClick(event) {
        // Raycast to find clicked objects
        this.raycaster.setFromCamera(this.mouse, this.game.camera);

        const intersects = this.raycaster.intersectObjects(this.scene.children, true); // Use true to check all descendants

        if (intersects.length > 0) {
            const intersect = intersects[0];
            console.log(`Click detected at world position: (${intersect.point.x}, ${intersect.point.z})`);

            // Handle building placement if in placement mode
            if (this.buildingPlacementMode) {
                if (this.placementValid) {
                    this._placeBuilding();
                } else {
                    console.log("Cannot place building here");
                }
                return;
            }

            // Check if we clicked on terrain or a building
            if (intersect.object.name === 'terrain') {
                // Convert intersection point to grid coordinates using our new method
                const gridPos = this.getGridPosition(intersect.point.x, intersect.point.z);
                const x = gridPos.x;
                const z = gridPos.z;

                if (x >= 0 && x < this.size.width && z >= 0 && z < this.size.height) {
                    console.log(`Clicked on terrain at grid [${x}, ${z}], type: ${this.terrain[z][x].type}`);
                }
            } else {
                // Find the clicked building - search through parent objects too
                let obj = intersect.object;
                while (obj && !obj.userData.isBuilding) {
                    obj = obj.parent;
                }

                if (obj && obj.userData.isBuilding) {
                    // Check if it's a construction site
                    if (obj.userData.isConstruction) {
                        const construction = this.constructions.find(c => c.mesh === obj);
                        if (construction) {
                            console.log(`Clicked on construction: ${construction.targetBuildingType}`);
                            this.game.uiManager.showConstructionPanel(construction);
                        }
                    } else {
                        // Regular building
                        const building = this.buildings.find(b => b.mesh === obj);
                        if (building) {
                            console.log(`Clicked on building: ${building.name}`);
                            this.game.uiManager.showBuildingPanel(building);
                        }
                    }
                }
            }
        }
    }

    getGridPosition(worldX, worldZ) {
        // Convert world coordinates to grid coordinates
        // Reverse of getWorldPosition calculation
        const x = Math.floor(worldX / this.tileSize + this.size.width / 2);
        const z = Math.floor(worldZ / this.tileSize + this.size.height / 2);

        return { x, z };
    }

    getWorldPosition(gridX, gridZ) {
        // Convert grid coordinates to world coordinates (center of the tile)
        // In our new system:
        // - Grid (0,0) corresponds to world coordinates (-width/2, -height/2)
        // - Grid (width/2, height/2) corresponds to world coordinates (0, 0)
        // - Grid (width, height) corresponds to world coordinates (width/2, height/2)

        const x = (gridX - this.size.width / 2) * this.tileSize;
        const z = (gridZ - this.size.height / 2) * this.tileSize;

        return { x, z };
    }

    // Add terrain sprites (grass, forest, etc.)
    _addGrassSprites() {
        // Check if we have loaded the new grass textures, try all possible fallbacks
        const grassTextures = [];
        for (let i = 1; i <= 10; i++) {
            const grassTexture = this.textures[`grass${i}`];
            if (grassTexture) {
                grassTextures.push(grassTexture);
            }
        }

        // Get all available tree textures
        const treeTextures = [];
        for (let i = 1; i <= 10; i++) {
            const treeTexture = this.textures[`tree${i}`];
            if (treeTexture) {
                treeTextures.push(treeTexture);
            }
        }

        console.log("Adding terrain sprites...");
        console.log(`Loaded ${treeTextures.length} tree textures for forests`);

        // Create materials for different terrain types
        const materials = {};
        const grassMaterials = [];
        const treeMaterials = [];

        // Add all available grass materials to an array for variety
        grassTextures.forEach((texture, index) => {
            grassMaterials.push(new THREE.SpriteMaterial({
                map: texture,
                transparent: true,
                alphaTest: 0.5,
                depthTest: true,
                sizeAttenuation: true,
                lights: false, // Disable lighting
                color: 0xffffff // Full brightness white to use texture colors exactly
            }));
            console.log("Created grass material", index + 1);
        });

        // Create tree materials from available textures
        treeTextures.forEach((texture, index) => {
            treeMaterials.push(new THREE.SpriteMaterial({
                map: texture,
                transparent: true,
                alphaTest: 0.5,
                depthTest: true,
                sizeAttenuation: true,
                lights: false, // Disable lighting
                color: 0xffffff // Full brightness white to use texture colors exactly
            }));
            console.log(`Created tree material ${index + 1}`);
        });

        // Fallback to legacy forest textures if no tree textures are available
        if (treeMaterials.length === 0) {
            if (forestTexture) {
                treeMaterials.push(new THREE.SpriteMaterial({
                    map: forestTexture,
                    transparent: true,
                    alphaTest: 0.5,
                    depthTest: true,
                    sizeAttenuation: true,
                    lights: false, // Disable lighting
                    color: 0xffffff // Full brightness white to use texture colors exactly
                }));
                console.log("Created legacy forest material");
            } else if (forest1Texture) {
                treeMaterials.push(new THREE.SpriteMaterial({
                    map: forest1Texture,
                    transparent: true,
                    alphaTest: 0.5,
                    depthTest: true,
                    sizeAttenuation: true,
                    lights: false, // Disable lighting
                    color: 0xffffff // Full brightness white to use texture colors exactly
                }));
                console.log("Created alternate legacy forest material");
            }
        }

        // Store grass materials for use in the terrain generation
        if (grassMaterials.length > 0) {
            materials[TerrainType.GRASS] = grassMaterials;
            // Also use grass textures for forest ground
            materials[TerrainType.FOREST] = grassMaterials;
        }

        // Store tree materials separately
        if (treeMaterials.length > 0) {
            materials['TREES'] = treeMaterials;
        }

        // Group for all terrain sprites
        this.spriteGroup = new THREE.Group();
        this.spriteGroup.name = "terrainSprites";

        // Stats for logging
        const stats = {
            grass: 0,
            forest: 0,
            trees: 0,
            total: 0
        };

        // Create sprites for terrain tiles
        // Focus on a reasonable area around the center for performance
        const centerX = Math.floor(this.size.width / 2);
        const centerY = Math.floor(this.size.height / 2);
        const radius = 25; // Only add sprites in a 50x50 area around center

        for (let y = centerY - radius; y < centerY + radius; y++) {
            for (let x = centerX - radius; x < centerX + radius; x++) {
                // Check if coordinates are valid
                if (y >= 0 && y < this.size.height && x >= 0 && x < this.size.width) {
                    const terrainType = this.terrain[y][x].type;

                    // Only add sprites if we have a material for this terrain type
                    if (materials[terrainType]) {
                        // Get world position for this tile
                        const worldPos = this.getWorldPosition(x, y);
                        const terrainHeight = this.terrain[y][x].height;

                        // Handle the different terrain types
                        if ((terrainType === TerrainType.GRASS || terrainType === TerrainType.FOREST) &&
                            Array.isArray(materials[terrainType])) {

                            // Add grass sprites (for both grass and forest terrains)
                            // Randomly select a grass material from the array for each sprite
                            const randomIndex = Math.floor(Math.random() * materials[terrainType].length);
                            const sprite = new THREE.Sprite(materials[terrainType][randomIndex]);

                            sprite.scale.set(this.tileSize, this.tileSize, 1);

                            // Create grass as a horizontal plane instead of a sprite
                            // Create a small plane geometry
                            const planeGeometry = new THREE.PlaneGeometry(
                                this.tileSize,
                                this.tileSize,
                            );

                            // Create plane material with the grass texture
                            const planeMaterial = new THREE.MeshBasicMaterial({
                                map: materials[terrainType][randomIndex].map,
                                transparent: true,
                                alphaTest: 0.5,
                                side: THREE.DoubleSide
                            });

                            // Create mesh with the plane geometry and material
                            const grassPlane = new THREE.Mesh(planeGeometry, planeMaterial);

                            // Rotate the plane to be flat on the ground (rotated around X-axis)
                            grassPlane.rotation.x = -Math.PI / 2;
                            // rotate 90, 180, 270 degrees randomly
                            grassPlane.rotation.z = Math.random() > 0.75 ? Math.PI / 2 :
                                Math.random() > 0.5 ? Math.PI : Math.random() > 0.25 ? -Math.PI / 2 : 0;

                            // Position the grass plane
                            grassPlane.position.set(
                                worldPos.x,
                                terrainHeight,
                                worldPos.z,
                            );

                            // Add to the sprite group
                            this.spriteGroup.add(grassPlane);
                            stats.grass++;
                            stats.total++;

                            // Add trees only for forest terrain
                            if (terrainType === TerrainType.FOREST && materials['TREES']) {
                                // Add 1-2 trees per forest tile
                                const treeCount = 1; // + Math.floor(Math.random() * 0.99); // 1-2 trees

                                for (let i = 0; i < treeCount; i++) {
                                    // Randomly select a tree material
                                    const randomTreeIndex = Math.floor(Math.random() * materials['TREES'].length);
                                    const treeSprite = new THREE.Sprite(materials['TREES'][randomTreeIndex]);

                                    // Trees should be moderately sized but tall enough to be visible
                                    const treeScale = 0.7 + Math.random() * 0.3; // Slight size variation (0.7-1.0)
                                    const treeSize = this.tileSize * 2.0 * treeScale; // Slightly larger to compensate for height
                                    treeSprite.scale.set(treeSize, treeSize, 1);

                                    // Random rotation for trees
                                    // treeSprite.material.rotation = Math.random() * Math.PI * 0.2; // Slight rotation

                                    // Position the tree with offset within the tile
                                    const treeOffsetX = (Math.random() - 0.5) * this.tileSize * 0.7;
                                    const treeOffsetZ = (Math.random() - 0.5) * this.tileSize * 0.7;
                                    const treeHeightOffset = 1.5; // Higher offset to show trees above grass

                                    treeSprite.position.set(
                                        worldPos.x + treeOffsetX,
                                        terrainHeight + treeHeightOffset,
                                        worldPos.z + treeOffsetZ
                                    );

                                    // Add to the sprite group
                                    this.spriteGroup.add(treeSprite);
                                    stats.trees++;
                                    stats.total++;
                                }
                            }
                        } else if (materials[terrainType]) {
                            // For other terrain types, create planes aligned with terrain
                            const planeSize = this.tileSize * 1.5;
                            const heightOffset = 0.1;

                            // Create plane geometry
                            const planeGeometry = new THREE.PlaneGeometry(planeSize, planeSize);

                            // Create material with the texture
                            const planeMaterial = new THREE.MeshBasicMaterial({
                                map: materials[terrainType].map,
                                transparent: true,
                                alphaTest: 0.5,
                                side: THREE.DoubleSide
                            });

                            // Create the mesh
                            const plane = new THREE.Mesh(planeGeometry, planeMaterial);

                            // Rotate to lie flat on the ground
                            plane.rotation.x = -Math.PI / 2;

                            // Add some random rotation for natural look
                            plane.rotation.z = Math.random() * Math.PI * 2;

                            // Position the plane on the terrain
                            plane.position.set(
                                worldPos.x,
                                terrainHeight + heightOffset,
                                worldPos.z
                            );

                            // Add to the sprite group
                            this.spriteGroup.add(plane);
                            stats.total++;
                        }
                    }
                }
            }
        }

        // Add all sprites to the scene
        this.scene.add(this.spriteGroup);
        console.log(`Added ${stats.total} terrain sprites (${stats.grass} grass, ${stats.trees} trees, ${stats.forest} forest patches)`);
    }

    // Add initial settlers
    _addStartingSettlers(warehouseX, warehouseY) {
        // Add 3 porters around the warehouse
        for (let i = 0; i < 3; i++) {
            const offsetX = Math.floor(Math.random() * 3) - 1;
            const offsetY = Math.floor(Math.random() * 3) - 1;

            const porterX = warehouseX + offsetX;
            const porterY = warehouseY + offsetY;

            // Make sure the position is valid
            if (porterX >= 0 && porterX < this.size.width &&
                porterY >= 0 && porterY < this.size.height) {
                this._addSettler(new Porter(this, porterX, porterY));
            }
        }

        // Add 2 builders around the warehouse
        for (let i = 0; i < 2; i++) {
            const offsetX = Math.floor(Math.random() * 3) - 1;
            const offsetY = Math.floor(Math.random() * 3) - 1;

            const builderX = warehouseX + offsetX;
            const builderY = warehouseY + offsetY;

            // Make sure the position is valid
            if (builderX >= 0 && builderX < this.size.width &&
                builderY >= 0 && builderY < this.size.height) {
                this._addSettler(new Builder(this, builderX, builderY));
            }
        }
    }

    // Add a new settler
    _addSettler(settler) {
        this.settlers.push(settler);

        // Initialize and add to scene
        settler.init();

        if (settler.mesh) {
            this.scene.add(settler.mesh);
            
            // Make sure the settler is properly initialized
            const worldPos = this.getWorldPosition(settler.position.x, settler.position.y);
            const terrainHeight = this.terrain[settler.position.y][settler.position.x].height;
            settler.mesh.position.set(worldPos.x, terrainHeight + 0.1, worldPos.z);
            
            // Create a marker to help locate the settler
            const markerGeometry = new THREE.SphereGeometry(0.2, 8, 8);
            const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFF00 });
            const marker = new THREE.Mesh(markerGeometry, markerMaterial);
            marker.position.y = 1.5; // Above the settler
            settler.mesh.add(marker);
            
            // Make the marker blink to make it extra visible
            const blinkInterval = setInterval(() => {
                marker.visible = !marker.visible;
            }, 500);
            
            // Remove the marker after 10 seconds
            setTimeout(() => {
                clearInterval(blinkInterval);
                settler.mesh.remove(marker);
            }, 10000);
        }

        console.log(`Added ${settler.type} at (${settler.position.x}, ${settler.position.y})`);
    }

    // Position the camera to focus on the starting area
    _centerCameraOnStartingArea(centerX, centerY) {
        // Get the world position of the starting tile
        const worldPos = this.getWorldPosition(centerX, centerY);

        // Calculate the offset from the center
        const offsetX = worldPos.x;
        const offsetZ = worldPos.z;

        // Move the camera's target to this position
        // We need to adjust the orbit controls target point
        const controls = this.game.controls;

        // Set the target to the world position of our starting area
        controls.target.set(offsetX, 0, offsetZ);

        // Update controls to apply the new target
        controls.update();

        console.log(`Camera centered on starting area at world position: ${offsetX}, ${offsetZ}`);
        console.log(`Center coordinates: Grid (${centerX}, ${centerY}), World (${offsetX}, ${offsetZ})`);
    }
}