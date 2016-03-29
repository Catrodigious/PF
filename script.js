// Console log for sanity-check
// console.log("Starting app...");
/*
var mongo = require('mongodb');
var Grid = require('gridfs-stream');
var newScript = require('./newScript');
newScript("this new script!");

// initialize database
var db = new mongo.Db('Printfarm', new mongo.Server("127.0.0.1", 27017));
	db.open(function(err){
		if (err) return handleError(err);
		var gfs = Grid(db, mongo);
	});

var grid = new Grid(db, 'fs')
*/
var app = angular.module("app", ['angularFileUpload']);

app.controller('FileManagementController', ['$scope', 'FileUploader', function($scope, FileUploader){
	var uploader = $scope.uploader = new FileUploader({
			url: 'upload.php'
	});
	$scope.fileList = [];

	uploader.filters.push({
		name: 'customFilter',
			fn: function(item /*{File|FileLikeObject}*/, options) {
				// Is displayed back to UI 
				$scope.fileList.push({'name': item.name, 'id' : this.queue.length});
				return this.queue.length < 10;
		}
		});
}]);

app.factory('getPrinterData', function($q, $http){
return {
		printerData:
		function(serial, key){
		return $http({
				method: 'GET',
				url: 'http://series1-' + serial + '.local:5000/api/printer',
				headers: {
					'X-Api-Key': key
				}	
		}).then(function successCallback(response){
			if (response != null || response != undefined){
			printerDataDict = {};

			printerDataDict['serial'] = serial;
			printerDataDict['authentication'] = {'serial': serial, 'key': key};
			printerDataDict['status'] = {
				'state' : response.data.state.text,
				'stateFlags' : response.data.state.flags,
				'temperature': 	{'tool0_actual': response.data.temperature.tool0.actual,
												'tool0_target': response.data.temperature.tool0.target,
												 'bed_actual' : response.data.temperature.bed.actual,
												 'bed_target' : response.data.temperature.bed.target}
				};
				if (printerDataDict != undefined && printerDataDict != null){
					return printerDataDict;
					};
			} else {
				return $q.reject(response);
			}
		}, function(response){
			return $q.reject(response)
			}); 
		}
	};
});

app.factory('getJobData', function($q, $http){
return {
				jobData: 
				function(serial,key){
				return $http({
				method: 'GET',
				url: 'http://series1-' + serial + '.local:5000/api/job',
				headers: {
					'X-Api-Key': key
				}	
		}).then(function successCallback(response){
			if (response != null || response != undefined){
				jobDataDict = {};
				jobDataDict['job'] = response.data.job;
				jobDataDict['progress'] = response.data.progress;
				if (jobDataDict['progress'].completion == null){
					jobDataDict['progress'].completion = 0;
				};
				jobDataDict['progress'].completion = jobDataDict['progress'].completion.toFixed(2) + "%";
				
				if (jobDataDict != undefined){
					return jobDataDict;
					};
			} else {
				return $q.reject(response);
			}
		}, function(response){
				return $q.reject(response)
			});
		}
	};
});

// list broadcaster
app.factory('filteredListBroadcaster', function($rootScope){
	var obtainPrinterList = {};
	obtainPrinterList.message = '';
	obtainPrinterList.prepForBroadcast = function(printerList){
		this.message = printerList;
		this.broadcastItem();
	};
	
	obtainPrinterList.broadcastItem = function(){
		$rootScope.$broadcast('broadcastingPrinterList');
	};
	return obtainPrinterList;
});


