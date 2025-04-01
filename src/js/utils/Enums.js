// Terrain types
export const TerrainType = {
    GRASS: 'grass',
    WATER: 'water',
    STONE: 'stone',
    MOUNTAIN: 'mountain',
    FOREST: 'forest',
    SAND: 'sand',
    SNOW: 'snow'
};

// Resource types
export const ResourceType = {
    WOOD: 'wood',
    STONE: 'stone',
    IRON_ORE: 'iron_ore',
    IRON: 'iron',
    PLANK: 'plank',
    WHEAT: 'wheat',
    FLOUR: 'flour',
    BREAD: 'bread',
    MEAT: 'meat'
};

// Building types
export const BuildingType = {
    WAREHOUSE: 'warehouse',
    WOODCUTTER: 'woodcutter',
    SAWMILL: 'sawmill',
    STONEMASON: 'stonemason',
    MINE: 'mine',
    IRONSMITH: 'ironsmith',
    FARM: 'farm',
    MILL: 'mill',
    BAKERY: 'bakery',
    HUNTER: 'hunter'
};

// Settler types (jobs)
export const SettlerType = {
    PORTER: 'porter',
    BUILDER: 'builder',
    WOODCUTTER: 'woodcutter',
    STONEMASON: 'stonemason',
    MINER: 'miner',
    BLACKSMITH: 'blacksmith',
    FARMER: 'farmer',
    MILLER: 'miller',
    BAKER: 'baker',
    HUNTER: 'hunter',
    DIGGER: 'digger'
};

// Fog of War visibility states
export const VisibilityState = {
    UNEXPLORED: 'unexplored',   // Never seen, completely black
    EXPLORED: 'explored',       // Previously seen but not in range of a building, darkened/grayed out
    VISIBLE: 'visible'          // Currently visible, normal display
};