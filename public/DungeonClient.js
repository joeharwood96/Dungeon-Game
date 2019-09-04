/*
 * These three variables hold information about the dungeon, received from the server
 * via the "dungeon data" message. Until the first message is received, they are
 * initialised to empty objects.
 *
 * - dungeon, an object, containing the following variables:
 * -- maze: a 2D array of integers, with the following numbers:
 * --- 0: wall
 * --- 1: corridor
 * --- 2+: numbered rooms, with 2 being the first room generated, 3 being the next, etc.
 * -- h: the height of the dungeon (y dimension)
 * -- w: the width of the dungeon (x dimension)
 * -- rooms: an array of objects describing the rooms in the dungeon, each object contains:
 * --- id: the integer representing this room in the dungeon (e.g. 2 for the first room)
 * --- h: the height of the room (y dimension)
 * --- w: the width of the room (x dimension)
 * --- x: the x coordinate of the top-left corner of the room
 * --- y: the y coordinate of the top-left corner of the room
 * --- cx: the x coordinate of the centre of the room
 * --- cy: the y coordinate of the centre of the room
 * -- roomSize: the average size of the rooms (as used when generating the dungeon)
 * -- _lastRoomId: the id of the next room to be generated (so _lastRoomId-1 is the last room in the dungeon)
 *
 * - dungeonStart
 * -- x, the row at which players should start in the dungeon
 * -- y, the column at which players should start in the dungeon
 *
 * - dungeonEnd
 * -- x, the row where the goal space of the dungeon is located
 * -- y, the column where the goal space of the dungeon  is located
 */
let dungeon = {};
let dungeonStart = {};
let dungeonEnd = {};

/**
 * - Create the object drawPlayer, this object
 * is used to drw the clients player object,
 * it stores the source images x and y positions 
 * the size of the image and the sprite length
 */

let drawPlayer = {
    sourceX: 0,
    sourceY: 0,
    sourceW: 546,
    sourceH: 576,
    size: 20,
    spriteLength: 1584
};

//Create an empty player object to be used later
let player = {};
//Create a empty array of players to be used later
let players = [];
//Declare a counter and set it to zero
let counter = 0;

// load a spritesheet (dungeon_tiles.png) which holds the tiles
// we will use to draw the dungeon
// Art by MrBeast. Commissioned by OpenGameArt.org (http://opengameart.org)
const tilesImage = new Image();
tilesImage.src = "dungeon_tiles.png";

// load the spritesheet (PlayerOneIdle.png) which holds the images for player one
const playerOneImage = new Image();
playerOneImage.src = "images/sprite/player/PlayerOneIdle.png";
// load the spritesheet (playerTwoIdle.png) which holds the images for the new players
const newplayerImage = new Image();
newplayerImage.src = "images/sprite/player/playerTwoIdle.png";
/* 
 * Establish a connection to our server
 * We will need to reuse the 'socket' variable to both send messages
 * and receive them, by way of adding event handlers for the various
 * messages we expect to receive
 *
 * Replace localhost with a specific URL or IP address if testing
 * across multiple computers
 *
 * See Real-Time Servers III: socket.io and Messaging for help understanding how
 * we set up and use socket.io
 */
const socket = io.connect("localhost:8081");

/*
 * This is the event handler for the 'dungeon data' message
 * When a 'dungeon data' message is received from the server, this block of code executes
 * 
 * The server is sending us either initial information about a dungeon, or,
 * updated information about a dungeon, and so we want to replace our existing
 * dungeon variables with the new information.
 *
 * We know the specification of the information we receive (from the documentation
 * and design of the server), and use this to help write this handler.
 */
socket.on("dungeon data", function (data) {
    dungeon = data.dungeon;
    dungeonStart = data.startingPoint;
    dungeonEnd = data.endingPoint;
});



/*
 * The identifySpaceType function takes an x, y coordinate within the dungeon and identifies
 * which type of tile needs to be drawn, based on which directions it is possible
 * to move to from this space. For example, a tile from which a player can move up
 * or right from needs to have walls on the bottom and left.
 *
 * Once a tile type has been identified, the necessary details to draw this
 * tile are returned from this method. Those details specifically are:
 * - tilesetX: the x coordinate, in pixels, within the spritesheet (dungeon_tiles.png) of the top left of the tile
 * - tilesetY: the y coordinate, in pixels, within the spritesheet (dungeon_tiles.png) of the top left of the tile
 * - tilesizeX: the width of the tile
 * - tilesizeY: the height of the tile
 */
