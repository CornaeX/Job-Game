const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

// ==========================================
// 1. APP CONFIGURATION & MIDDLEWARE
// ==========================================
const app = express();
const DATA_DIR = path.join(__dirname, 'data');

app.use(bodyParser.json());
app.use(cors({ origin: process.env.ALLOWED_ORIGIN }));
app.use(express.static('public')); // Primary static folder
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // Redundant but kept per original

// Ensure data directory exists (Serverless safety check)
if (!fs.existsSync(DATA_DIR)) {
    try {
        fs.mkdirSync(DATA_DIR);
    } catch (e) {
        console.log("Could not create data directory (likely serverless environment):", e.message);
    }
}

// ==========================================
// 2. GAME CONSTANTS & DATA
// ==========================================

// EXP Values for crops
const CROP_EXP_TABLE = {
    "carrotCrop": 5,
    "strawberryCrop": 10,
    "tomatoCrop": 18,
    "appleCrop": 21,
    "kiwiCrop": 28,
    "orangeCrop": 39,
    "cornCrop": 46,
    "wheatCrop": 58,
    "pumpkinCrop": 80
};

// Default Inventory for new characters
const DEFAULT_INVENTORY = [
    'CarrotSeed-3', 'StrawberrySeed-10', 'TomatoSeed-0',
    'AppleSeed-0', 'KiwiSeed-0', 'OrangeSeed-0',
    'CornSeed-0', 'WheatSeed-0', 'PumpkinSeed-0',
    'CarrotCrop-0', 'StrawberryCrop-0', 'TomatoCrop-0',
    'AppleCrop-0', 'KiwiCrop-0', 'OrangeCrop-0',
    'CornCrop-0', 'WheatCrop-0', 'PumpkinCrop-0',
    'Worms-10', 'Lures-5', 'Minnow-0', 'Tuna-0',
    'Salmon-0', 'Cod-0', 'Trout-0', 'Mackerel-0',
    'Perch-0', 'Carp-0', 'Catfish-0', 'Sardine-0'
];

// ==========================================
// 3. HELPER FUNCTIONS
// ==========================================

const getFilePath = (name) => path.join(DATA_DIR, `${name}.json`);

const formatDate = (dateObj) => {
    return dateObj.toISOString().slice(0, 19).replace('T', ' ');
};

/**
 * Helper to safely read a JSON file
 */
const readJsonFile = (filePath) => {
    if (!fs.existsSync(filePath)) return null;
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (err) {
        console.error("Error parsing JSON:", err);
        return null;
    }
};

/**
 * Helper to safely write a JSON file
 */
const writeJsonFile = (filePath, data, res, successMessage = "Success") => {
    fs.writeFile(filePath, JSON.stringify(data, null, 2), (err) => {
        if (err) {
            console.error('File write error:', err);
            if (res) return res.status(500).send('File write error');
            return;
        }
        if (res) {
            // Check if response expects JSON or Text based on message type
            if (typeof successMessage === 'object') res.json(successMessage);
            else res.send(successMessage);
        }
    });
};

// ==========================================
// 4. API ROUTES: CHARACTER MANAGEMENT
// ==========================================

// Create a new character file
app.post('/create-character', (req, res) => {
    const { characterName } = req.body;
    if (!characterName) return res.status(400).send('Character name is required');

    const safeCharacterName = characterName.replace(/[^a-zA-Z0-9_]/g, '');
    if (!safeCharacterName) return res.status(400).send('Invalid character name');

    const filePath = getFilePath(safeCharacterName);
    if (fs.existsSync(filePath)) return res.status(400).send('Character already exists');

    const newCharacter = {
        Character_Name: safeCharacterName,
        Money: 1000,
        Stats: {
            Farming_Level: 1, Farming_EXP: 0,
            Fishing_Level: 1, Fishing_EXP: 0,
            OreMiner_Level: 1, OreMiner_EXP: 0,
            Cooking_Level: 1, Cooking_EXP: 0,
            Cashier_Level: 1, Cashier_EXP: 0,
            CryptoMining_Level: 1, CryptoMining_EXP: 0
        },
        Inventory: [...DEFAULT_INVENTORY], // Copy default array
        ActiveCrops: []
    };

    writeJsonFile(filePath, newCharacter, res, 'Character created successfully');
});

// List all character save files
app.get('/list-saves', (req, res) => {
    fs.readdir(DATA_DIR, (err, files) => {
        if (err) return res.status(500).send('Failed to list saves');

        const saves = files
            .filter(file => file.endsWith('.json'))
            .map(file => {
                const data = readJsonFile(path.join(DATA_DIR, file));
                return {
                    tableName: file.replace('.json', ''),
                    characterName: data ? data.Character_Name : 'Unknown'
                };
            });
        res.json(saves);
    });
});