app.factory('addPrinter', function(){
	var printers = {};
	printers.list =  [];

	printers.getData = function(){
		return printers.list;
	};
	
	printers.add = function(printer){
		alreadyExists = false;
		
		// Looks for duplicates prior to adding
		if (printers.list.length == 0){
			printers.list.push(printer);
		}else{
			for (x in printers.list){
				serialInList = printers.list[x].printerData.serial;
				serialInQuestion = printer.printerData.serial;
				if (serialInList == serialInQuestion){
					alreadyExists = true;
				};
			};
			if (alreadyExists == false){
				printers.list.push(printer);
			};
		};
	};	self.selectedFile = function(id){
		
	};

	// To be more thorough soon	
	printers.update = function(printerToUpdate){
		// printersToUpdate is one printer that is being pushed up 
			serialToUpdate = printerToUpdate.printerData.serial;
			for(var y=0; y < printers.list.length; y++){
				
				serial = printers.list[y].printerData.authentication.serial;
				
				if (serialToUpdate == serial){
					// New/old values for printer data displayed on screen
					updatedExtruderData = printerToUpdate.printerData.status.temperature.tool0_actual;
					existingExtruderData = printers.list[y].printerData.status.temperature.tool0_actual;
					updatedBedData = printerToUpdate.printerData.status.temperature.bed_actual;
					existingBedData =  printers.list[y].printerData.status.temperature.bed_actual;
					
					// New/old values for job data displayed on screen
					updatedJobData = printerToUpdate.jobData.progress.completion;
					existingJobData = printers.list[y].jobData.progress.completion;

					// Printer and job data comparison with old and new data
					if (updatedExtruderData != existingExtruderData || updatedBedData != existingBedData || updatedJobData != existingJobData){
						printers.list[y] = printerToUpdate;
					};
				};
			};
		};		

	
	return printers;
});

// ----- MAIN CONTROLLER ------//
app.controller('printerAddCtrl', ['$scope', '$interval', 'addPrinter','filteredListBroadcaster', 'getPrinterData', 'getJobData', function($scope, $interval, addPrinter, obtainPrinterList, getPrinterData, getJobData){
	var self = this;
	self.printers = addPrinter.list;
	
	$scope.start = false;
	
	$scope.checkStatus = function(){		
		docObject = document.getElementById('resumePause');
		if (docObject.getAttribute("src") == "images/arrow.svg"){
			docObject.setAttribute("src", "images/circle.svg");
			docObject.addEventListener("click", function(){
				$scope.start = true;
			});
		}else{
			docObject.setAttribute("src", "images/arrow.svg");
			docObject.addEventListener("click", function(){
				$scope.start = false;
			});
		};	
	
	};
	
	$scope.continuePrint = function(serial, key){
		$http({
				method: 'POST',
				url: 'http://series1-' + serial + '.local:5000/api/printer',
				headers: {
					'X-Api-Key': key
				}	
		}).then(function successCallback(response){
			if (response != null || response != undefined){
			printerDataDict = {};

			printerDataDict['serial'] = serial;
			printerDataDict['authentication'] = {'serial': serial, 'key': key};
			printerDataDict['status'] = {
				'state' : response.data.state.text,
				'stateFlags' : response.data.state.flags,
				'temperature': 	{'tool0_actual': response.data.temperature.tool0.actual,
												 'tool0_target': response.data.temperature.tool0.target,
												 'bed_actual' : response.data.temperature.bed.actual,
												 'bed_target' : response.data.temperature.bed.target
												}
			};
			self.getJobData(serial, key, printerDataDict);
			} else {
				return $q.reject(response);
			}
		}, function(response){
			return $q.reject(response)
			}); 
	};
	
	
	$scope.stopPrint = function(){
		alert("Stop print?");
		console.log("Stopped");
	};
 	
}]);

