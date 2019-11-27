const path = require('path')
const express = require('express')
var bodyParser = require('body-parser')
var cookieParser = require('cookie-parser');
const app = express()
const port = 3000
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(cookieParser());
var mongoose = require('mongoose');
var mongoDB = 'mongodb://127.0.0.1/test_db';
mongoose.connect(mongoDB, { useNewUrlParser: true });
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
var mongoose = require('mongoose');
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
  }
});
var user = mongoose.model('users', UserSchema);
module.exports = user;
var d1 = new Date();
var game_id = Math.floor(d1.getTime()/ 1000)


app.use('/static', express.static(path.join(__dirname, 'static')))

app.get('/login', function(req, res) {
	console.log("in login get");
	console.log(req.cookies[game_id]);
	if (null!=req.cookies[game_id]&&1 == req.cookies[game_id]["is_authenticated"]){
		console.log("You are already logged in the system.")
		res.sendFile('test.html', {
        	root: path.join(__dirname, './')
    	});
	}
	else{
		res.sendFile('login.html', {
        	root: path.join(__dirname, './')
    	});
	}
});

app.post('/login', function(req, res) {
	var username = req.body["username"];
	var password = req.body["password"];
	var query = user.find({ username: username});
	query.exec(function (err, docs) {
		if (0 == docs.length){
			console.log("username does not exist!!!")
			return -1;
		}
		var user_info_doc = docs[0];
		console.log(user_info_doc);
		var username_doc = user_info_doc["username"];
		var password_doc = user_info_doc["password"];
		if (password == password_doc){
			cookie_content = {
				"username": username_doc,
				"is_authenticated": 1
			}
			console.log("Yes Yes Yes Yes Yes Yes Yes Yes ")
			res.cookie(game_id, cookie_content, {expire: 400000 + Date.now()});
			res.sendFile('test.html', {
    		    root: path.join(__dirname, './')
    		});
		}
		else{
			console.log("Incorrect password!!!")
			return -1;
		}

	});
});

app.get('/logout', function(req, res) {
	console.log("Inside logout!!!")
	console.log(req.cookies);
	if (1 == req.cookies[game_id]["is_authenticated"]){
		res.clearCookie(game_id);
		console.log("You are now logged out of the system.")
		res.sendFile('login.html', {
        	root: path.join(__dirname, './')
    	});
	}
	res.sendFile('login.html', {
        root: path.join(__dirname, './')
    });
});

app.listen(port, () => console.log(`App listening on port ${port}!`))