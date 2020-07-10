let brain;
let testData = [];
let trainingData = [];
let mode = true;
let currentNum = 0;
let testsDone = 0;
let testsPerFrame = 100
let brainData;
let runningCorrect = 0;;

function preload() {
    //load brain data
    brainData = loadStrings("./brainData.txt")

    for (let i=0; i<10; i++) {
        trainingData.push([])

        for (let j=1; j<=500; j++) {
            trainingData[i].push(loadImage("./data/trainingSet/" + i.toString() + "/test-digit-(" + j.toString() + ").jpg"))
        }
    }
}

function setup() {
    createCanvas(1200, 600)

    brain = new network(28*28, 10, 4, 15)

    noStroke();
}

function trainMode() {
    background(0)

    fill(255)
    textSize(50)

    if (mode) {
        text("MODE: MANUAL-TRAIN\n(Press any key to advance time)", 300, 100)
    }
    else {text("MODE: AUTO-TRAIN", 300, 100)}

    //pick an image to train with
    let correctGuess = currentNum

    textSize(25)
    text("TESTS DONE: " + testsDone, 700, 200)
    text("CORRECT DIGIT: " + currentNum, 700, 250)

    let trainingImage = random(trainingData[correctGuess])
    rect(100, 200, 300, 300)
    image(trainingImage, 110, 210, 280, 280)

    trainingImage.loadPixels();

    let inputPixels = [];
    for (let i=0; i<trainingImage.pixels.length; i+=4) {
        inputPixels.push(trainingImage.pixels[i])
    }

    let botGuess = brain.test(inputPixels)

    text("BOT'S GUESS: " + botGuess[0], 700, 300)
    text("WITH " + map(botGuess[1], -1, 1, 0, 100).toFixed(2) + "% CERTAINTY", 700, 350)

    if (botGuess[0] == correctGuess) {
        fill(0, 255, 0)
        text("CORRECT", 700, 400)
        runningCorrect ++
    }

    else {
        fill(255, 0, 0)
        text("WRONG", 700, 400)
    }

    let actual = [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1];
    actual[correctGuess] = 1

    let loss = brain.train(botGuess[2], actual)

    fill(255)
    text("LOSS: " + loss, 700, 450)

    text("AVERAGE ACCURACY: " + (100*runningCorrect/testsDone).toFixed(2) + "%", 700, 500)

    text("CLICK TO CHANGE MODE", 700, 550)

    currentNum = floor(random(10))
    
    testsDone ++;
}

function draw() {
    trainMode();

    if (mode) {
        noLoop()
    }
}

function mouseClicked() {
    mode = !mode
    loop();
}

function keyTyped() {
    loop();
}