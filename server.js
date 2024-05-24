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

app.post('/create-character', (req, res) => {
    const { characterName } = req.body;
    if (!characterName) {
        return res.status(400).send('Character name is required');
    }

    const filePath = path.join(__dirname, 'SaveGame', `${characterName}.save`);
    const PlayerName = "Character Name : " + characterName;
    fs.writeFile(filePath, PlayerName, (err) => {
        if (err) {
            return res.status(500).send('Failed to create file');
        }
        res.send('File created successfully');
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
