var express = require('express'),
	app = express(),
	server = require('http').createServer(app),
	io = require('socket.io').listen(server),
	ent = require('ent'), // Permet de bloquer les caractères HTML (sécurité équivalente à htmlentities en PHP)
	fs = require('fs');
	crypto = require('crypto');
	cookie = require('cookie-session');
	session = require('express-session')
	bodyParser = require('body-parser');
	urlencodedParser = bodyParser.urlencoded({ extended: false });
	port = process.env.PORT || 8080;
	MongoClient = require('mongodb').MongoClient,
	assert = require('assert');






//______________________________________________________________________________
// Connectionto the mongodb server
var dbName = 'beerApp';
var url = 'mongodb://localhost:27017/'+dbName;

MongoClient.connect(url, function(err, db) {
	assert.equal(null, err);
	console.log("\n *** Connected correctly to mongodb *** \n");

	var clients = db.collection('clients');
	var beers = db.collection('beers');
	var avis = db.collection('avis');

	// tableau vide où l'on va placer les clients de la BD à chaque solicitation du serveur
	var clientDB = [];
	var biereDB = [];




	// Initalisation
	var init = function(callback){
		insertClients(db, 'toto', 'toto', function(){});
		insertClients(db, 'titi', 'titi', function(){});
		insertClients(db, 'foo', 'bar', function(){});

		insertCustom(db, 'clients', {_id: 'azerhg', mdp: "1234"}, function(){});


		insertCustom(db, 'bieres', {_id: 'biere1', type: 'brune', degre: 8}, function(){});
		insertCustom(db, 'bieres', {_id: 'biere2', type: 'brune', degre: 8}, function(){});
		insertCustom(db, 'bieres', {_id: 'biere3', type: 'brune', degre: 8}, function(){});
		insertCustom(db, 'bieres', {_id: 'biere4', type: 'brune', degre: 8}, function(){});
		insertCustom(db, 'bieres', {_id: 'biere5', type: 'brune', degre: 8}, function(){});
		insertCustom(db, 'bieres', {_id: 'biere6', type: 'brune', degre: 8}, function(){});
		insertCustom(db, 'bieres', {_id: 'biere7', type: 'brune', degre: 8}, function(){});

		callback();
	};

	init(function(){
		findAllCustom(db, 'clients', function(docs){ clientDB = docs; });
		findAllCustom(db, 'bieres', function(docs) { biereDB = docs; });

		//findAllCustom(db, 'clients', function(){});
	});
	//db.close();

	// findClients('foo', db, function(){});

	app.use(function(req, res, next){
		console.log('server solicited');
		next();
	})

	.get('/', function(req, res) {
		findAllClients(db, function(docs){
			clientDB = docs;
			console.log(docs);
		});
		findAllCustom(db, 'bieres', function(docs){
			biereDB = docs;
			console.log(docs);
		});
		res.render('../index.ejs', {clientDB: clientDB, biereDB: biereDB, message: ''});
	});

	io.sockets.on('connection', function (socket,pseudo) {
		console.log('Connection with socket.io');


	// Gestion inscription
		app.post('/client/signUp/', urlencodedParser, function(req, res) {
			// On récupère l'id et le mot de passe (sécurité)
			var pseudo = req.body.pseudo;
			var mdp = req.body.mdp;
			// On crypte le mdp
			// On insère
			insertCustom(db, 'clients', {_id: pseudo, mdp: mdp}, function(docs){
				if(docs != null){
					//res.redirect('/');
					//socket.emit('welcome', {message: 'Bienvenue sur BeerApp '+pseudo});
					res.render('../index.ejs', {clientDB: clientDB, biereDB: biereDB, message: 'Bienvenue sur BeerApp '+pseudo});
				} else {
					//socket.emit('erreur', {message: 'Le pseudo '+pseudo+' existe déjâ :\'('});
					//res.write('<div class="alert-danger">Le pseudo '+pseudo+' existe déjâ :\'(</div>');
					//res.end();
					//res.redirect('/#/client/signin');
					res.render('../index.ejs', {clientDB: clientDB, biereDB: biereDB, message: 'Le pseudo '+pseudo+' existe déjâ :\'('});
				}
			});

		})

		.post('/client/signIn', urlencodedParser, function(req, res) {
			var pseudo = req.body.pseudo;
			var mdp = req.body.mdp;

			findCustom(db, 'clients', pseudo, function(docs) {
				if(docs == null){

				} else {
					res.redirect('/');
					socket.emit('erreur', {message: 'Indentifiants invalides'});
				}
			})
		})

		.get('/beer/:beer', function(req, res) {
			var beer = req.params.beer;
			findCustom(db, 'bieres', beer, function(docs) {
				if(docs =! null){

					res.render('beer.ejs', {beer: docs[0]});
				} else {

				}
			});
		})

	// Gestion des fichiers javascript
		.get('/js/:file', function(req, res) {
			res.sendFile(__dirname + '/js/' + filename.slice(-4), {message:  ''});
		})

	// Gestion des views
		.get('/views/:file', function(req, res) {
			res.render(__dirname + '/views/' + req.params.file);
		})

	/* On redirige vers la page d'accueil si la page demandée n'est pas trouvée */
		.use(function(req, res){
			res.redirect('/');
		});

		socket.on('nouveau_client', function(pseudo, mdp) {
			if(pseudo != ''){
				findCustom(db, 'client', pseudo, function(docs) {
					if(docs == null){

					} else {
						console.log('Client '+peudo+' already exists');
					}
				});
			} else {
				socket.emit('erreur', {message: 'Vous avez entré un pseudo invalide !'});
			}
		});

	});
});






