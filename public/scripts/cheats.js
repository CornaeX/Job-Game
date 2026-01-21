function help() {
    console.log("hi")
}

async function AddInv(ItemNum, Amount) {

    const characterName = localStorage.getItem('characterName');

    if (Number.isInteger(ItemNum) && Number.isInteger(Amount)) {

        const ItemName = Number2ItemName(ItemNum);

        try {
            const updateResponse = await fetch('/cheatAddItem2Inv', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ characterName, ItemName, Amount })
            });

        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred while updating farming experience.');
        }
    }

    // const isFromConsole = (function() {
    //     const origLog = console.log;
    //     let isCalled = false;

    //     console.log = function() {
    //         isCalled = true;
    //         origLog.apply(console, arguments);
    //     };

    //     console.log('');
    //     console.log = origLog;

    //     return isCalled;
    // })();

    // if (isFromConsole) {
    //     console.log(`Function called from console with amount: ${amount}`);
    // } else {
    //     console.log("This function can only be called from the console.");
    // }
}

function Number2ItemName(ItemNum) {

    let ItemName = "";

    switch (ItemNum) {
        case 1:
            ItemName = "CarrotSeed";
            break;
        case 2:
            ItemName = "StrawberrySeed";
            break;
        case 3:
            ItemName = "TomatoSeed";
            break;
        case 4:
            ItemName = "AppleSeed";
            break;
        case 5:
            ItemName = "KiwiSeed";
            break;
        case 6:
            ItemName = "OrangeSeed";
            break;
        case 7:
            ItemName = "CornSeed";
            break;
        case 8:
            ItemName = "WheatSeed";
            break;
        case 9:
            ItemName = "PumpkinSeed";
            break;
        case 10:
            ItemName = "CarrotCrop";
            break;
        case 11:
            ItemName = "StrawberryCrop";
            break;
        case 12:
            ItemName = "TomatoCrop";
            break;
        case 13:
            ItemName = "AppleCrop";
            break;
        case 14:
            ItemName = "KiwiCrop";
            break;
        case 15:
            ItemName = "OrangeCrop";
            break;
        case 16:
            ItemName = "CornCrop";
            break;
        case 17:
            ItemName = "WheatCrop";
            break;
        case 18:
            ItemName = "PumpkinCrop";
            break;
        case 19:
            ItemName = "Worms";
            break;
        case 20:
            ItemName = "Lures";
            break;
        case 21:
            ItemName = "Minnow";
            break;
        case 22:
            ItemName = "Tuna";
            break;
        case 23:
            ItemName = "Salmon";
            break;
        case 24:
            ItemName = "Cod";
            break;
        case 25:
            ItemName = "Trout";
            break;
        case 26:
            ItemName = "Mackerel";
            break;
        case 27:
            ItemName = "Perch";
            break;
        case 28:
            ItemName = "Carp";
            break;
        case 29:
            ItemName = "Catfish";
            break;
        case 30:
            ItemName = "Sardine";
            break;
        default:
            ItemName = "";
    }
    
    return ItemName;

}