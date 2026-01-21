const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const DATA_DIR = path.join(__dirname, 'data');

// Ensure data directory exists
// Note: On Vercel (Serverless), fs.mkdirSync might fail as the system is read-only.
if (!fs.existsSync(DATA_DIR)) {
    try {
        fs.mkdirSync(DATA_DIR);
    } catch (e) {
        console.log("Could not create data directory (likely serverless environment):", e.message);
    }
}

// Middleware
app.use(bodyParser.json());
app.use(cors({ origin: process.env.ALLOWED_ORIGIN }));
app.use(express.static('public'));
app.use(express.json());

// --- Helper Functions ---

const getFilePath = (name) => path.join(DATA_DIR, `${name}.json`);

const formatDate = (dateObj) => {
    return dateObj.toISOString().slice(0, 19).replace('T', ' ');
};

app.post('/create-character', (req, res) => {
    const { characterName } = req.body;
    if (!characterName) return res.status(400).send('Character name is required');

    const safeCharacterName = characterName.replace(/[^a-zA-Z0-9_]/g, '');
    if (!safeCharacterName) return res.status(400).send('Invalid character name');

    const filePath = getFilePath(safeCharacterName);

    if (fs.existsSync(filePath)) {
        return res.status(400).send('Character already exists');
    }

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
        Inventory: [
            'CarrotSeed-3', 'StrawberrySeed-10', 'TomatoSeed-0',
            'AppleSeed-0', 'KiwiSeed-0', 'OrangeSeed-0',
            'CornSeed-0', 'WheatSeed-0', 'PumpkinSeed-0',
            'CarrotCrop-0', 'StrawberryCrop-0', 'TomatoCrop-0',
            'AppleCrop-0', 'KiwiCrop-0', 'OrangeCrop-0',
            'CornCrop-0', 'WheatCrop-0', 'PumpkinCrop-0',
            'Worms-10', 'Lures-5', 'Minnow-0', 'Tuna-0',
            'Salmon-0', 'Cod-0', 'Trout-0', 'Mackerel-0',
            'Perch-0', 'Carp-0', 'Catfish-0', 'Sardine-0'
        ],
        ActiveCrops: [] 
    };

    fs.writeFile(filePath, JSON.stringify(newCharacter, null, 2), (err) => {
        if (err) {
            console.error('File write error:', err);
            return res.status(500).send('Failed to create character');
        }
        res.send('Character created successfully');
    });
});

app.get('/list-saves', (req, res) => {
    fs.readdir(DATA_DIR, (err, files) => {
        if (err) return res.status(500).send('Failed to list saves');

        const saves = files
            .filter(file => file.endsWith('.json'))
            .map(file => {
                const data = JSON.parse(fs.readFileSync(path.join(DATA_DIR, file)));
                return {
                    tableName: file.replace('.json', ''), 
                    characterName: data.Character_Name
                };
            });
        res.json(saves);
    });
});

app.get('/load-save/:characterName', (req, res) => {
    const { characterName } = req.params;
    const filePath = getFilePath(characterName);

    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Save file not found' });

    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ error: 'Failed to read save' });
        
        const json = JSON.parse(data);
        const flattened = {
            Character_Name: json.Character_Name,
            Money: json.Money,
            ...json.Stats,
        };
        
        res.json(flattened);
    });
});

app.get('/get-character-data', (req, res) => {
    const { characterName } = req.query;
    const filePath = getFilePath(characterName);

    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Character not found' });

    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    const responseData = {
        Character_Name: data.Character_Name,
        Money: data.Money,
        ...data.Stats
    };
    
    res.json(responseData);
});