// * Functions for clients *
	var insertClients = function(db, pseudo, mdp, callback) {
		var clients = db.collection('clients');
		console.log(' Trying to insert the client '+pseudo);
		// clients.find({_id: 'foo'}).toArray( function(err, docs){ console.log(docs); });

		// On vérifie que le client n'existe pas deja
		findCustom(db, 'clients', pseudo, function(docs) {
			if(docs == null){
				// Insert the client
				clients.insertOne({_id: pseudo, mdp: mdp}, function(err, result) {
					assert.equal(err, null);
					assert.equal(1, result.result.n);
					assert.equal(1, result.ops.length);
					console.log(" Client " + pseudo + ' successfully insert !');
					callback(result);
				});
				//console.log(docs[0]);
			} else {
				console.log(' Clients ' + pseudo + ' can\'t be inserted again !');
			}
		});

	};

	var findClients = function(db, pseudo, callback) {
		var clients = db.collection('clients');

		// Find a client
		clients.find({_id: pseudo}).toArray(function(err, docs) {
			assert.equal(err, null);
			console.log(" Found the following clients");
			console.log(docs)
			callback(docs);
		});
	};

	var findAllClients = function(db, callback){
		var clients = db.collection('clients');

		// Find all clients
		clients.find({}).toArray(function(err, docs) {
			assert.equal(err, null);
			console.log(" Found all these following clients:");
			console.log(docs)
			callback(docs);
		});
	};


// * Generic functions *
	var findCustom = function(db, collection, id, callback){
		var currentCollection = db.collection(collection);

		// find in collection
		currentCollection.find({_id: id}).toArray(function(err, docs) {
			assert.equal(err, null);
			if(docs[0] != undefined){
				callback(docs);
			} else {
				callback(null);
			}
		});
	};

	var findAllCustom = function(db, collection, callback) {
		var currentCollection = db.collection(collection);

		currentCollection.find({}).toArray(function(err, docs) {
			assert.equal(err, null);
			callback(docs);
		})
	};

	var insertCustom = function(db, collection, data, callback) {
		var currentCollection = db.collection(collection);

		findCustom(db, collection, data._id, function(docs) {
			if(docs == null){

				// Verify data

				// Insert object
				currentCollection.insertOne(data, function(err, result) {
					assert.equal(err, null);
					assert.equal(1, result.result.n);
					assert.equal(1, result.ops.length);
					console.log(collection+" " + data._id + ' successfully insert !');
					callback(result);
				});
				//console.log(docs[0]);
			} else {
				console.log(collection+" " + data._id + ' can\'t be inserted again!');
				callback(null);
			}
		});

	};

	var updateBiere = function(db, id, collection, data, callback) {
		var currentCollection = db.collection(collection);

		findCustom(db, collection, id, function(docs) {
			if(docs != null){
				dataUpdated = [];
				data.forEach(function(attribut, value) {
					dataUpdated.push({attribut: value});
				});
				console.log(dataUpdated);
				// Verify data

				// update object
				currentCollection.updateOne({_id: id},dataUpdated , function(err, result) {
					assert.equal(err, null);
					assert.equal(1, result.result.n);
					assert.equal(1, result.ops.length);
					console.log(" Client " + pseudo + ' successfully deleted !');
					callback(result);
				});
				//console.log(docs[0]);
			} else {
				console.log(' Clients ' + pseudo + ' doesn\'t exist !');
			}
		});
	};

	var deleteCustom = function(db, collection, id, callback) {

	}

// var exist = function(db, collection, id){
// 	var currentCollection = db.collection(collection);

// 	if()
// }

server.listen(port);
