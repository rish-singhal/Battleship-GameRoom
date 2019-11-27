const express = require('express')
const session = require('express-session')
const path = require('path')
var bodyParser = require('body-parser')
const NodeCache = require( "node-cache" )
const cors = require('cors')
var http = require('http')
/*
mongodb
*/
var mongoose = require('mongoose');
var mongoDB = 'mongodb://127.0.0.1/test_db';
mongoose.connect(mongoDB, { useNewUrlParser: true, useUnifiedTopology: true });
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
var UserSchema = new mongoose.Schema({
  username: {
    type: String,
    unique: true,
    required: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
  },
  is_active: {
    type: Boolean,
    required: true,
  }
});
var user = mongoose.model('users', UserSchema);
module.exports = user;
/*
mongodb
*/

const LIFETIME = 1000*60*60*1
const now = Date.now()
const {
	PORT = 3000,
	NODE_ENV = "dev",
	SESSION_NAME = now,
	SESSION_SECRET = "A secret key",
	SESSION_LIFETIME = LIFETIME
} = process.env

const IN_PROD = NODE_ENV === "prod"

var app = express()

var server = http.Server(app)

var io = require('socket.io')(server,{});
var SOCKET_LIST = [];

app.use(cors())

// Add headers
app.use(function (req, res, next) {

    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:8888');

    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', true);

    // Pass to next layer of middleware
    next();
});

const isActiveCache = new NodeCache()

const gameIdMapping = new NodeCache()

app.use(session({
	name: SESSION_NAME,
	resave: false,
	saveUninitialized: false,
	secret: SESSION_SECRET,
	cookie: {
		maxAge: SESSION_LIFETIME,
		sameSite: true,
		secure: IN_PROD

	}
}))

app.use(bodyParser.urlencoded({ extended: false }))
app.use('/static', express.static(path.join(__dirname, 'static')))
const redirectLogin = (req, res, next) => {
	if (!req.session.userId) {
		res.redirect('/login')
	}
	else{
		next()
	}
}

const redirectGameplay = (req, res, next) => {
	if (!req.session.userId) {
		return -1
	}
	else{
		next()
	}
}

const redirectHome = (req, res, next) => {
	if (req.session.userId) {
		res.redirect('/home')
	}
	else{
		next()
	}
}

/*
SOCKET.IO Code
*/

// handle incoming connections from clients
io.sockets.on('connection', function(socket) {
    // once a client has connected, we expect to get a ping from them saying they want a socket
    socket.on('sockName', function(sockName) {
    	socket.join(sockName);
    });
});


/*
SOCKET.IO Code
*/

app.get('/', redirectLogin, function(req, res){
	console.log(req.session)
	res.sendFile('test.html', {
        root: path.join(__dirname, './')
    });
})

app.get('/home', redirectLogin, function(req, res){
	res.sendFile('test.html', {
        root: path.join(__dirname, './')
    });
})

app.get('/gameplay', redirectGameplay, function(req, res){
	console.log("Inside gameplay get")
	res.sendFile('gameplay.html', {
        root: path.join(__dirname, './')
    });
})

app.get('/login', redirectHome, function(req, res){
	res.sendFile('login.html', {
        root: path.join(__dirname, './')
    });
})

app.post('/login', function(req, res){
	const {username, password} = req.body
	if (username && password){
		var query = user.find({ username: username});
		query.exec(function (err, docs) {
			if (0 == docs.length){
				console.log("username does not exist!!!")
				return -1;
			}
			var user_info_doc = docs[0];
			var username_doc = user_info_doc["username"];
			var password_doc = user_info_doc["password"];
			if (username==username_doc && password==password_doc){
				req.session.userId = user_info_doc["_id"]
				success = isActiveCache.set( req.session.userId.toString(), username, LIFETIME );
				if (success){
					console.log("Cache set")
				}
				else{
					console.log("Cache set failed")
				}
				return res.redirect('/home?user=' + username);
			}
			else{
				return res.redirect('/login')
			}
		})
	}
})

app.get('/register', function(req, res){

})

app.post('/register', function(req, res){

})

app.get('/logout', redirectLogin, function(req, res){
	userId = req.session.userId.toString()
	console.log("The username is ",isActiveCache.get(userId))
	req.session.destroy(err => {
		if (err){
			return res.redirect("/home")
		}
		else{
			success = isActiveCache.del(userId);
			if (success){
				console.log("Cache del")
			}
			else{
				console.log("Cache del failed")
			}
			res.clearCookie(SESSION_NAME)
			return res.redirect('/login')
		}

	})
})

app.get('/get_active_users', cors(), function(req, res){
	userIdList = isActiveCache.keys()
	activeUsers = []
	userIdList.forEach(function(userid){
	  activeUsers.push(isActiveCache.get(userid))
	})
	res.json(activeUsers)
})

app.post('/game_request', cors(), function(req, res){
	// room = "user3";
	// io.sockets.in(room).emit('message', 'what is going on, party people?');
	// res.json(activeUsers)
	var sockName = req.body["sockName"]
	var initiator = req.body["initiator"]
	io.sockets.in(sockName).emit('gameRequest', initiator);
})

app.post('/start_game', cors(), function(req, res){
	// room = "user3";
	// io.sockets.in(room).emit('message', 'what is going on, party people?');
	// res.json(activeUsers)
	var gameId = req.body["gameId"]
	var initiator = req.body["initiator"]
	var opponent = req.body["opponent"]
	gameIdMapping.set( gameId, [initiator, opponent], LIFETIME );
	console.log(gameIdMapping.keys())
	io.sockets.in(initiator).emit('enterGameplay', {"gameId":gameId});
})

// app.post('/enter_gameplay', cors(), function(req, res){
// 	// room = "user3";
// 	// io.sockets.in(room).emit('message', 'what is going on, party people?');
// 	// res.json(activeUsers)
// 	var gameId = req.body["gameId"]
// 	console.log(gameId)
// 	return res.redirect('/gameplay?gameId=' + gameId);
// })

server.listen(PORT, '0.0.0.0', function() {
    console.log('Listening to port:  ' + PORT);
});