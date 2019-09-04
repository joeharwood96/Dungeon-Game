//Import mysql 
var mysql = require("mysql");

//Set up the credentials for a connection
var connection = mysql.createConnection({
	host: 'localhost',
	port: 3306,
	user: 'root',
	password: ''
});

// establish a connection
connection.connect();

//Use the dungeonGame database
connection.query("USE dungeonGame;", function(error, result, fields) {
	if (error) {
		console.log("Error setting database: " + error.code);
	}
	else if (result) {
		console.log("Database successfully set.");
	}
});

// See Real-Time Servers II: File Servers for understanding 
// how we set up and use express
const express = require("express");
const app = express();
const server = require("http").Server(app);
const io = require("socket.io")(server);

// We will use the dungeongenerator module to generate random dungeons
// Details at: https://www.npmjs.com/package/dungeongenerator
// Source at: https://github.com/nerox8664/dungeongenerator
const DungeonGenerator = require("dungeongenerator");

// We are going to serve our static pages from the public directory
// See Real-Time Servers II: File Servers for understanding
// how we set up and use express
app.use(express.static("public"));

/*  These variables store information about the dungeon that we will later
 *  send to clients. In particular:
 *  - the dungeonStart variable will store the x and y coordinates of the start point of the dungeon
 *  - the dungeonEnd variable will store the x and y coordinates of the end point of the dungeon
 *  - the dungeonOptions object contains four variables, which describe the default state of the dungeon:
 *  - - dungeon_width: the width of the dungeon (size in the x dimension)
 *  - - dungeon_height: the height of the dungeon (size in the y dimension)
 *  - - number_of_rooms: the approximate number of rooms to generate
 *  - - average_room_size: roughly how big the rooms will be (in terms of both height and width)
 *  - this object is passed to the dungeon constructor in the generateDungeon function
 */
let dungeon = {};
let dungeonStart = {};
let dungeonEnd = {};
const dungeonOptions = {
    dungeon_width: 20,
    dungeon_height: 20,
    number_of_rooms: 6,
    average_room_size: 8
};
// Initialize the players array
let players = [];
// Initialize the player object
let player = {};
/*
 * The getDungeonData function packages up important information about a dungeon
 * into an object and prepares it for sending in a message. 
 *
 * The members of the returned object are as follows:
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
 * - startingPoint
 * -- x: the column at which players should start in the dungeon
 * -- y: the row at which players should start in the dungeon
 *
 * - endingPoint
 * -- x: the column where the goal space of the dungeon is located
 * -- y: the row where the goal space of the dungeon is located
 *
 */
function getDungeonData() {
    return {
        dungeon,
        startingPoint: dungeonStart,
        endingPoint: dungeonEnd
    };
}
//Send the updated coordinates every 500 miliseconds 
setInterval(coordinates, 500);
//Emit the updated coordinates 
function coordinates() {
    io.sockets.emit("update", players);
}


/*
 * This is our event handler for a connection.
 * That is to say, any code written here executes when a client makes a connection to the server
 * (i.e. when the page is loaded)
 * 
 * See Real-Time Servers III: socket.io and Messaging for help understanding how
 * we set up and use socket.io
 */
