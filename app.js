var express = require('express'),
	app = express(),
	server = require('http').createServer(app),
	io = require('socket.io').listen(server),
	ent = require('ent'), // Permet de bloquer les caractères HTML (sécurité équivalente à htmlentities en PHP)
	fs = require('fs'),
	crypto = require('crypto'),
	cookie = require('cookie-session'),
	session = require('express-session'),
	bodyParser = require('body-parser'),
	urlencodedParser = bodyParser.urlencoded({ extended: false }),
	port = process.env.PORT || 8080,
	MongoClient = require('mongodb').MongoClient,
	assert = require('assert');


app.use(session({secret: 'topsecret', resave: false, saveUninitialized: true}));



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

	// tableau vide où l'on va placer les objets de la BD à chaque solicitation du serveur
	var clientDB = [];
	var biereDB = [];
	var commentDB = [];


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
		insertCustom(db, 'bieres', {_id: 'biere5', type: 'blonde', degre: 8}, function(){});
		insertCustom(db, 'bieres', {_id: 'biere6', type: 'blonde', degre: 8}, function(){});
		insertCustom(db, 'bieres', {_id: 'biere7', type: 'blonde', degre: 8}, function(){});


		//insertCustom(db, 'comments', {biereId: 'biere1', clientId: 'toto', date: '20/02/2017', mark: 8, comment: 'Super bonne !'}, function(){});
		//insertCustom(db, 'comments', {biereId: 'biere1', clientId: 'titi', date: '20/02/2017', mark: 5, comment: 'Bonne !'}, function(){});
		//insertCustom(db, 'comments', {biereId: 'biere1', clientId: 'foo', date: '20/02/2017', mark: 2, comment: 'Pas bonne !'}, function(){});
		insertCustom(db, 'comments', {_id: {biereId: 'biere1', clientId: 'toto'},biereId: 'biere1', clientId: 'toto', date: '20/02/2017', mark: 8, comment: 'Super bonne !'}, function(){});
		insertCustom(db, 'comments', {_id: {biereId: 'biere1', clientId: 'titi'}, biereId: 'biere1', clientId: 'titi', date: '20/02/2017', mark: 5, comment: 'Bonne !'}, function(){});
		insertCustom(db, 'comments', {_id: {biereId: 'biere1', clientId: 'foo'}, biereId: 'biere1', clientId: 'foo', date: '20/02/2017', mark: 2, comment: 'Pas bonne !'}, function(){});

		callback();
	};

	init(function(){
		findAllCustom(db, 'clients', function(docs) { clientDB = docs; });
		findAllCustom(db, 'bieres', function(docs) { biereDB = docs; });
		findAllCustom(db, 'comments', function(docs) { commentDB = docs; console.log(docs)});

		//findAllCustom(db, 'clients', function(){});
	});
	//db.close();

	// findClients('foo', db, function(){});

	app.use(function(req, res, next){
		console.log('server solicited');
		next();
	})

	.get('/', function(req, res) {
		// Chargement des données
		findAllClients(db, function(docs){ clientDB = docs; });
		findAllCustom(db, 'bieres', function(docs){ biereDB = docs; });
		findAllCustom(db, 'comments', function(docs){ commentDB = docs; 	});

		res.render('../index.ejs', {clientDB: clientDB, biereDB: biereDB, message: '', commentDB: commentDB, sessionName: req.session.user});
	})

	.post('/client/signUp/', urlencodedParser, function(req, res) {
		// On récupère l'id et le mot de passe (sécurité)
		var pseudo = req.body.pseudo;
		var mdp = req.body.mdp;

		// On crypte le mdp

		insertCustom(db, 'clients', {_id: pseudo, mdp: mdp}, function(result) {
			if(result != null){
				req.session.isConnected = true;
				req.session.user = pseudo;
				res.redirect('/');
			} else {
				res.redirect('/');
			}
		});
	})

	.post('/client/signIn/', urlencodedParser, function(req, res) {
		var pseudo = req.body.pseudo;
		var mdp = req.body.mdp;
		console.log(pseudo + ' is trying to connect');

		findCustom(db, 'clients', pseudo, function(docs) {
			console.log(docs[0]);
			if(docs[0] != null){
				console.log('test mdp: '+docs[0].mdp+' '+mdp );
				if(docs[0].mdp == mdp) {
					console.log(pseudo + ' is connected');
					req.session.isConnected = true;
					req.session.user = docs[0]._id;
					console.log(req.session.user);
					res.redirect('/');
				} else {
					res.redirect('/');
				}
			} else {
				res.redirect('/');
			}
		})
	})

	.get('/client/deconnect/', function(req, res) {
		req.session.user = undefined;
		res.redirect('/');
	})

	.get('/beer/:beer', function(req, res) {
		var beer = req.params.beer;
		findCustom(db, 'bieres', beer, function(docs) {
			if(docs =! null){

				res.render('beer.ejs', {beer: docs[0]});
			} else {
				res.redirect('/');
			}
		});
	})

	.post('/beer/add/', urlencodedParser, function(req, res) {
		var beer = req.body.beerName;
		var degre = req.body.beerDegre;
		var type = req.body.beerType;
		console.log('toto');
		insertCustom(db, 'bieres', {_id: beer, type: type, degre: degre}, function(result) {
			if(result =! null){
				console.log('tata');
				//res.render('public/beer.ejs', {beer: beer});
				res.redirect('/');
			} else {
				res.redirect('/');
			}
		})
	})

	.post('/beer/add/comment/', function(req, res) {
		var biereId = req.body.biereId;
		var clientId = req.body.clientId;
		var date = req.body.date;
		var mark = req.body.mark;
		var comment = req.body.comment;

		insertCustom(
			db,
			'comments',
			{
				'_id': {
					'biereId': biereId,
					'clientId': clientId
				},
				'biered': biereId,
				'clientId': clientId,
				'date': date,
				'mark': mark,
				'comment': comment
			},
			function(result) {
				if(result != null) {
					console.log('tata');
					//res.render('public/beer.ejs', {beer: beer});
					res.redirect('/');
				} else {
					res.redirect('/');
				}
			}
		);
	})

	.get('/js/:file', function(req, res) {
		res.sendFile(__dirname + '/js/' + filename.slice(-4), {message:  ''});
	})

	.get('/views/public/:file', function(req, res) {
		res.render(__dirname + '/views/public/' + req.params.file); // Vérifer si :file existe
	})

	.get('/views/private/:file', function(req, res) {
		console.log(req.session.user);
		if(req.session.user){
			res.render(__dirname + '/views/private/' + req.params.file); // Vérifer si :file existe
		}
	})