function identifySpaceType(x, y) {

    let returnObject = {
        spaceType: "",
        tilesetX: 0,
        tilesetY: 0,
        tilesizeX: 16,
        tilesizeY: 16
    };

    let canMoveUp = false;
    let canMoveLeft = false;
    let canMoveRight = false;
    let canMoveDown = false;

    // check for out of bounds (i.e. this move would move the player off the edge,
    // which also saves us from checking out of bounds of the array) and, if not
    // out of bounds, check if the space can be moved to (i.e. contains a corridor/room)
    if (x - 1 >= 0 && dungeon.maze[y][x - 1] > 0) {
        canMoveLeft = true;
    }
    if (x + 1 < dungeon.w && dungeon.maze[y][x + 1] > 0) {
        canMoveRight = true;
    }
    if (y - 1 >= 0 && dungeon.maze[y - 1][x] > 0) {
        canMoveUp = true;
    }
    if (y + 1 < dungeon.h && dungeon.maze[y + 1][x] > 0) {
        canMoveDown = true;
    }


    if (canMoveUp && canMoveRight && canMoveDown && canMoveLeft) {
        returnObject.spaceType = "all_exits";
        returnObject.tilesetX = 16;
        returnObject.tilesetY = 16;
    }
    else if (canMoveUp && canMoveRight && canMoveDown) {
        returnObject.spaceType = "left_wall";
        returnObject.tilesetX = 0;
        returnObject.tilesetY = 16;
    }
    else if (canMoveRight && canMoveDown && canMoveLeft) {
        returnObject.spaceType = "up_wall";
        returnObject.tilesetX = 16;
        returnObject.tilesetY = 0;
    }
    else if (canMoveDown && canMoveLeft && canMoveUp) {
        returnObject.spaceType = "right_wall";
        returnObject.tilesetX = 32;
        returnObject.tilesetY = 16;
    }
    else if (canMoveLeft && canMoveUp && canMoveRight) {
        returnObject.spaceType = "down_wall";
        returnObject.tilesetX = 16;
        returnObject.tilesetY = 32;
    }
    else if (canMoveUp && canMoveDown) {
        returnObject.spaceType = "vertical_corridor";
        returnObject.tilesetX = 144;
        returnObject.tilesetY = 16;
    }
    else if (canMoveLeft && canMoveRight) {
        returnObject.spaceType = "horizontal_corridor";
        returnObject.tilesetX = 112;
        returnObject.tilesetY = 32;
    }
    else if (canMoveUp && canMoveLeft) {
        returnObject.spaceType = "bottom_right";
        returnObject.tilesetX = 32;
        returnObject.tilesetY = 32;
    }
    else if (canMoveUp && canMoveRight) {
        returnObject.spaceType = "bottom_left";
        returnObject.tilesetX = 0;
        returnObject.tilesetY = 32;
    }
    else if (canMoveDown && canMoveLeft) {
        returnObject.spaceType = "top_right";
        returnObject.tilesetX = 32;
        returnObject.tilesetY = 0;
    }
    else if (canMoveDown && canMoveRight) {
        returnObject.spaceType = "top_left";
        returnObject.tilesetX = 0;
        returnObject.tilesetY = 0;
    }
    return returnObject;
}

//Set the movement variables to true
let canMoveLeft = true;
let canMoveRight = true;
let canMoveDown = true;
let canMoveUp = true;

