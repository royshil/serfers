import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { World } from './World.js';
import { UIManager } from '../ui/UIManager.js';
import { ResourceManager } from './ResourceManager.js';

export class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.width = window.innerWidth;
        this.height = window.innerHeight;

        // Three.js components
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;

        // Game components
        this.world = null;
        this.resourceManager = null;
        this.uiManager = null;

        // Game state
        this.isRunning = false;

        // Bind methods
        this._onWindowResize = this._onWindowResize.bind(this);
        this._update = this._update.bind(this);
    }

    init() {
        // Initialize Three.js
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB); // Sky blue

        // Create texture loader
        this.textureLoader = new THREE.TextureLoader();

        // Preload commonly used assets
        this.preloadAssets();

        // Setup camera (isometric view) with increased frustum size
        const frustumSize = Math.max(this.width, this.height);
        const aspect = this.width / this.height;

        this.camera = new THREE.OrthographicCamera(
            -frustumSize * aspect / 2, frustumSize * aspect / 2,
            frustumSize / 2, -frustumSize / 2,
            0.1, 5000 // Further increased far plane to prevent clipping
        );

        // Set a more traditional isometric view for better visibility
        this.camera.position.set(50, 70, 50);
        this.camera.lookAt(0, 0, 0);

        console.log("Camera positioned directly above the center point");

        // Start with a significantly zoomed-in view on the settlement area
        this.camera.zoom = 70; // Very zoomed in to clearly see the starting point
        this.camera.updateProjectionMatrix();

        // Setup renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true
        });
        this.renderer.setSize(this.width, this.height);
        this.renderer.setPixelRatio(window.devicePixelRatio);

        // Enable shadows
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // Setup controls - restricted to only panning and zooming
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.1;
        this.controls.screenSpacePanning = true;

        // Lock rotation to maintain isometric view
        this.controls.enableRotate = false;

        // Allow panning and zooming
        this.controls.enablePan = true;
        this.controls.enableZoom = true;

        // Zoom limits - restrict zoom out but allow good zoom in
        this.controls.minZoom = 1.0;  // Restrict zooming out so buildings stay visible
        this.controls.maxZoom = 100;   // Allow extreme zoom in

        // Speed settings
        this.controls.panSpeed = 1.5; // Faster panning for large map
        this.controls.zoomSpeed = 1.2; // Faster zooming

        // Basic ambient light only - directional lights disabled to prevent color issues with sprites
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.0); // Full brightness ambient
        this.scene.add(ambientLight);

        console.log("Disabled directional lighting to preserve sprite colors");

        // Initialize game components
        this.resourceManager = new ResourceManager();

        // Create world after controls are initialized so it can access them
        this.world = new World(this);
        this.uiManager = new UIManager(this);

        // Initialize world
        this.world.init();

        // Initialize UI
        this.uiManager.init();

        // Add event listeners
        window.addEventListener('resize', this._onWindowResize);

        console.log('Game initialized');
    }

    start() {
        this.isRunning = true;
        this._update();

        // Set initial camera position to view the center of the map clearly
        this._setInitialCameraView();

        console.log('Game started');
    }

    // Set the camera to a good initial view of the warehouse
    _setInitialCameraView() {
        // Get the center of the map
        const centerX = Math.floor(this.world.size.width / 2);
        const centerY = Math.floor(this.world.size.height / 2);

        // Get world position adjusted for warehouse (slightly offset from center)
        const worldPos = this.world.getWorldPosition(centerX - 1, centerY - 1);

        // Position camera for clear view of the center area
        const distance = 40; // Further out for better perspective
        this.camera.position.set(
            worldPos.x + distance,
            distance * 0.8, // Lower height
            worldPos.z + distance
        );

        console.log(`Camera positioned at: (${this.camera.position.x}, ${this.camera.position.y}, ${this.camera.position.z})`);

        // Look at the warehouse position
        this.controls.target.set(worldPos.x, 0, worldPos.z);

        // Set a higher zoom level for a closer view
        this.camera.zoom = 25;
        this.camera.updateProjectionMatrix();

        // Update the controls
        this.controls.update();
    }

    pause() {
        this.isRunning = false;
        console.log('Game paused');
    }

    _update() {
        if (!this.isRunning) return;

        // Update controls
        this.controls.update();

        // Update world
        this.world.update();

        // Render scene
        this.renderer.render(this.scene, this.camera);

        // Request next frame
        requestAnimationFrame(this._update);
    }

    // Preload commonly used textures and assets
    preloadAssets() {
        console.log("Preloading assets...");

        // Texture cache to store loaded textures
        this.textures = {};

        // Preload the warehouse texture - try multiple paths
        const warehousePaths = [
            '/assets/sprites/warehouse.png',  // Correct path based on public directory
        ];

        // Try to load from the first path, fall back to the second if needed
        this.textureLoader.load(warehousePaths[0],
            // Success callback
            (texture) => {
                console.log("Preloaded warehouse texture from primary path");
                this.textures.warehouse = texture;
            },
            // Progress callback
            undefined,
            // Error callback - try the fallback path
            (error) => {
                console.warn("Failed to preload from primary path", error);
            }
        );
    }


    _onWindowResize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;

        // Update camera with proper aspect ratio
        const frustumSize = Math.max(this.width, this.height);
        const aspect = this.width / this.height;

        this.camera.left = -frustumSize * aspect / 2;
        this.camera.right = frustumSize * aspect / 2;
        this.camera.top = frustumSize / 2;
        this.camera.bottom = -frustumSize / 2;

        // Make sure far plane is properly set to prevent clipping
        this.camera.far = 5000;
        this.camera.near = 0.01;

        // Make sure we keep the same zoom level
        const currentZoom = this.camera.zoom;
        this.camera.updateProjectionMatrix();
        this.camera.zoom = currentZoom;
        this.camera.updateProjectionMatrix();

        // Update renderer
        this.renderer.setSize(this.width, this.height);
        this.renderer.setPixelRatio(window.devicePixelRatio);
    }
}