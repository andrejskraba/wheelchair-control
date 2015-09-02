/*********************************************************************        
University of Maribor ************************************************
Faculty of Organizational Sciences ***********************************
Cybernetics & Decision Support Systems Laboratory ********************
@author Andrej Škraba ************************************************
@author Andrej Koložvari**********************************************
@author Davorin Kofjač ***********************************************
@author Radovan Stojanović *******************************************
*********************************************************************/

var firmata = require("firmata");

var emergency1 = 0; // emergency flag
var emergency2 = 0; // emergency flag

var board = new firmata.Board("/dev/ttyACM0",function(){
    console.log("Priključitev na Arduino");
    console.log("Firmware: " + board.firmware.name + "-" + board.firmware.version.major + "." + board.firmware.version.minor); // izpišemo verzijo Firmware
    console.log("Omogočimo pine");
    board.pinMode(4, board.MODES.OUTPUT);
    board.pinMode(7, board.MODES.OUTPUT);
    board.pinMode(8, board.MODES.OUTPUT);
    board.pinMode(12, board.MODES.OUTPUT);    
    board.pinMode(13, board.MODES.OUTPUT);    
});

var fs  = require("fs");

var options = {
  key: fs.readFileSync('agent2-key.pem'),
  cert: fs.readFileSync('agent2-cert.pem')
};

var https = require("https").createServer(options, handler) // tu je pomemben argument "handler", ki je kasneje uporabljen -> "function handler (req, res); v tej vrstici kreiramo server! (http predstavlja napo aplikacijo - app)
  , io  = require("socket.io").listen(https, { log: false })
  , url = require("url");

send404 = function(res) {
    res.writeHead(404);
    res.write("404");
    res.end();
}

//process.setMaxListeners(0); 

//********************************************************************************************************
// Simple routing ****************************************************************************************
//********************************************************************************************************
function handler (req, res) { // handler za "response"; ta handler "handla" le datoteko index.html
    var path = url.parse(req.url).pathname; // parsamo pot iz url-ja
    
    switch(path) {
    
    case ('/') : // v primeru default strani

    fs.readFile(__dirname + "/test_44.html",
    function (err, data) { // callback funkcija za branje tekstne datoteke
        if (err) {
            res.writeHead(500);
            return res.end("Napaka pri nalaganju strani pwmbutton...html");
        }
        
    res.writeHead(200);
    res.end(data);
    });
     
    break;    
            
    default: send404(res);
            
    }
}
//********************************************************************************************************
//********************************************************************************************************
//********************************************************************************************************

https.listen(8080); // določimo na katerih vratih bomo poslušali | vrata 80 sicer uporablja LAMP | lahko določimo na "router-ju" (http je glavna spremenljivka, t.j. aplikacija oz. app)

console.log("Uporabite (S) httpS! - Zagon sistema - Uporabite (S) httpS!"); // na konzolo zapišemo sporočilo (v terminal)

var sendDataToClient = 1; // flag to send data to the client

var refreshFrequency = 525; // frequency of control algorithm refresh in ms

var STARTctrlFW = 0; // zastavica za zagon kontrolnega algortma za Naprej
var STARTctrlBK = 0; // zastavica za zagon kontrolnega algortma za Nazaj
var STARTctrlSpinL = 0; // zastavica za vklop kontrolnega algoritma SpinL
var STARTctrlSpinR = 0; // zastavica za izklop kontrolnega algoritma SpinR
var STARTctrlHzLRfw = 0; // zastavica za rotacijo koles naprej z različnimi frekvencami, npr. Levo = 10Hz, Desno = 5Hz 
var STARTctrlHzLRbk = 0; // zastavica za rotacijo koles nazaj z različnimi frekvencami, npr. Levo = 10Hz, Desno = 5Hz     
    