$(document).ready(function () {

    /**
     * emit the start message to let the server know 
     * that a player has joined the game
     */
    socket.emit("start");

    //recieve the player message from the server
    socket.on("player", function(data){
        //update the player object with the data sent from the server
        player = data;
        //Append the players score to the score div in the html
        $("#username").append("<p style='color: #BC2020;'>Username: " + player.playerID +"</p>");
        $("#score").append("<p style='color: #BC2020;'>Score: " + player.score +"</p>");
    });
    //recieve the update message from the server
    socket.on("update", function(data) {
        //replace the players array with the data sent from the server
        players = data;
    });
    //recieve the player restart message from the server
    socket.on("player restart", function(data){
        //update the player x and y coordinates with the data x and y
        player.x = data.x;
        player.y = data.y;
    });
    //recieve the update score message
    socket.on("update score", function(data){
        //replace the players score with the data sent from the server
        player.score = data;
        //replace the div appended previously in the html with the updated player score 
        $("#score").html("<p style='color: #BC2020;'>Score: " + player.score +"</p>");
        console.log(player.score);
    });
    //recieve the highscore message
    socket.on("highscore", function(data){
        //for each player in the data array 
        //replace the table data
        $("#user1st").html(data[0].playerid);
        $("#score1st").html(data[0].score);
        $("#user2nd").html(data[1].playerid);
        $("#score2nd").html(data[1].score);
        $("#user3rd").html(data[2].playerid);
        $("#score3rd").html(data[2].score);
    });

    //Arrow key events 
    $(document).keydown(function(e){
        //Check if left arrow key is pressed
        if (e.which==37){
            if(canMoveLeft == true){
                left();
            }
        }
        //Check if right arrow key is pressed
        if (e.which==39){
            if(canMoveRight == true){ 
                right();
            }
        }
        //Check if up arrow key is pressed
        if (e.which==38){
            if(canMoveUp == true){
                up();
            }
        }
        //Check if down arrow key is pressed
        if (e.which==40){
            if(canMoveDown == true){
                down();
            }
        }
        
    });

    //Mouse clicked events
    //Check if left button has been clicked
    $("#left").mousedown(function(){
        if(canMoveLeft == true){
            left();
        }
    });
    //Check if right button has been clicked
    $("#right").mousedown(function(){
        if(canMoveRight == true){
            right();
        }
    });
    //Check if up button has been clicked
    $("#up").mousedown(function(){
        if(canMoveUp == true){
            up();
        }
    });
    //Check if down button has been clicked
    $("#down").mousedown(function(){
        if(canMoveDown == true){
            down();
        }
    });

    //Touchscreen events 
    //Check if right button has been clicked on touchscreen
    $("#right").on("tap",function(){
        if(canMoveLeft == true){
            right();
        }
    });
    //Check if left button has been clicked on touchscreen
    $("#left").on("tap",function(){
        if(canMoveRight == true){
            left();
        }
    });
    //Check if up button has been clicked on touchscreen
    $("#up").on("tap",function(){
        if(canMoveUp == true){
            up();
        }
    });
    //Check if down button has been clicked on touchscreen
    $("#down").on("tap",function(){
        if(canMoveDown == true){
            down();
        }
    });
    
    startAnimating(60); 

});


/*
 * Once our page is fully loaded and ready, we call startAnimating
 * to kick off our animation loop.
 * We pass in a value - our fps - to control the speed of our animation.
 */
let fpsInterval;
let then;

/*
 * The startAnimating function kicks off our animation (see Games on the Web I - HTML5 Graphics and Animations).
 */
function startAnimating(fps) {
    fpsInterval = 1000 / fps;
    then = Date.now();
    animate();
}

/*
 * The animate function is called repeatedly using requestAnimationFrame (see Games on the Web I - HTML5 Graphics and Animations).
 */
