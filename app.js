

var port = (process.env.VCAP_APP_PORT || 3000);
var bodyParser = require('body-parser');        // provides urlencoding of response bodies
var cfenv = require('cfenv');                   // cfenv provides access to your Cloud Foundry environment
var express = require('express'),               // 
    app = express.createServer(),
    math = require('math'),                     
    io = require('socket.io').listen(app),      // www.npmjs.com/package/socket.io - Socket.IO enables real-time bidirectional event-based communication
    itc = require('itunesconnectanalytics');    // Apple iTunesConnect library


var ITCusername = "per@thoresson.com.au";
var ITCpassword = "P@ss1968";
var ITCpasswordApp = "fdco-alrm-qtlr-ontq";
var ITCappId = '824026409'; //Found in My Apps -> App -> Apple ID or read below on getting the app id.

var Itunes = itc.Itunes;
var AnalyticsQuery = itc.AnalyticsQuery;

var sock
var batchRequestList = [];

// set log level
// io.set('log level',0);
// 0 - error
// 1 - warn
// 2 - info
// 3 - debug
  
// Cloudant DB
// ------------------------------------------------------------
// ------------------------------------------------------------
var Cloudant = require('cloudant')
var cloudant = Cloudant("https://998da4d8-d1ac-46cc-a5fe-b2d096fca39a-bluemix:0091ad5dc55cb139a4f49682deab1a27c5c8beb53744d2ac780eeaa14713f238@998da4d8-d1ac-46cc-a5fe-b2d096fca39a-bluemix.cloudant.com");
// ------------------------------------------------------------

// 
// ------------------------------------------------------------
// ------------------------------------------------------------
// SOCKET Handling
io.sockets.on('connection', function (socket) {
  // socket.emit('news', { hello: 'world' }); // Send data to client
  // console.log("IO connected : ",socket);
  sock = socket;

  // wait for the event raised by the client
  socket.on('reload', function (data) {  
    console.log("reload > : ",data);
    var range = 0;
    switch(data.range){
    	case "7":
    		range = 7;
    		break;
    	case "14":
    		range = 14;
    		break;
    	case "30":
    		range = 30;
    		break;
    	case "90":
    		range = 90;
    		break;
    	default:
    		range = 7;
    		break;	
    }
    console.log("RANGE : ",range);
    var rangeObj = getDateRangeFor(range);

    console.log(JSON.stringify("rangeObj >> : ",rangeObj))
    console.log(rangeObj.from,"  {}  ",rangeObj.to)

    if(data.platform=="itc"){
  		// installs :: sessions :: pageViews :: activeDevices :: crashes :: payingUsers :: units :: sales :: iap (in app purchases) :: impressions :: impressionsUnique
    	var firstquery = new AnalyticsQuery.metrics(ITCappId, { measures: [itc.measures.impressions, itc.measures.impressionsUnique]}).time(range, 'days');
    	var secondquery = new AnalyticsQuery.metrics(ITCappId, { measures: [itc.measures.sessions, itc.measures.pageViews]}).time(range, 'days');
    	var thirdquery = new AnalyticsQuery.metrics(ITCappId, { measures: [itc.measures.crashes, itc.measures.activeDevices]}).time(range, 'days');
    	var forthquery = new AnalyticsQuery.metrics(ITCappId, { measures: [itc.measures.installs, itc.measures.units]}).time(range, 'days');
    	batchRequestList = [firstquery, secondquery, thirdquery, forthquery];
    	batchRequest()
    }else if(data.platform=="google"){
    	// var gQ = returnITCrequest(ITCappId, "units", rangeObj.from, rangeObj.to);
    	// var itcRes = getITCrequest( Q );
    	// socket.emit('update_chart', { target: "itc", data: itcRes });
    }

  });

  socket.on('startup', function (data) {  
    console.log("startup > : ",data);
  });
});



// ------------------------------------------------------------
// ------------------------------------------------------------

app.listen(port);
app.use("/css", express.static(__dirname + '/css'));
app.use("/lib", express.static(__dirname + '/lib'));
app.use("/img", express.static(__dirname + '/img'));


function emitAll(){
    // io.sockets.volatile.emit('update_all', loaded_banks );
}

// ----- ITC Requests -------------------------------------------------------------------
// --------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------
var instance = new Itunes(ITCusername, ITCpassword, {
  errorCallback: function(e) {
    console.log('Error logging in: ' + e);
  },
  successCallback: function(d) {
    console.log('Logged in');
  }
});

function getItunesApps() {
	console.log("getItunesApps -->")
	if(instance){
		instance.getApps(function(error, data) {
			if(error){ console.log("error : ",error) }
			if(data){ console.log(JSON.stringify(data, null, 2)) }
		});
	}
}

function batchRequest(){
	if(batchRequestList.length!=0){
		var req = batchRequestList.pop()
		getITCrequest(req)
	}
}

function getITCrequest(_query) {
	instance.request(_query, function(error, result) {
		if (result) {
			console.log("Result : ",JSON.stringify(result.results))
			handleITCResponse(result.results); // handle requests - TODO : Fix split for Google based on result
		}
		if(error){
			console.log("ERROR : ",JSON.stringify(error) );
			// 
		}
		if(batchRequestList.length!=0){batchRequest()} // test if there are pending requests.
	});
}


function handleITCResponse(_items){
	sock.emit('update_chart', { target: "itc", data: _items });
}

function buildITCrequest(){

}
// --------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------
function getFormatted(_value){
	var ret =_value.toString()
	if(ret.length == 1){ ret = "0"+ret }
	return ret
}

function getDateRangeFor(_days){
	var now = new Date()
	var dNowStr = now.getFullYear()+"-"+getFormatted(now.getMonth()+1)+"-"+getFormatted(now.getDate())
	var targetDate = new Date();
	targetDate.setDate(targetDate.getDate() + _days);
	var dd = getFormatted(targetDate.getDate());
	var mm = getFormatted(targetDate.getMonth() + 1); 
	var yyyy = targetDate.getFullYear();
	var dateString = yyyy + "-" + mm + "-" + dd;
	return {from: dNowStr, to: dateString};
}
// --------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------

// --------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------

// --------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------

// Initiate UI
// --------------------------------------------------------------------------------------
app.get('/', function (req, res) {
  res.sendfile( '/index.html' , {root:__dirname});
});

