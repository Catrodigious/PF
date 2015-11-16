// Console log for sanity-check
console.log("Starting app...");

angular.module("app", [])
	.controller('PrinterInfo', [
	'$scope', 
	function ($scope) {
		$scope.visible = false
		$scope.status = "operational";
		$scope.printersList = [];
		$scope.printerQty = 0;
		$scope.printers = function(serial){
			$scope.visible = true;
			console.log(serial);
			$scope.printersList.push(serial);
			$scope.printerQty = $scope.printersList.length;
			console.log($scope.printersList);
		};
		
	}]);
	

// Set up for connecting to database
var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/test');

// Test connection
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function (callback) {
	console.log("Successfully connected to database")
});

// Schema is authentication-focused for now;
// Still trying to figure out whether I should create another one for files, or if it just makes more sense
// to have all data regarding each printer live in the same schema
var PrinterSchema = new mongoose.Schema({
	serial: Number,
	key: String, 
	reqCred: Boolean,
	user: String,
	password: String
	});

var Printer = mongoose.model('Printer', PrinterSchema);

// Creates new example printer
var printer = new Printer({serial: '1212', key: 'x', reqCred: false, user: "none", password: "none"});

printer.save(function(err){
	if(err)
		console.log(err);
	else
		console.log(printer);
	});