app.post('/update-farming-exp', (req, res) => {
    const { itemName, characterName } = req.body;
    const filePath = getFilePath(characterName);

    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Character not found' });

    let EXP = 0;
    // Map crops to EXP values
    switch (itemName) {
        case "carrotCrop": EXP = 5; break;
        case "strawberryCrop": EXP = 10; break;
        case "tomatoCrop": EXP = 18; break;
        case "appleCrop": EXP = 21; break;
        case "kiwiCrop": EXP = 28; break;
        case "orangeCrop": EXP = 39; break;
        case "cornCrop": EXP = 46; break;
        case "wheatCrop": EXP = 58; break;
        case "pumpkinCrop": EXP = 80; break;
        default: EXP = 0;
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // Default to 0 if undefined (safety check)
    let currentExp = (data.Stats.Farming_EXP || 0) + EXP;
    let currentLevel = (data.Stats.Farming_Level || 1);
    
    // Simple level up logic
    const expToLevelUp = currentLevel * 50;

    let newLevel = currentLevel;
    let levelUp = false; // Track if we leveled up

    if (currentExp >= expToLevelUp) {
        newLevel++;
        currentExp = 0; // Reset EXP after level up (or keep overflow if you prefer)
        levelUp = true;
    }

    data.Stats.Farming_EXP = currentExp;
    data.Stats.Farming_Level = newLevel;

    fs.writeFile(filePath, JSON.stringify(data, null, 2), (err) => {
        if (err) return res.status(500).json({ error: 'Failed to update farming data' });
        
        // FIX: Send JSON response so frontend .json() works
        res.json({ 
            message: 'Updated', 
            levelUp: levelUp,
            newLevel: newLevel,
            currentExp: currentExp
        });
    });
});

app.post('/save-plant', (req, res) => {
    const { characterName, cropType, growTime, newInventory, oldInventory } = req.body;
    const filePath = getFilePath(characterName);

    if (!fs.existsSync(filePath)) return res.status(404).send('Character not found');

    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    const invIndex = data.Inventory.indexOf(oldInventory);
    if (invIndex !== -1) {
        data.Inventory[invIndex] = newInventory;
    } else {
        const itemName = oldInventory.split('-')[0];
        const fallbackIndex = data.Inventory.findIndex(i => i.startsWith(itemName));
        if (fallbackIndex !== -1) data.Inventory[fallbackIndex] = newInventory;
    }

    const plantTime = new Date();
    const growEndTime = new Date(plantTime.getTime() + growTime);

    data.ActiveCrops.push({
        cropType: cropType,
        plantTime: formatDate(plantTime),
        growEndTime: formatDate(growEndTime)
    });

    fs.writeFile(filePath, JSON.stringify(data, null, 2), (err) => {
        if (err) return res.status(500).send('Error saving plant');
        res.json({ message: 'Inventory updated successfully', newInventory });
    });
});

app.get('/load-inventory/:characterName', (req, res) => {
    const { characterName } = req.params;
    const filePath = getFilePath(characterName);

    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Character not found' });

    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    res.json(data.Inventory);
});

app.get('/load-cropType/:characterName', (req, res) => {
    const { characterName } = req.params;
    const filePath = getFilePath(characterName);

    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Character not found' });

    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    const cropType = data.ActiveCrops.map(c => c.cropType);
    const plantTime = data.ActiveCrops.map(c => c.plantTime);
    const growEndTime = data.ActiveCrops.map(c => c.growEndTime);

    res.json({ cropType, plantTime, growEndTime });
});

app.post('/addItem2Inv', (req, res) => {
    const { characterName, itemName, ID } = req.body;
    const filePath = getFilePath(characterName);

    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Character not found' });

    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    // Check if the item already exists in inventory
    const inventoryIndex = data.Inventory.findIndex(item => item.startsWith(itemName));
    
    if (inventoryIndex !== -1) {
        // CASE 1: Item exists, increment the count
        const oldInvString = data.Inventory[inventoryIndex];
        const parts = oldInvString.split('-');
        const newCount = parseInt(parts[1]) + 1;
        const newInvString = `${parts[0]}-${newCount}`;
        data.Inventory[inventoryIndex] = newInvString;
    } else {
        // CASE 2: Item does NOT exist (First harvest), add it to inventory
        // Format: "itemName-1"
        data.Inventory.push(`${itemName}-1`);
    }

    // Remove the crop from the field (ActiveCrops)
    // Note: Ensure the frontend sends 'itemName' exactly matching what was saved in 'save-plant'
    // Usually save-plant saves "carrotCrop", and here you receive "carrotCrop".
    const cropIdToRemove = `${itemName}-${ID}`;
    data.ActiveCrops = data.ActiveCrops.filter(crop => crop.cropType !== cropIdToRemove);

    fs.writeFile(filePath, JSON.stringify(data, null, 2), (err) => {
        if (err) return res.status(500).send('Error updating inventory');
        
        // Respond with success
        res.json({ 
            message: 'Inventory updated successfully', 
            // Return the updated item string (either new or updated)
            newInventory: inventoryIndex !== -1 ? data.Inventory[inventoryIndex] : `${itemName}-1`
        });
    });
});

app.post('/cheatAddItem2Inv', (req, res) => {
    const { characterName, ItemName, Amount } = req.body;
    const filePath = getFilePath(characterName);

    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Character not found' });

    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    const inventoryIndex = data.Inventory.findIndex(item => item.includes(ItemName));

    if (inventoryIndex === -1) {
        return res.status(500).json({ error: 'Item not found in inventory' });
    }

    const oldInvString = data.Inventory[inventoryIndex];
    const newInvString = oldInvString.replace(/(\d+)$/, (match) => parseInt(match, 10) + Amount);
    
    data.Inventory[inventoryIndex] = newInvString;

    fs.writeFile(filePath, JSON.stringify(data, null, 2), (err) => {
        if (err) return res.status(500).send('Error updating inventory');
        res.json({ message: 'Inventory updated successfully', newInventory: newInvString });
    });
});

app.get('/', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'HomePage.html')); });
app.get('/home', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'GameHomePage.html')); });
app.get('/create-character', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'CreateCharacterPage.html')); });
app.get('/my-farm', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'MyFarm.html')); });
app.get('/fishing', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'Fishing.html')); });

app.get('/asd', (req, res) => { res.sendFile(path.join(__dirname, 'asd.html')); });
app.get('/image', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'img/icon/Cashier.png')); });


app.use(express.static(path.join(__dirname, 'public')));

if (require.main === module) {
    // If run directly (node server.js), start the server
    const PORT = process.env.PORT || 3005;
    app.listen(PORT, () => console.log(`✅ Local running on ${PORT}`));
}

// Export the app for serverless environments (Vercel, AWS Lambda, etc.)
module.exports = app;