// Load specific character (Flattened structure)
app.get('/load-save/:characterName', (req, res) => {
    const { characterName } = req.params;
    const data = readJsonFile(getFilePath(characterName));

    if (!data) return res.status(404).json({ error: 'Save file not found' });

    const flattened = {
        Character_Name: data.Character_Name,
        Money: data.Money,
        ...data.Stats,
    };

    res.json(flattened);
});

// Get character data (Nested structure)
app.get('/get-character-data', (req, res) => {
    const { characterName } = req.query;
    const data = readJsonFile(getFilePath(characterName));

    if (!data) return res.status(404).json({ error: 'Character not found' });

    const responseData = {
        Character_Name: data.Character_Name,
        Money: data.Money,
        ...data.Stats
    };

    res.json(responseData);
});

// ==========================================
// 5. API ROUTES: INVENTORY SYSTEM
// ==========================================

// Load Inventory
app.get('/load-inventory/:characterName', (req, res) => {
    const { characterName } = req.params;
    const data = readJsonFile(getFilePath(characterName));

    if (!data) return res.status(404).json({ error: 'Character not found' });
    res.json(data.Inventory);
});

// Add Item (Logic for Harvesting Crops)
app.post('/addItem2Inv', (req, res) => {
    const { characterName, itemName, ID } = req.body;
    const filePath = getFilePath(characterName);
    const data = readJsonFile(filePath);

    if (!data) return res.status(404).json({ error: 'Character not found' });

    const inventoryIndex = data.Inventory.findIndex(item => item.startsWith(itemName));

    // Update or Push Inventory
    if (inventoryIndex !== -1) {
        const parts = data.Inventory[inventoryIndex].split('-');
        const newCount = parseInt(parts[1]) + 1;
        data.Inventory[inventoryIndex] = `${parts[0]}-${newCount}`;
    } else {
        data.Inventory.push(`${itemName}-1`);
    }

    // Remove harvested crop from ActiveCrops
    const cropIdToRemove = `${itemName}-${ID}`;
    data.ActiveCrops = data.ActiveCrops.filter(crop => crop.cropType !== cropIdToRemove);

    writeJsonFile(filePath, data, res, {
        message: 'Inventory updated successfully',
        newInventory: inventoryIndex !== -1 ? data.Inventory[inventoryIndex] : `${itemName}-1`
    });
});

// Admin/Cheat Add Item
app.post('/cheatAddItem2Inv', (req, res) => {
    const { characterName, ItemName, Amount } = req.body;
    const filePath = getFilePath(characterName);
    const data = readJsonFile(filePath);

    if (!data) return res.status(404).json({ error: 'Character not found' });

    const inventoryIndex = data.Inventory.findIndex(item => item.includes(ItemName));
    if (inventoryIndex === -1) return res.status(500).json({ error: 'Item not found in inventory' });

    const oldInvString = data.Inventory[inventoryIndex];
    const newInvString = oldInvString.replace(/(\d+)$/, (match) => parseInt(match, 10) + Amount);
    data.Inventory[inventoryIndex] = newInvString;

    writeJsonFile(filePath, data, res, { message: 'Inventory updated successfully', newInventory: newInvString });
});

// ==========================================
// 6. API ROUTES: FARMING SYSTEM
// ==========================================

// Update EXP after harvesting
app.post('/update-farming-exp', (req, res) => {
    const { itemName, characterName } = req.body;
    const filePath = getFilePath(characterName);
    const data = readJsonFile(filePath);

    if (!data) return res.status(404).json({ error: 'Character not found' });

    // Calculate EXP
    const EXP = CROP_EXP_TABLE[itemName] || 0;

    let currentExp = (data.Stats.Farming_EXP || 0) + EXP;
    let currentLevel = (data.Stats.Farming_Level || 1);

    // Level up logic
    const expToLevelUp = currentLevel * 50;
    let newLevel = currentLevel;
    let levelUp = false;

    if (currentExp >= expToLevelUp) {
        newLevel++;
        currentExp = 0;
        levelUp = true;
    }

    data.Stats.Farming_EXP = currentExp;
    data.Stats.Farming_Level = newLevel;

    writeJsonFile(filePath, data, res, {
        message: 'Updated',
        levelUp: levelUp,
        newLevel: newLevel,
        currentExp: currentExp
    });
});

