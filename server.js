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

app.post('/create-character', (req, res) => {
    const { characterName } = req.body;
    if (!characterName) {
        return res.status(400).send('Character name is required');
    }

    const filePath = path.join(saveGameDirectory, `${characterName}.save`);

    // Check if a file with the same character name already exists
    if (fs.existsSync(filePath)) {
        return res.status(400).send('Character name already exists');
    }

    const fileContent = `Character Name: ${characterName}`;

    fs.writeFile(filePath, fileContent, (err) => {
        if (err) {
            return res.status(500).send('Failed to create file');
        }
        res.send('File created successfully');
    });
});

app.get('/list-saves', (req, res) => {
    fs.readdir(saveGameDirectory, (err, files) => {
        if (err) {
            return res.status(500).send('Failed to list files');
        }

        const saveFiles = files.map(file => {
            const filePath = path.join(saveGameDirectory, file);
            const content = fs.readFileSync(filePath, 'utf-8');
            const [nameLine] = content.split('\n');
            return {
                fileName: file,
                characterName: nameLine.split(': ')[1],
            };
        });

        res.json(saveFiles);
    });
});

app.get('/load-save/:fileName', (req, res) => {
    const { fileName } = req.params;
    const filePath = path.join(saveGameDirectory, fileName);
    if (!fs.existsSync(filePath)) {
        return res.status(404).send('Save file not found');
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    res.send(content);
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