app.controller('postPrinterAddCtrl', ['$scope', '$interval', '$q', '$http', 'addPrinter', 'filteredListBroadcaster',  'getPrinterData', 'getJobData', function($scope, $interval, $q, $http, addPrinter, obtainPrinterList, getPrinterData, getJobData){
	var self = this;
	
	self.serial = '2024';
	self.key = '7AA24AC7430A43ABAEA065C83458270C';
	
	// Dynamically adds printer and displays it on the screen
	self.addPrinter = function(printer){
		addPrinter.add(printer);
		self.serial = '';
		self.key = '';
		self.status = '';
	};
	
	// Performs the same way as the getPrinterData factory, but was having problems with successfully 
	// getting and interpreting initial data; this request is repeated for now, but will be fixed soon
	self.doHTTPRequest = function(serial, key){
		$http({
				method: 'GET',
				url: 'http://series1-' + serial + '.local:5000/api/printer',
				headers: {
					'X-Api-Key': key
				}	
		}).then(function successCallback(response){
			if (response != null || response != undefined){
			printerDataDict = {};

			printerDataDict['serial'] = serial;
			printerDataDict['authentication'] = {'serial': serial, 'key': key};
			printerDataDict['status'] = {
				'state' : response.data.state.text,
				'stateFlags' : response.data.state.flags,
				'temperature': 	{'tool0_actual': response.data.temperature.tool0.actual,
												 'tool0_target': response.data.temperature.tool0.target,
												 'bed_actual' : response.data.temperature.bed.actual,
												 'bed_target' : response.data.temperature.bed.target
												}
			};
			self.getJobData(serial, key, printerDataDict);
			} else {
				return $q.reject(response);
			}
		}, function(response){
			return $q.reject(response)
			}); 
	};
	
	// Called directly after doHTTPRequest
	self.getJobData = function(serial, key, printerDataDict){
	 $http({
				method: 'GET',
				url: 'http://series1-' + serial + '.local:5000/api/job',
				headers: {
					'X-Api-Key': key
				}	
		}).then(function successCallback(response){
			if (response != null || response != undefined){
				jobDataDict = {};
				jobDataDict['job'] = response.data.job;
				jobDataDict['progress'] = response.data.progress;

				if (jobDataDict['progress'].completion == null){
					jobDataDict['progress'].completion = 0;
				};
				jobDataDict['progress'].completion = jobDataDict['progress'].completion.toFixed(2) + "%";
				
				if (jobDataDict != undefined && printerDataDict != undefined){
					newList = {'printerData': printerDataDict, 'jobData': jobDataDict}
					addPrinter.add(newList);
					updatedList = addPrinter.getData();
					obtainPrinterList.prepForBroadcast(updatedList);
					self.serial = '';
					self.key = '';
					};
			} else {
				return $q.reject(response);
			}
		}, function(response){
			return $q.reject(response)
		}); 
	};

	// Asynchronous data poller
	function pollAndUpdateData(serial, key) {
		var deferred = $q.defer();

		setTimeout(function() {
			deferred.notify('About to get data');

			jobData = getJobData.jobData(serial, key).then(function(jobData){
				printerData = getPrinterData.printerData(serial, key).then(function(printerData){
					newList = {jobData, printerData};
					deferred.resolve(newList);
				});
			});  
		}, 1000);
		return deferred.promise;
	};


	// Handles UI updates asynchronously 
	$scope.$on('broadcastingPrinterList', function(){
		printers = obtainPrinterList.message;
		console.log(printers);
		var intervals = [];
		var printersToPoll = [];
		$scope.serialList = [];
		var promises = [];
		
		thisInterval = $interval(function(){
		for(x in printers){
			serial = printers[x].printerData.authentication.serial;
			key = printers[x].printerData.authentication.key;
			
			promise = pollAndUpdateData(serial, key);
			promises.push(promise);
		};
		
		if (promises.length > 0){
			for (p in promises){
				promises[p].then(function(data){
					printersToPoll.push(data);
					addPrinter.update(data);
					});
				};
			};
			}, 2000);
			
		intervals.push(thisInterval);	
	});

	// Garbage collection
	$scope.$on('$destroy', function(){
		for (x in intervals){
			console.log(intervals);
			$interval.cancel(intervals[x]);
			intervals = [];
		};
	});		
}]);