/* On redirige vers la page d'accueil si la page demandée n'est pas trouvée */
	.use(function(req, res){
		res.redirect('/');
	});

	io.sockets.on('connection', function (socket) {
		console.log('Connection with socket.io');

		socket.emit('sendData', {clientDB: clientDB, biereDB: biereDB});

		socket.on('getData', function() {
			socket.emit('sendData', {clientDB: clientDB, biereDB: biereDB});
			console.log('toto')
		});

		//socket.on('nouveau_client', function(pseudo, mdp) {
		//	if(pseudo != ''){
		//		findCustom(db, 'client', pseudo, function(docs) {
		//			if(docs == null){
        //
		//			} else {
		//				console.log('Client '+peudo+' already exists');
		//			}
		//		});
		//	} else {
		//		socket.emit('erreur', {message: 'Vous avez entré un pseudo invalide !'});
		//	}
		//});


	});
});

// * Functions for clients *
	var insertClients = function(db, pseudo, mdp, callback) {
		var clients = db.collection('clients');
		//console.log(' Trying to insert the client '+pseudo);

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
			//console.log(" Found the following clients");
			callback(docs);
		});
	};

	var findAllClients = function(db, callback){
		var clients = db.collection('clients');

		// Find all clients
		clients.find({}).toArray(function(err, docs) {
			assert.equal(err, null);
			//console.log(" Found all these following clients:");
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


// TODO
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

				currentCollection.updateOne({_id: id},dataUpdated , function(err, result) {
					assert.equal(err, null);
					assert.equal(1, result.result.n);
					assert.equal(1, result.ops.length);
					console.log(collection + ' ' + id + ' successfully updated !');
					callback(result);
				});
				//console.log(docs[0]);
			} else {
				console.log(collection + ' ' + id + ' doesn\'t exist !');
			}
		});
	};

	var deleteCustom = function(db, collection, id, callback) {

	};

// var exist = function(db, collection, id){
// 	var currentCollection = db.collection(collection);

// 	if()
// }

server.listen(port);