io.on("connection", function (socket) {

    // Print an acknowledge to the server's console to confirm a player has connected
    console.log("A player has connected: " + socket.id + " - sending dungeon data...");

    /*
     * Here we send all information about a dungeon to the client that has just connected
     * For full details about the data being sent, check the getDungeonData method
     * This message triggers the socket.on("dungeon data"... event handler in the client
     */
    socket.emit("dungeon data", getDungeonData());

    // Start message is recieved from the client indicating that a player has joined 
    // the game
    socket.on("start", function (){
        
        /**
         * A new player object is created 
         * taking the socket.id and the 
         * dungeons starting position 
         * also setting the score to zero
         */
        player = {
            playerID: socket.id,
            x: dungeonStart.x,
            y: dungeonStart.y,
            score: 0
        };

        //This message emits the new player object back to the client
        socket.emit("player", player);
        //Add the new player message to the players array
        players.push(player);
        //Try to insert the new player into the players table
        connection.query("INSERT INTO players (playerid, score) VALUES ('"+player.playerID+"',"+player.score+")", function(error, result, fields) {
            if (error) {
                console.log("Error inserting player: " + error.code);
            }
            else if (result) {
                console.log("Player inserted successfully.");
            }
        });
        //try to select the top 3 players with the highest scores
        connection.query("SELECT * FROM players order by score desc Limit 3;", function(error, results, fields) {
            if (error) { 
                console.log(error); 
            }
            else if (results.length > 0)
            {
                io.sockets.emit("highscore", results);
            }
        });
    });
    
    /**
     * When a player disconnects from the server 
     * the player is identified using the playerID
     * then spliced from the array
     */
    socket.on('disconnect', function () {
        console.log(socket.id + ' has disconnected');
        for(let i = 0; i < players.length; i++){
            if(socket.id == players[i].playerID){
               players.splice(i, 1);
            }
        } 
    });


    /**
     * Reciving the player coordinated from the client 
     * every time a player is moved
     */

    socket.on("player coordinates", function(data) { 

        let player;
        /**
         * Find the player in the array that has been moved using 
         * their playerID
         */
        for(let i = 0; i < players.length; i++){
            if(socket.id == players[i].playerID){
                player = players[i];
            }
        }    

        //Update the players x and y positions
        player.x = data.x;
        player.y = data.y;

        //Check is a player has reached the end of the dungeon
        if(player.x == dungeonEnd.x && player.y == dungeonEnd.y){
            //Increase the players score by 10
            player.score = player.score + 10;

            //Generate and emit a new dungeon
            generateDungeon();
            io.emit("dungeon data", getDungeonData());

            //Set all player positions back to dungeonStart
            for(let i = 0; i < players.length; i++){
                players[i].x = dungeonStart.x;
                players[i].y = dungeonStart.y;
            }
            /**
             * Create a object that sets all of the player coordinates 
             * to the new dungeon's starting position
             */
            playerRestart = {
                x: dungeonStart.x,
                y: dungeonStart.y
            };

            //Emit the player restart positions 
            io.sockets.emit("player restart", playerRestart);
            /**
             * try to update the players score where the playerid is equal to
             * the player we wish to update
             */
            connection.query("UPDATE players SET score =" +player.score+ " WHERE playerid = '" +player.playerID+"' ;", function(error, result, fields) {
                if (error) {
                    console.log("Error updating player: " + error.code);
                }
                else if (result) {
                    console.log("Player update successfully.");
                }
            });
            /**
             * select all from the players table where the playerid is equal to
             * the player we wish to select
             */
            connection.query("SELECT * FROM players WHERE playerID ='" + player.playerID +"';", function(error, results, fields) {
                if (error) { console.log(error); }
                for (i = 0; i < results.length; i++)
                {
                    // set the players score to the result of the query 
                    player.score = results[i].score; 
                    // emit the updated player score
                    socket.emit("update score", player.score);

                    console.log("Player: " + results[i].playerid);
                    console.log("Score : " + results[i].score);
                    console.log("----");
                }
            });
            //try to select the top 3 players with the highest scores
            connection.query("SELECT * FROM players order by score desc Limit 3;", function(error, results, fields) {
                if (error) { console.log(error); }
                else
                //for (i = 0; i < results.length; i++)
                if (results.length > 0)
                {
                    io.sockets.emit("highscore", results);
                }
            });
        }
    });

});

/*
 * This method locates a specific room, based on a given index, and retrieves the
 * centre point, and returns this as an object with an x and y variable.
 * For example, this method given the integer 2, would return an object
 * with an x and y indicating the centre point of the room with an id of 2.
 */
function getCenterPositionOfSpecificRoom(roomIndex) {
    let position = {
        x: 0,
        y: 0
    };

    for (let i = 0; i < dungeon.rooms.length; i++) {
        let room = dungeon.rooms[i];
        if (room.id === roomIndex) {
            position.x = room.cx;
            position.y = room.cy;
            return position;
        }
    }
    return position;
}

/*
 * The generateDungeon function uses the dungeongenerator module to create a random dungeon,
 * which is stored in the 'dungeon' variable.
 *
 * Additionally, we find a start point (this is always the centre point of the first generated room)
 * and an end point is located (this is always the centre point of the last generated room).
 */
function generateDungeon() {
    dungeon = new DungeonGenerator(
        dungeonOptions.dungeon_height,
        dungeonOptions.dungeon_width,
        dungeonOptions.number_of_rooms,
        dungeonOptions.average_room_size
    );
    console.log(dungeon);
    dungeonStart = getCenterPositionOfSpecificRoom(2);
    dungeonEnd = getCenterPositionOfSpecificRoom(dungeon._lastRoomId - 1);
}

/*
 * Start the server, listening on port 8081.
 * Once the server has started, output confirmation to the server's console.
 * After initial startup, generate a dungeon, ready for the first time a client connects.
 *
 */
server.listen(8081, function () {
    console.log("Dungeon server has started - connect to http://localhost:8081");
    generateDungeon();
    console.log("Initial dungeon generated!");
});