var upperLimitPWM = 150; // zgornja meja vrednosti PWM - le ta določa koliko lahko največ kontrolni algoritem pošlje na PWM    
var lowerLimitPWM = 0; // spodnja meja vrednosti PWM - le ta določa koliko lahko najmanj kontrolni algoritem pošlje na PWM    

var zelenaVrednostNaprej = 0;    
var zelenaVrednostNazaj = 0;
    
var zelenaVrednostSpinLevo = 0;    
var zelenaVrednostSpinDesno = 0;         
    
var zelenaVrednostHzLevo = 0;    
var zelenaVrednostHzDesno = 0;

var PWMfw = 0; // value for pin forward (pin 5)
var PWMbk = 0; // falue for pin backward (pin 6)
var PWMleft = 0; // value for pin left (pin 9)
var PWMright = 0; // value for pin right (pin 10)

var refreshClientGui = 0; // flag for refreshing values in client GUI

var arraySensor1 = new Array();
    arraySensor1[0] = 0;
    arraySensor1[1] = 0;
    arraySensor1[2] = 0;
    arraySensor1[3] = 0;
    arraySensor1[4] = 0;
    arraySensor1[5] = 0;
    arraySensor1[6] = 0;
    arraySensor1[7] = 0;
    arraySensor1[8] = 0;
    arraySensor1[9] = 0;

var arraySensor2 = new Array();
    arraySensor2[0] = 0;
    arraySensor2[1] = 0;
    arraySensor2[2] = 0;
    arraySensor2[3] = 0;
    arraySensor2[4] = 0;
    arraySensor2[5] = 0;
    arraySensor2[6] = 0;
    arraySensor2[7] = 0;
    arraySensor2[8] = 0;
    arraySensor2[9] = 0;

// var timePrevious = Date.now();

function countValuesAndChopArrayLeft (timesArrayLeft, timeValue) {
// function counts the values in the timesArrayLeft that are less or equal to timeValue and chops them out
// function returns chopped array and number of occurences
// timesArrayLeft must be defined as global variable should not lose time in between    

counter = 0;

for (i = 0; i < timesArrayLeft.length; i++) {
    if (timesArrayLeft[i] <= timeValue) {
        counter++;
}
else {break;}
}
    
timesArrayLeft.splice(0, counter); // remove the values from 0, n=counter values
    
return counter; // function returns the number of occurences of times leess or equal to timeValue    

}

function countValuesAndChopArrayRight (timesArrayRight, timeValue) {
// function counts the values in the timesArrayRight that are less or equal to timeValue and chops them out
// function returns chopped array and number of occurences
// timesArrayRight must be defined as global variable should not lose time in between    

counter = 0;

for (i = 0; i < timesArrayRight.length; i++) {
    if (timesArrayRight[i] <= timeValue) {
        counter++;
}
else {break;}
}
    
timesArrayRight.splice(0, counter); // remove the values from 0, n=counter values
    
return counter; // function returns the number of occurences of times leess or equal to timeValue    

}

