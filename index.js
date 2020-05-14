var express = require('express')
var bodyParser = require("body-parser");
var app = express()
var http = require('http');
var WebSocket = require('ws');
var wsclient;
var isAlive;
var wsclients = [];
var personaclient;
var data = {};
var patientData = {};
var userName;
var isConsultationVisible;
var isMobileView;
var auth = [{ "userid": "713577", "pin": "1234" }, { "userid": "713082", "pin": "4567" }, { "userid": "713103", "pin": "1996" }]
app.use(express.static("www"));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
//app.use(bodyParser.urlencoded({extended: false}));
//app.use(bodyParser.json());
const server = http.createServer(app);

const port = process.env.PORT;

const wss = new WebSocket.Server({ server });

function noop() { }

function heartbeat() {
  isAlive = true;
}

function getData(data) {
  patientData = data.patientdata;
  userName = data.userName;
  isConsultationVisible = data.isConsultationVisible;
  isMobileView = data.isMobileView;
}

const interval = setInterval(function ping() {
  wss.clients.forEach(function each(ws) {
    if (ws.isAlive === false) {
      return 'user not logged in';
    };
    ws.isAlive = false;
    ws.ping(noop);
  });
}, 2000);

wss.on('connection', function connection(ws, req) {
  console.log("ws connection", req.url);
  wsclient = ws;
  personaclient = ws;
  var ss = req.url;
  var userid = "-1";
  var _pos = ss.indexOf("?");
  var queryParameters;
  if (_pos > -1) {
    queryParameters = ss.split('?')[1];
    console.log(queryParameters);
    if (queryParameters.indexOf('&') >= 0) {
      var ismobileview = queryParameters.substr(queryParameters.indexOf('&') + 1, queryParameters.length).split('=')[1];
      isMobileView = ismobileview; console.log(isMobileView);
      userid = queryParameters.substr(_pos + 1, queryParameters.indexOf('&') - 2).split('=')[1];
      //console.log(userid);
    } else {
      userid = ss.substring(_pos + 1).split('=')[1];
    }
    console.log(userid);
    wsclients.push({ "user": userid, "ws": ws });
  }

  wsclient.on('message', function incoming(data) {
    var parsed = JSON.parse(data);
    isMobileView = parsed.isMobileView;
    patientData = data.patientdata;
    userName = data.userName;
    isConsultationVisible = data.isConsultationVisible;
    console.log('received: %s', parsed.isMobileView);
//     wsclient.send(JSON.stringify({ patientdata: patientData,username:userName,isConsultationVisible:isConsultationVisible, isMobileView: isMobileView }));
    for (var i = 0; i < wsclients.length; i++) {
      wsclients[i].ws.send(JSON.stringify({ patientdata: patientData,username:userName,isConsultationVisible:isConsultationVisible, isMobileView: isMobileView }));
    }
    //getData(parsed);
  });
  ws.isAlive = true;
  ws.on('pong', heartbeat);
  ws.on('close', function close() {
    clearInterval(interval);
  });
});
app.use(function (req, res, next) {

  // Website you wish to allow to connect
  if (req.header('origin') == "http://localhost:8000")
    res.setHeader('Access-Control-Allow-Origin', "http://localhost:8000");
  else
    res.setHeader('Access-Control-Allow-Origin', "*");

  // Request methods you wish to allow
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

  // Request headers you wish to allow
  res.setHeader('Access-Control-Allow-Headers', '*');

  // Set to true if you need the website to include cookies in the requests sent
  // to the API (e.g. in case you use sessions)
  res.setHeader('Access-Control-Allow-Credentials', true);

  // Pass to next layer of middleware
  next();
});

// app.get('/getsample', function (req, res) {
//   res.json({"uid":"sample"});
// });

app.get('/getdata',function(req,res) {
  res.json({patientdata:patientData,username:userName,isConsultationVisible:isConsultationVisible,isMobileView:isMobileView});
  res.end();
});

app.get('/Get-Personalization-Mobile/:authdata', function (req, res) {
  //http://172.26.1.31:8000/Get-Personalization-Mobile/713082-4943-10101
  console.log("Get-Personalization-Mobile called", req.params);
  var r = {
    "resourceType": "Bundle",
    "entry": [
      {
        "resource": {
          "favClinics": [{ "isSelected": true, "isFavourite": true, "id": "Practitioner/700576", "name": "Dr. JUSTIN PAUL G" }],
          "userId": "", "Theme": 1, "ANNOTATIONPIN": ""
        }
      }]
  }
  try {
    var p = req.params.authdata.split('-');
    for (var i = 0; i < auth.length; i++) {
      if (auth[i].userid == p[0] && auth[i].pin == p[3]) {
        r.entry[0].resource.userId = p[0];
        r.entry[0].resource.ANNOTATIONPIN = p[3];
      }
    }
  }
  catch (e) {
    throw e;
  }
  finally {
    res.json(r);
  }
});

app.post('/posttoken', function (req, res) {
  var user_name = req.body.user;
  var token = req.body.token;
  data.user = user_name;
  data.image = token;
  personaclient.send(token);
  res.end("yes");
})
app.post('/postdata', function (req, res) {
  var user_name = req.body.user;
  //  var image =req.body.image;
  var imagelist = JSON.parse(req.body.imagelist);
  data.user = user_name;
  data.image = image;
  for (var i = 0; i < wsclients.length; i++) {
    console.log("client::" + i, wsclients[i].user, wsclients[i].ws == undefined);
    if (user_name == wsclients[i].user) {
      console.log("sending to username", user_name);
      try {
        isMobileView = true;
        wsclients[i].ws.send(JSON.stringify({ imageSource: JSON.stringify(imagelist), isMobileView: isMobileView, patientId: patientData,maximages:imagelist.length }));
      }
      catch (e) {
        console.log("error while sending", e);
      }
      finally { }
    }
  }
  //wsclient.send(image);
  //console.log("data ws sent", data);
  res.end("yes");
})
server.listen(port);