// Plant a Seed
app.post('/save-plant', (req, res) => {
    const { characterName, cropType, growTime, newInventory, oldInventory } = req.body;
    const filePath = getFilePath(characterName);
    const data = readJsonFile(filePath);

    if (!data) return res.status(404).send('Character not found');

    // Update seed inventory count
    const invIndex = data.Inventory.indexOf(oldInventory);
    if (invIndex !== -1) {
        data.Inventory[invIndex] = newInventory;
    } else {
        // Fallback search
        const itemName = oldInventory.split('-')[0];
        const fallbackIndex = data.Inventory.findIndex(i => i.startsWith(itemName));
        if (fallbackIndex !== -1) data.Inventory[fallbackIndex] = newInventory;
    }

    // Add to active crops
    const plantTime = new Date();
    const growEndTime = new Date(plantTime.getTime() + growTime);

    data.ActiveCrops.push({
        cropType: cropType,
        plantTime: formatDate(plantTime),
        growEndTime: formatDate(growEndTime)
    });

    writeJsonFile(filePath, data, res, { message: 'Inventory updated successfully', newInventory });
});

// Get Active Crops
app.get('/load-cropType/:characterName', (req, res) => {
    const { characterName } = req.params;
    const data = readJsonFile(getFilePath(characterName));

    if (!data) return res.status(404).json({ error: 'Character not found' });

    const cropType = data.ActiveCrops.map(c => c.cropType);
    const plantTime = data.ActiveCrops.map(c => c.plantTime);
    const growEndTime = data.ActiveCrops.map(c => c.growEndTime);

    res.json({ cropType, plantTime, growEndTime });
});

// ==========================================
// 7. API ROUTES: FISHING SYSTEM
// ==========================================

app.post('/process-fishing', (req, res) => {
    const { characterName, baitType, success } = req.body;
    const filePath = getFilePath(characterName);
    const data = readJsonFile(filePath);

    if (!data) return res.status(404).json({ error: 'Character not found' });

    // 1. Validate and Remove Bait
    const baitIndex = data.Inventory.findIndex(item => item.startsWith(baitType));
    if (baitIndex === -1) return res.status(400).json({ error: 'You do not have this bait!' });

    const baitParts = data.Inventory[baitIndex].split('-');
    let baitCount = parseInt(baitParts[1]);

    if (baitCount <= 0) return res.status(400).json({ error: 'Out of bait!' });

    baitCount -= 1;
    data.Inventory[baitIndex] = `${baitParts[0]}-${baitCount}`;

    let caughtFish = null;
    let message = "Bait lost...";

    // 2. Process Catch
    if (success) {
        let possibleFish = [];
        if (baitType === "Worms") possibleFish = ["Minnow", "Sardine", "Perch"];
        else if (baitType === "Lures") possibleFish = ["Trout", "Salmon", "Mackerel"];
        else if (baitType === "Minnow") possibleFish = ["Tuna", "Catfish", "Cod"];
        else possibleFish = ["Carp"];

        caughtFish = possibleFish[Math.floor(Math.random() * possibleFish.length)];

        // Add Fish to Inventory
        const fishIndex = data.Inventory.findIndex(item => item.startsWith(caughtFish));
        if (fishIndex !== -1) {
            const fishParts = data.Inventory[fishIndex].split('-');
            const newCount = parseInt(fishParts[1]) + 1;
            data.Inventory[fishIndex] = `${fishParts[0]}-${newCount}`;
        } else {
            data.Inventory.push(`${caughtFish}-1`);
        }

        message = `You caught a ${caughtFish}!`;

        // Add Fishing EXP
        const currentExp = (data.Stats.Fishing_EXP || 0) + 15;
        data.Stats.Fishing_EXP = currentExp;
    }

    writeJsonFile(filePath, data, res, {
        message: message,
        newInventory: data.Inventory,
        caughtFish: caughtFish,
        remainingBait: baitCount
    });
});

// ==========================================
// 8. PAGE & ASSET ROUTES
// ==========================================

// HTML Pages
app.get('/', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'HomePage.html')); });
app.get('/home', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'GameHomePage.html')); });
app.get('/create-character', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'CreateCharacterPage.html')); });
app.get('/my-farm', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'MyFarm.html')); });
app.get('/fishing', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'Fishing.html')); });
app.get('/asd', (req, res) => { res.sendFile(path.join(__dirname, 'asd.html')); });

// Specific Asset Routes (Consider moving to static folder logic if possible)
app.get('/image', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'img/icon/Cashier.png')); });

// ==========================================
// 9. SERVER START
// ==========================================

if (require.main === module) {
    const PORT = process.env.PORT || 3005;
    app.listen(PORT, () => console.log(`✅ Local running on ${PORT}`));
}

module.exports = app;