io.sockets.on("connection", function(socket) {  // od oklepaja ( dalje imamo argument funkcije on -> ob 'connection' se prenese argument t.j. funkcija(socket) 
                                                // ko nekdo pokliče IP preko "browser-ja" ("browser" pošlje nekaj node.js-u) se vzpostavi povezava = "connection" oz.
                                                // je to povezava = "connection" oz. to smatramo kot "connection"
                                                // v tem primeru torej želi client nekaj poslati (ko nekdo z browserjem dostopi na naš ip in port)
                                                // ko imamo povezavo moramo torej izvesti funkcijo: function (socket)
                                                // pri tem so argument podatki "socket-a" t.j. argument = socket
                                                // ustvari se socket_id
    
    var timePreviousLeft = Date.now(); // inicializiramo čas ob povezavi klienta
    var timePreviousRight = timePreviousLeft;
    
    var timesArrayLeft = new Array();
    var timesArrayLeft = []; // ob povezavi klienta matriko brišemo
    
    var timesArrayRight = new Array();
    var timesArrayRight = []; // ob povezavi klienta matriko brišemo    
    
    var secondLeftFlag = 0; // zastavica, da vemo, da sta iz LEVEGA enkoderja prišli vsaj dve vrednosti    
    var secondRightFlag = 0; // zastavica, da vemo, da sta iz DESNEGA enkoderja prišli vsaj dve vrednosti    
    
    socket.on("commandToArduinoFW", function(data) { // ko je socket ON in je posredovan preko connection-a: ukazArduinu (t.j. ukaz: išči funkcijo ukazArduinu)
        board.digitalWrite(13, board.HIGH); // na pinu 3 zapišemo vrednost HIGH
        board.digitalWrite(12, board.LOW); // na pinu 3 zapišemo vrednost HIGH
        board.digitalWrite(8, board.LOW); // na pinu 3 zapišemo vrednost HIGH
        board.digitalWrite(7, board.LOW); // na pinu 3 zapišemo vrednost HIGH
        board.digitalWrite(4, board.LOW); // na pinu 3 zapišemo vrednost HIGH
    });
    
    socket.on("commandToArduinoBK", function(data) { // ko je socket ON in je posredovan preko connection-a: ukazArduinu (t.j. ukaz: išči funkcijo ukazArduinu)
        board.digitalWrite(12, board.HIGH); // na pinu 3 zapišemo vrednost HIGH
        board.digitalWrite(13, board.LOW); // na pinu 3 zapišemo vrednost HIGH
        board.digitalWrite(8, board.LOW); // na pinu 3 zapišemo vrednost HIGH
        board.digitalWrite(7, board.LOW); // na pinu 3 zapišemo vrednost HIGH
        board.digitalWrite(4, board.LOW); // na pinu 3 zapišemo vrednost HIGH
    });
    
    socket.on("commandToArduinoSpinL", function(data) { // ko je socket ON in je posredovan preko connection-a: ukazArduinu (t.j. ukaz: išči funkcijo ukazArduinu)
        board.digitalWrite(8, board.HIGH); // na pinu zapišemo vrednost HIGH
        board.digitalWrite(13, board.LOW); // na pinu 3 zapišemo vrednost HIGH
        board.digitalWrite(12, board.LOW); // na pinu 3 zapišemo vrednost HIGH
        board.digitalWrite(7, board.LOW); // na pinu 3 zapišemo vrednost HIGH
        board.digitalWrite(4, board.LOW); // na pinu 3 zapišemo vrednost HIGH
    });
    
socket.on("commandToArduinoSpinR", function(data) { // ko je socket ON in je posredovan preko connection-a: ukazArduinu (t.j. ukaz: išči funkcijo ukazArduinu)
        board.digitalWrite(7, board.HIGH); // na pinu zapišemo vrednost HIGH
        board.digitalWrite(13, board.LOW); // na pinu 3 zapišemo vrednost HIGH
        board.digitalWrite(12, board.LOW); // na pinu 3 zapišemo vrednost HIGH
        board.digitalWrite(8, board.LOW); // na pinu 3 zapišemo vrednost HIGH
        board.digitalWrite(4, board.LOW); // na pinu 3 zapišemo vrednost HIGH
    });
    
    socket.on("commandToArduinoTurnFwLeftL5R10", function(data) { // ko je socket ON in je posredovan preko connection-a: ukazArduinu (t.j. ukaz: išči funkcijo ukazArduinu)
        board.digitalWrite(13, board.HIGH); // na pinu 3 zapišemo vrednost HIGH
        board.digitalWrite(12, board.LOW); // na pinu 3 zapišemo vrednost HIGH
        board.digitalWrite(8, board.HIGH); // na pinu zapišemo vrednost HIGH
        board.digitalWrite(7, board.LOW); // na pinu 3 zapišemo vrednost HIGH
        board.digitalWrite(4, board.LOW); // na pinu 3 zapišemo vrednost HIGH
    
    });
    
     socket.on("commandToArduinoTurnFwRightL10R5", function(data) { // ko je socket ON in je posredovan preko connection-a: ukazArduinu (t.j. ukaz: išči funkcijo ukazArduinu)
        board.digitalWrite(13, board.LOW); // na pinu 3 zapišemo vrednost HIGH
        board.digitalWrite(12, board.HIGH); // na pinu 3 zapišemo vrednost HIGH
        board.digitalWrite(8, board.LOW); // na pinu zapišemo vrednost HIGH
        board.digitalWrite(7, board.HIGH); // na pinu 3 zapišemo vrednost HIGH
        board.digitalWrite(4, board.LOW); // na pinu 3 zapišemo vrednost HIGH
    }); 
    
     socket.on("commandToArduinoTurnBkLeftL5R10", function(data) { // ko je socket ON in je posredovan preko connection-a: ukazArduinu (t.j. ukaz: išči funkcijo ukazArduinu)
        board.digitalWrite(13, board.LOW); // na pinu 3 zapišemo vrednost HIGH
        board.digitalWrite(12, board.LOW); // na pinu 3 zapišemo vrednost HIGH
        board.digitalWrite(8, board.HIGH); // na pinu zapišemo vrednost HIGH
        board.digitalWrite(7, board.LOW); // na pinu 3 zapišemo vrednost HIGH
        board.digitalWrite(4, board.HIGH); // na pinu 3 zapišemo vrednost HIGH         
    }); 
    
     socket.on("commandToArduinoTurnBkRightL10R5", function(data) { // ko je socket ON in je posredovan preko connection-a: ukazArduinu (t.j. ukaz: išči funkcijo ukazArduinu)
        board.digitalWrite(13, board.LOW); // na pinu 3 zapišemo vrednost HIGH
        board.digitalWrite(12, board.LOW); // na pinu 3 zapišemo vrednost HIGH
        board.digitalWrite(7, board.LOW); // na pinu zapišemo vrednost HIGH
        board.digitalWrite(8, board.LOW); // na pinu 3 zapišemo vrednost HIGH
        board.digitalWrite(4, board.LOW); // na pinu 3 zapišemo vrednost HIGH         
    }); 
    
	socket.on("ukazArduinuSTOP", function() {
        board.digitalWrite(4, board.HIGH); // na pinu zapišemo vrednost HIGH
        board.digitalWrite(13, board.LOW); // na pinu 3 zapišemo vrednost HIGH
        board.digitalWrite(12, board.LOW); // na pinu 3 zapišemo vrednost HIGH
        board.digitalWrite(8, board.LOW); // na pinu 3 zapišemo vrednost HIGH
        board.digitalWrite(7, board.LOW); // na pinu 3 zapišemo vrednost HIGH
    });
    
	socket.on("commandToArduinoAllON", function() {
        board.digitalWrite(13, board.HIGH); // na pinu 3 zapišemo vrednost HIGH
        board.digitalWrite(12, board.HIGH); // na pinu 3 zapišemo vrednost HIGH
        board.digitalWrite(8, board.HIGH); // na pinu 3 zapišemo vrednost HIGH
        board.digitalWrite(7, board.HIGH); // na pinu 3 zapišemo vrednost HIGH
        board.digitalWrite(4, board.HIGH); // na pinu zapišemo vrednost HIGH        
    });   
    
    socket.on("commandToArduinoAllOFF", function() {
        board.digitalWrite(13, board.LOW); // na pinu 3 zapišemo vrednost HIGH
        board.digitalWrite(12, board.LOW); // na pinu 3 zapišemo vrednost HIGH
        board.digitalWrite(7, board.LOW); // na pinu zapišemo vrednost HIGH
        board.digitalWrite(8, board.LOW); // na pinu 3 zapišemo vrednost HIGH
        board.digitalWrite(4, board.LOW); // na pinu 3 zapišemo vrednost HIGH  
        });   
});