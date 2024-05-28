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

app.post('/create-character', (req, res) => {
    const { characterName } = req.body;
    if (!characterName) {
        return res.status(400).send('Character name is required');
    }

    // Determine the first available slot
    const slots = ['Savegame Slot 1', 'Savegame Slot 2', 'Savegame Slot 3'];
    let availableSlot = null;

    for (const slot of slots) {
        const slotFilePath = path.join(saveGameDirectory, `${characterName}-${slot}.save`);
        if (!fs.existsSync(slotFilePath)) {
            availableSlot = slot;
            break;
        }
    }

    if (!availableSlot) {
        return res.status(400).send('No available save slots');
    }

    const filePath = path.join(saveGameDirectory, `${characterName}-${availableSlot}.save`);
    const fileContent = `Character Name: ${characterName}\nSave Slot: ${availableSlot}`;

    fs.writeFile(filePath, fileContent, (err) => {
        if (err) {
            return res.status(500).send('Failed to create file');
        }
        res.send('File created successfully');
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
