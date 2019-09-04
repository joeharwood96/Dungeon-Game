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

// try to create the database dungeonGame
connection.query("CREATE DATABASE IF NOT EXISTS dungeonGame;", function(error, result, fields) {
	if (error) {
		console.log("Error creating database: " + error.code);
	}
	else if (result) {
		console.log("Database created successfully.");
	}
});

//Use the dungeonGame database
connection.query("USE dungeonGame;", function(error, result, fields) {
	if (error) {
		console.log("Error setting database: " + error.code);
	}
	else if (result) {
		console.log("Database successfully set.");
	}
});

// drop the players table before re-creating 
connection.query("DROP TABLE IF EXISTS players", function(error, result, fields) {
	if (error) { 
		// for a deployment app, we'd be more likely to use error.stack
		// which gives us a full stack trace
		console.log("Problem dropping players table: " + error.code);
	}
	else if (result) { 
		console.log("Players table dropped successfully.");
	}
});
// create the players table
var createPlayerTableQuery = "CREATE TABLE players(";
	createPlayerTableQuery += "playerid 		VARCHAR (32)    ,";
	createPlayerTableQuery += "score 			INT				,";
	createPlayerTableQuery += "PRIMARY KEY (playerid)";
	createPlayerTableQuery += ")";
	
connection.query(createPlayerTableQuery, function(error, result, fields){
	
	if (error) { 
		console.log("Error creating players table: " + error.code); 
	}
	else if (result) {
		console.log("Players table created successfully.");
	}
	
});

for (i = 0; i < 3; i++)
{
	// we temporarily store the generated data in an object (called newPlayer)
	var newPlayer = {
		playerid: "Player" + i,
		score: 0
	};
	
	// and then use the ? notation to complete our SQL query - note that the member names in the object
	// have to match up to our column names in the database
	// e.g. "playerid" in the newPlayer object matches "playerid" in the players table
	connection.query("INSERT INTO players SET ?", newPlayer, function (error, result, fields) {
		
		if (error) {
			console.log(error.stack);
		}
		
		if (result)
		{
			console.log("Row inserted successfully.");
		}
		
	});
}

// close the connection cleanly, to ensure all of our queries have finished executing
connection.end(function(){
	console.log("Script has finished executing.");
});