const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Use the CORS middleware
app.use(cors({
    origin: 'http://127.0.0.1:5500'
}));

// Serve static files from the "public" directory
app.use(express.static('public'));
app.use(express.json());

const saveGameDirectory = path.join(__dirname, 'SaveGame');

// Create the SaveGame directory if it doesn't exist
if (!fs.existsSync(saveGameDirectory)) {
    fs.mkdirSync(saveGameDirectory);
}

app.post('/.netlify/functions/server/create-character', (req, res) => {
    const { characterName } = req.body;
    if (!characterName) {
        return res.status(400).send('Character name is required');
    }

    const filePath = path.join(saveGameDirectory, `${characterName}.save`);

    // Check if a file with the same character name already exists
    if (fs.existsSync(filePath)) {
        return res.status(400).send('Character name already exists');
    }

    const fileContent = `Character_Name: ${characterName}\nMoney: 1000\nInventory: [AppleSeed-10 ,CarrotSeed-10 ,TomatoSeed-10]`;

    fs.writeFile(filePath, fileContent, (err) => {
        if (err) {
            return res.status(500).send('Failed to create file');
        }
        res.send('File created successfully');
    });
});

app.get('/.netlify/functions/server/list-saves', (req, res) => {
    fs.readdir(saveGameDirectory, (err, files) => {
        if (err) {
            return res.status(500).send('Failed to list files');
        }

        const saveFiles = files.map(file => {
            const filePath = path.join(saveGameDirectory, file);
            const content = fs.readFileSync(filePath, 'utf-8');
            const lines = content.split('\n');
            const characterNameLine = lines.find(line => line.startsWith('Character_Name'));
            const moneyLine = lines.find(line => line.startsWith('Money'));
            const inventoryLine = lines.find(line => line.startsWith('Inventory'));

            // Extracting character name
            const characterName = characterNameLine ? characterNameLine.split(': ')[1] : '';

            // Extracting money
            const money = moneyLine ? parseInt(moneyLine.split(': ')[1], 10) : 0;

            // Extracting inventory
            let inventory = [];
            if (inventoryLine) {
                const inventoryData = inventoryLine.slice(12); // Remove "Inventory: "
                const items = inventoryData.split(",");

                const itemNamePattern = /(\w+)-(\d+)/;
                items.forEach(item => {
                    const match = item.match(itemNamePattern);
                    if (match) {
                        const itemName = match[1];
                        const quantity = parseInt(match[2], 10);
                        inventory.push({ item: itemName, quantity: quantity });
                    } else {
                        console.log("Invalid item format:", item); // Handle invalid formats
                    }
                });
            }

            return {
                fileName: file,
                characterName: characterName,
                money: money,
                inventory: inventory,
            };
        });

        res.json(saveFiles);
    });
});

app.get('/.netlify/functions/server/load-save/:fileName', (req, res) => {
    const { fileName } = req.params;
    const filePath = path.join(saveGameDirectory, fileName);
    if (!fs.existsSync(filePath)) {
        return res.status(404).send('Save file not found');
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    res.send(content);
});

app.post('/.netlify/functions/server/update-farming-exp', (req, res) => {
    const { expIncrease, fileName, farmingLevel } = req.body;

    const FileName = `${fileName}.save`; // Replace with actual file name
    const filePath = path.join(saveGameDirectory, FileName);

    fs.readFile(filePath, 'utf-8', (err, data) => {
        if (err) {
            console.error('Failed to read save file:', err);
            return res.status(500).send('Failed to read save file');
        }

        let farmingExp = 0;
        let updatedData = data; // Store the initial data read from the file

        // Process each line to update farming experience
        const lines = data.split('\n');
        lines.forEach(line => {
            if (line.startsWith('Farming_EXP:')) {
                farmingExp = parseInt(line.split('Farming_EXP: ')[1].trim(), 10);
                farmingExp += expIncrease; // Increase by the specified amount
                updatedData = updatedData.replace(line, `Farming_EXP: ${farmingExp}`);
            }
        });

        // Check if enough EXP for level up
        const expToLevelUp = farmingLevel * 50; // Example: 50 EXP per level

        let levelUp = false;
        let newLevel = farmingLevel;

        if (farmingExp >= expToLevelUp) {
            newLevel++; // Increment level
            levelUp = true;

            // Modify updatedData to reflect the increased farming level
            const lines = updatedData.split('\n');
            lines.forEach((line, index) => {
                if (line.startsWith('Farming_Level:')) {
                    const currentLevel = parseInt(line.split('Farming_Level: ')[1].trim(), 10);
                    lines[index] = `Farming_Level: ${currentLevel + 1}`;
                }
                if (line.startsWith('Farming_EXP:')) {
                    lines[index] = 'Farming_EXP: 0';
                }
            });

            // Join the modified lines back into updatedData
            updatedData = lines.join('\n');
        }

        // Save updated data back to the file
        fs.writeFile(filePath, updatedData, 'utf-8', (err) => {
            if (err) {
                console.error('Failed to update save file:', err);
                return res.status(500).send('Failed to update save file');
            }

            res.json({ levelUp: levelUp, newLevel: newLevel });
        });
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});