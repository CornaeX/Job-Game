window.onload = function() {
    // Get the elements by their IDs
    const characterNameElement = document.getElementById('characterName');
    const moneyElement = document.getElementById('money');

    // Extract the text content from the elements
    const characterNameText = characterNameElement.textContent;
    const moneyText = moneyElement.textContent;

    // Use a regular expression to extract the actual values
    const characterNameMatch = characterNameText.match(/Character_Name:\s*(.*)/);
    const moneyMatch = moneyText.match(/Money:\s*(\d+)/);

    if (characterNameMatch && moneyMatch) {
        const characterName = characterNameMatch[1];
        const money = parseInt(moneyMatch[1], 10);

        // Log the extracted values
        console.log('Character Name:', characterName);
        console.log('Money:', money);
    } else {
        console.error('Failed to parse character name or money.');
    }
};
