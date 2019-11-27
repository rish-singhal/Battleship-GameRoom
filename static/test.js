
function getActiveUsers() {
	var url = 'http://'+location.host+'/get_active_users'
	httpGetRequest(url) 
}

function httpGetRequest(url) { 
	$.get(url, function(data, status){
		createUserList(data)
	});
}

function httpPostRequest(url, dataToSend) { 
	$.post(url, dataToSend, function(data, status){
		
	});
}

function createUserList(data){
	var searchParams = new URLSearchParams(window.location.search)
	var currentUsername = searchParams.get('user')
	$("#active_users").empty();
	data.forEach(function(user){
		if (currentUsername != user){
			$("#active_users").append("<h3 class='active_user'>"+user+"</h3>");
		}
	})
}

function createSocket(gameId) {
	socket.on(gameId, function(data) {
	   console.log('Incoming message:', data);
	});
}


var searchParams = new URLSearchParams(window.location.search)
// set-up a connection between the client and the server
var socket = io.connect();
socket.on('connect', function() {
	// Connected, let's sign-up for to receive messages for this sockName
	socket.emit('sockName', searchParams.get('user'));
});
socket.on('message', function(data) {
   console.log('Incoming message:', data);
});

socket.on('acceptedGameRequest', function(data) {
   console.log('Incoming message:', data);
});

socket.on('enterGameplay', function(data) {
	var gameId = data["gameId"]
	var redirectUrl = 'http://'+location.host+'/gameplay?gameId='+gameId
	alert("enterGameplay");
	window.location.replace(redirectUrl);
});

socket.on('gameRequest', function(data) {
	var message = "Would you like to start a war with " + data + "?";
	console.log('Incoming message:', message);
	if (confirm(message)) {
	    console.log("Let the war begin!!!")
	    const now = new Date()  
		const gameId = Math.round(now.getTime() / 1000) 
		var searchParams = new URLSearchParams(window.location.search)
		var currentUsername = searchParams.get('user') 
		var url = 'http://'+location.host+'/start_game'
	    httpPostRequest(url, 
			{
				"gameId": gameId,
				"initiator": data,
				"opponent": currentUsername
			});
	    var redirectUrl = 'http://'+location.host+'/gameplay?gameId='+gameId
	    window.location.replace(redirectUrl);
	} else {
	    console.log("Shame on you...")
	}
});

$(document).on('click', "[class^=active_user]", function(){
    var searchParams = new URLSearchParams(window.location.search)
	var currentUsername = searchParams.get('user')
    var oppPlayerName = $(this).text();
    var url = 'http://'+location.host+'/game_request'
	httpPostRequest(url, 
		{
			"sockName": oppPlayerName,
			"initiator": currentUsername
		});
});

$(document).ready(function(){
	window.setInterval(function(){
  		getActiveUsers()
	}, 1000);
});