function animate() {
    requestAnimationFrame(animate);

    let now = Date.now();
    let elapsed = now - then;
    

    if (elapsed > fpsInterval) {
        then = now - (elapsed % fpsInterval);
        // Acquire both a canvas (using jQuery) and its associated context
        let canvas = $("canvas").get(0);
        let context = canvas.getContext("2d");

        // Calculate the width and height of each cell in our dungeon
        // by diving the pixel width/height of the canvas by the number of
        // cells in the dungeon
        let cellWidth = canvas.width / dungeon.w;
        let cellHeight = canvas.height / dungeon.h;

        
        // Clear the drawing area each animation cycle
        context.clearRect(0, 0, canvas.width, canvas.height);

        
        /* We check each one of our tiles within the dungeon using a nested for loop
         * which runs from 0 to the width of the dungeon in the x dimension
         * and from 0 to the height of the dungeon in the y dimension
         *
         * For each space in the dungeon, we check whether it is a space that can be
         * moved into (i.e. it isn't a 0 in the 2D array), and if so, we use the identifySpaceType
         * method to check which tile needs to be drawn.
         *
         * This returns an object containing the information required to draw a subset of the
         * tilesImage as appropriate for that tile.
         * See: https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage
         * to remind yourself how the drawImage method works.
         */
        for (let x = 0; x < dungeon.w; x++) {
            for (let y = 0; y < dungeon.h; y++) {
                if (dungeon.maze[y][x] > 0) {
                    let tileInformation = identifySpaceType(x, y);
                    context.drawImage(tilesImage,
                        tileInformation.tilesetX,
                        tileInformation.tilesetY,
                        tileInformation.tilesizeX,
                        tileInformation.tilesizeY,
                        x * cellWidth,
                        y * cellHeight,
                        cellWidth,
                        cellHeight);
                } else {
                    context.fillStyle = "black";
                    context.fillRect(
                        x * cellWidth,
                        y * cellHeight,
                        cellWidth,
                        cellHeight
                    );
                }
            }
        }

        
        // The start point is calculated by multiplying the cell location (dungeonStart.x, dungeonStart.y)
        // by the cellWidth and cellHeight respectively
        // Refer to: Games on the Web I - HTML5 Graphics and Animations, Lab Exercise 2
        context.drawImage(tilesImage,
            16, 80, 16, 16,
            dungeonStart.x * cellWidth,
            dungeonStart.y * cellHeight,
            cellWidth,
            cellHeight);

        // The goal is calculated by multiplying the cell location (dungeonEnd.x, dungeonEnd.y)
        // by the cellWidth and cellHeight respectively
        // Refer to: Games on the Web I - HTML5 Graphics and Animations, Lab Exercise 2
        context.drawImage(tilesImage,
            224, 80, 16, 16,
            dungeonEnd.x * cellWidth,
            dungeonEnd.y * cellHeight,
            cellWidth,
            cellHeight);
        
        //Draw client player on the canvas using 
        //The drawPlayer and player objects   
        context.drawImage(
            playerOneImage, 
            drawPlayer.sourceX, 
            drawPlayer.sourceY, 
            drawPlayer.sourceW, 
            drawPlayer.sourceH,
            player.x * (canvas.width / cellWidth), 
            player.y * (canvas.height / cellHeight), 
            canvas.width / drawPlayer.size, 
            canvas.height / drawPlayer.size
        );

        //Set the font for the player text
        context.font = "10px Arial";
        //Set the colour 
        context.fillStyle = "blue";
        //Center the text
        context.textAlign = "center";
        //Create the text "Player" at the positions of the player
        context.fillText(
            "Player", 
            (player.x * (canvas.width / cellWidth)) + 10, 
            player.y * (canvas.height / cellHeight)
        );
        //Increment the counter by 1 every animation cycle  
        counter++;
        
        //Implement the counter to slow down the annimation 
        //every 10 cycles draw player one and cycle through
        //the sprite 
        if(counter % 10 == 0){
            if(drawPlayer.sourceX <= drawPlayer.spriteLength){
                drawPlayer.sourceX = drawPlayer.sourceX + drawPlayer.sourceW;
            }
            else
            {
                drawPlayer.sourceX = 0;
            }
        }

        //Check that player one is within the maze boundry by ensuring that 
        //its position is on a tile that is above one, if player is in the
        //boundry set to true else set to false 
        if (player.x - 1 >= 0 && dungeon.maze[player.y][player.x - 1] > 0) {
            canMoveLeft = true;
        }else {
            canMoveLeft = false;
        }
        if (player.x + 1 < dungeon.w && dungeon.maze[player.y][player.x + 1] > 0) {
            canMoveRight = true;
        }else {
            canMoveRight = false;
        }
        if (player.y - 1 >= 0 && dungeon.maze[player.y - 1][player.x] > 0) {
            canMoveUp = true;
        } else {
            canMoveUp = false;
        }
        if (player.y + 1 < dungeon.h && dungeon.maze[player.y + 1][player.x] > 0) {
            canMoveDown = true;
        } else {
            canMoveDown = false;
        }
        
        
        for (let i = 0; i < players.length; i++) {
            /**
             * For each player in the players array 
             * that does not equal the ID of the clients playerID
             * draw the player using the drawPlayer object and 
             * the players object 
             */
            if(players[i].playerID != socket.id){

                context.drawImage(
                    newplayerImage, 
                    drawPlayer.sourceX, 
                    drawPlayer.sourceY, 
                    drawPlayer.sourceW, 
                    drawPlayer.sourceH,
                    players[i].x * (canvas.width / cellWidth), 
                    players[i].y * (canvas.height / cellHeight), 
                    canvas.width / drawPlayer.size, 
                    canvas.height / drawPlayer.size
                );

                //Set the font for the player text
                context.font = "10px Arial";
                //Set the colour
                context.fillStyle = "red";
                //Center the text
                context.textAlign = "center";
                //Create the text "Player" at the positions of the player
                context.fillText(
                    "Player", 
                    (players[i].x * (canvas.width / cellWidth)) + 10, 
                    players[i].y * (canvas.height / cellHeight)
                );

            } 
           
        }
    
    }
      
}

function left() {
    //Minus 1 from the player x position 
    player.x--;
                
    player.x = player.x;
    player.y = player.y;
    //Emit the new player coordinates to the server
    socket.emit("player coordinates", player);
}

function right() {
    //Plus 1 to the player x position 
    player.x++;
             
    player.x = player.x;
    player.y = player.y;
    //Emit the new player coordinates to the server
    socket.emit("player coordinates", player);
}

function up() {
    //Minus 1 to the player y position
    player.y--;
                
    player.x = player.x;
    player.y = player.y;
    //Emit the new player coordinates to the server
    socket.emit("player coordinates", player);
}

function down() {
    //Plus 1 to the player y position
    player.y++;
                
    player.x = player.x;
    player.y = player.y;
    //Emit the new player coordinates to the server
    socket.emit("player coordinates", player);
}
