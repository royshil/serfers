import { ResourceType, BuildingType, SettlerType } from './Enums.js';

// Resource names for display
export const resourceNames = {
    [ResourceType.WOOD]: 'Wood',
    [ResourceType.STONE]: 'Stone',
    [ResourceType.IRON_ORE]: 'Iron Ore',
    [ResourceType.IRON]: 'Iron',
    [ResourceType.PLANK]: 'Planks',
    [ResourceType.WHEAT]: 'Wheat',
    [ResourceType.FLOUR]: 'Flour',
    [ResourceType.BREAD]: 'Bread',
    [ResourceType.MEAT]: 'Meat'
};

// Building names for display
export const buildingNames = {
    [BuildingType.WAREHOUSE]: 'Warehouse',
    [BuildingType.WOODCUTTER]: 'Woodcutter\'s Hut',
    [BuildingType.SAWMILL]: 'Sawmill',
    [BuildingType.STONEMASON]: 'Stonemason\'s Hut',
    [BuildingType.MINE]: 'Mine',
    [BuildingType.IRONSMITH]: 'Ironsmith\'s Forge',
    [BuildingType.FARM]: 'Farm',
    [BuildingType.MILL]: 'Mill',
    [BuildingType.BAKERY]: 'Bakery',
    [BuildingType.HUNTER]: 'Hunter\'s Hut'
};

// Settler names for display
export const settlerNames = {
    [SettlerType.PORTER]: 'Porter',
    [SettlerType.BUILDER]: 'Builder',
    [SettlerType.WOODCUTTER]: 'Woodcutter',
    [SettlerType.STONEMASON]: 'Stonemason',
    [SettlerType.MINER]: 'Miner',
    [SettlerType.BLACKSMITH]: 'Blacksmith',
    [SettlerType.FARMER]: 'Farmer',
    [SettlerType.MILLER]: 'Miller',
    [SettlerType.BAKER]: 'Baker',
    [SettlerType.HUNTER]: 'Hunter',
    [SettlerType.DIGGER]: 'Digger'
};

// Fog of War settings
export const FOG_OF_WAR = {
    ENABLED: true,
    INITIAL_VISIBILITY_RADIUS: 20, // Radius in grid units around warehouse
    BUILDING_VISIBILITY_RADIUS: {
        [BuildingType.WAREHOUSE]: 20,
        [BuildingType.WOODCUTTER]: 10,
        [BuildingType.SAWMILL]: 10,
        [BuildingType.STONEMASON]: 10,
        [BuildingType.MINE]: 12,
        [BuildingType.IRONSMITH]: 10,
        [BuildingType.FARM]: 15,
        [BuildingType.MILL]: 10,
        [BuildingType.BAKERY]: 10,
        [BuildingType.HUNTER]: 15
    }
};

// Building costs (resources needed to build)
export const buildingCosts = {
    [BuildingType.WAREHOUSE]: {
        [ResourceType.PLANK]: 20,
        [ResourceType.STONE]: 10
    },
    [BuildingType.WOODCUTTER]: {
        [ResourceType.PLANK]: 5
    },
    [BuildingType.SAWMILL]: {
        [ResourceType.PLANK]: 5,
        [ResourceType.STONE]: 5
    },
    [BuildingType.STONEMASON]: {
        [ResourceType.PLANK]: 5
    },
    [BuildingType.MINE]: {
        [ResourceType.PLANK]: 5,
        [ResourceType.STONE]: 10
    },
    [BuildingType.IRONSMITH]: {
        [ResourceType.PLANK]: 5,
        [ResourceType.STONE]: 10
    },
    [BuildingType.FARM]: {
        [ResourceType.PLANK]: 5
    },
    [BuildingType.MILL]: {
        [ResourceType.PLANK]: 5,
        [ResourceType.STONE]: 5
    },
    [BuildingType.BAKERY]: {
        [ResourceType.PLANK]: 5,
        [ResourceType.STONE]: 10
    },
    [BuildingType.HUNTER]: {
        [ResourceType.PLANK]: 5
    }
};

// Production chains - what resources each building uses and produces
export const productionChains = {
    [BuildingType.WOODCUTTER]: {
        produces: {
            type: ResourceType.WOOD,
            rate: 1
        }
    },
    [BuildingType.SAWMILL]: {
        consumes: {
            [ResourceType.WOOD]: 1
        },
        produces: {
            type: ResourceType.PLANK,
            rate: 1
        }
    },
    [BuildingType.STONEMASON]: {
        produces: {
            type: ResourceType.STONE,
            rate: 1
        }
    },
    [BuildingType.MINE]: {
        produces: {
            type: ResourceType.IRON_ORE,
            rate: 1
        }
    },
    [BuildingType.IRONSMITH]: {
        consumes: {
            [ResourceType.IRON_ORE]: 1
        },
        produces: {
            type: ResourceType.IRON,
            rate: 1
        }
    },
    [BuildingType.FARM]: {
        produces: {
            type: ResourceType.WHEAT,
            rate: 1
        }
    },
    [BuildingType.MILL]: {
        consumes: {
            [ResourceType.WHEAT]: 1
        },
        produces: {
            type: ResourceType.FLOUR,
            rate: 1
        }
    },
    [BuildingType.BAKERY]: {
        consumes: {
            [ResourceType.FLOUR]: 1
        },
        produces: {
            type: ResourceType.BREAD,
            rate: 1
        }
    },
    [BuildingType.HUNTER]: {
        produces: {
            type: ResourceType.MEAT,
            rate: 1
        }
    }
};