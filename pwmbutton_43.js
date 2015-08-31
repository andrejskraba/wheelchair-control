/*********************************************************************        
University of Maribor ************************************************
Faculty of Organizational Sciences ***********************************
Cybernetics & Decision Support Systems Laboratory ********************
@author Andrej Škraba ************************************************
@author Andrej Koložvari**********************************************
@author Davorin Kofjač ***********************************************
@author Radovan Stojanović *******************************************
*********************************************************************/

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

    fs.readFile(__dirname + "/pwmbutton_43.html",
    function (err, data) { // callback funkcija za branje tekstne datoteke
        if (err) {
            res.writeHead(500);
            return res.end("Napaka pri nalaganju strani pwmbutton...html");
        }
        
    res.writeHead(200);
    res.end(data);
    });
     
    case('/admin') :
               
    fs.readFile(__dirname + "/pwmbutton_admin_43.html",
    function (err, data) { // callback funkcija za branje tekstne datoteke
        if (err) {
            res.writeHead(500);
            return res.end("Napaka pri nalaganju strani admin...html");
        }
        
    res.writeHead(200);
    res.end(data);
    });
            
    case('/adminspeech') : // v primeru, da je v web naslovu na koncu napisano /zahvala
               
    fs.readFile(__dirname + "/pwmbutton_admin_speech_43.html",
    function (err, data) { // callback funkcija za branje tekstne datoteke
        if (err) {
            res.writeHead(500);
            return res.end("Napaka pri nalaganju strani admin...html");
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

var firmata = require("firmata");

console.log("Uporabite (S) httpS! - Zagon sistema - Uporabite (S) httpS!"); // na konzolo zapišemo sporočilo (v terminal)

var board = new firmata.Board("/dev/ttyACM0",function(){
    console.log("Priključitev na Arduino");
    console.log("Firmware: " + board.firmware.name + "-" + board.firmware.version.major + "." + board.firmware.version.minor); // izpišemo verzijo Firmware
    console.log("Omogočimo pine");
	board.pinMode(22, board.MODES.INPUT); // LEFT digital pin from encoder
    board.pinMode(52, board.MODES.INPUT); // RIGHT digital pin from encoder
    board.pinMode(3, board.MODES.OUTPUT);
    board.pinMode(5, board.MODES.PWM);
    board.pinMode(6, board.MODES.PWM);
    board.pinMode(9, board.MODES.PWM);
    board.pinMode(10, board.MODES.PWM);
    board.pinMode(0, board.MODES.ANALOG); // analog pin for SHARP sensor 0A41SK F 3Z
    board.pinMode(13, board.MODES.OUTPUT);
});


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

var arraySensor = new Array();
    arraySensor[0] = 0;
    arraySensor[1] = 0;
    arraySensor[2] = 0;
    arraySensor[3] = 0;
    arraySensor[4] = 0;
    arraySensor[5] = 0;
    arraySensor[6] = 0;

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
    
// Senzorji imajo prioriteto / sensor    
    
    board.analogRead(0, function(value) {
        
        arraySensor.splice(0,1); // na mestu 0 v polju odrežemo eno vrednost
        arraySensor[6] = value; // na koncu jo dodamo
        
        sum = arraySensor.reduce(function(a, b) { return a + b; }); // vsota polja
        averageSensor = sum / 7; // povprečje polja
        
        socket.emit("klientBeri3", {"vrednost": averageSensor});
        
        if (averageSensor > 71) { 
            
            STARTctrlFW = 0; // zastavica za zagon kontrolnega algortma za Naprej
            STARTctrlBK = 1; // zastavica za zagon kontrolnega algortma za Nazaj
            STARTctrlSpinL = 0; // zastavica za vklop kontrolnega algoritma SpinL
            STARTctrlSpinR = 0; // zastavica za izklop kontrolnega algoritma SpinR
            STARTctrlHzLRfw = 0; // zastavica za rotacijo koles naprej z različnimi frekvencami, npr. Levo = 10Hz, Desno = 5Hz 
            STARTctrlHzLRbk = 0; // zastavica za rotacijo koles nazaj z različnimi frekvencami, npr. Levo = 10Hz, Desno = 5Hz
            
            //board.digitalWrite(3, board.LOW); // na pinu 3 zapišemo vrednost LOW
            //board.digitalWrite(13, board.LOW); // na pinu 3 zapišemo vrednost LOW
            board.analogWrite(5, 0); // Naprej
            //board.analogWrite(6, 0); // Nazaj
            board.analogWrite(9, 0); // Levo
            board.analogWrite(10, 0); // Desno
            
            zelenaVrednostNaprej = 0;    
            zelenaVrednostNazaj = 0;
    
            zelenaVrednostSpinLevo = 0;    
            zelenaVrednostSpinDesno = 0;         
    
            zelenaVrednostHzLevo = 0;    
            zelenaVrednostHzDesno = 0;
         
        }

    });     
    
    
    var timePreviousLeft = Date.now(); // inicializiramo čas ob povezavi klienta
    var timePreviousRight = timePreviousLeft;
    
    //var leftCount = 0;
    //var rightCount = 0;
    
    var timesArrayLeft = new Array();
    var timesArrayLeft = []; // ob povezavi klienta matriko brišemo
    
    var timesArrayRight = new Array();
    var timesArrayRight = []; // ob povezavi klienta matriko brišemo    
    
    var secondLeftFlag = 0; // zastavica, da vemo, da sta iz LEVEGA enkoderja prišli vsaj dve vrednosti    
    var secondRightFlag = 0; // zastavica, da vemo, da sta iz DESNEGA enkoderja prišli vsaj dve vrednosti    
    
    
    
    socket.emit("sporociloKlientu", Date.now()); // izvedemo funkcijo = "hello" na klientu, z argumentom, t.j. podatki="Strežnik povezan."

	socket.on("ukazArduinu", function(data) { // ko je socket ON in je posredovan preko connection-a: ukazArduinu (t.j. ukaz: išči funkcijo ukazArduinu)
        if (data.stevilkaUkaza == "1") { // če je številka ukaza, ki smo jo dobili iz klienta enaka 1
            board.digitalWrite(13, board.HIGH); // na pinu 13 zapišemo vrednost HIGH
            board.analogWrite(6, 150); // tretji argument je lahko tudi callback - za funkcijo, ki jo kličemo po izvedbi
            console.log("ana6=" + "150");
            //board.analogWrite(6, pwmValue2); // tretji argument je lahko tudi callback - za funkcijo, ki jo kličemo po izvedbi
            
            
            
            socket.emit("sporociloKlientu", "LED prižgana."); // izvedemo to funkcijo = "sporociloKlientu" na klientu, z argumentom, t.j. podatki="LED prižgana."
        }
        else if (data.stevilkaUkaza == "0") { // če je številka ukaza, ki smo jo dobili iz klienta enaka 0
            board.digitalWrite(3, board.LOW); // na pinu 13 zapišemo vrednost LOW
            //board.analogWrite(6, 0); // tretji argument je lahko tudi callback - za funkcijo, ki jo kličemo po izvedbi
            socket.emit("sporociloKlientu", "LED ugasnjena."); // izvedemo to funkcijo = "sporociloKlientu" na klientu, z argumentom, t.j. podatki="LED ugasnjena."
        }
        else if (data.stevilkaUkaza == "2") { // če je številka ukaza, ki smo jo dobili iz klienta enaka 2
            if (data.valuePWM != 0) { // če PWM vrednost ni 0 vklopimo rele
                board.digitalWrite(3, board.HIGH); // na pinu 3 zapišemo vrednost HIGH
                board.digitalWrite(13, board.HIGH); // na pinu 3 zapišemo vrednost HIGH
            }
            //else { // če je PWM vrednost enaka 0 izklopimo rele
            //    board.digitalWrite(3, board.LOW); // na pinu 3 zapišemo vrednost LOW
            //}
            board.analogWrite(data.pinNo, data.valuePWM); // tretji argument je lahko tudi callback - za funkcijo, ki jo kličemo po izvedbi
            console.log("pinNO=" + data.pinNo + " | " + "valuePWM = " + data.valuePWM);
            socket.emit("sporociloKlientu", "PWM Custom."); // izvedemo to funkcijo = "sporociloKlientu" na klientu, z argumentom, t.j. podatki="LED ugasnjena."
        }
        
        else if (data.stevilkaUkaza == "3") { // če je številka ukaza, ki smo jo dobili iz klienta enaka 0
            if (data.valuePWM != 0) { // če PWM vrednost ni 0 vklopimo rele
                board.digitalWrite(3, board.HIGH); // na pinu 3 zapišemo vrednost HIGH
            }
            //else { // če je PWM vrednost enaka 0 izklopimo rele
            //    board.digitalWrite(3, board.LOW); // na pinu 3 zapišemo vrednost LOW
            //    board.digitalWrite(13, board.LOW); // na pinu 3 zapišemo vrednost LOW
            //}
            board.analogWrite(data.pinNo, data.valuePWM); // tretji argument je lahko tudi callback - za funkcijo, ki jo kličemo po izvedbi
            console.log("pinNO=" + data.pinNo + " | " + "valuePWM = " + data.valuePWM);
            socket.emit("sporociloKlientu", "PWM Custom."); // izvedemo to funkcijo = "sporociloKlientu" na klientu, z argumentom, t.j. podatki="LED ugasnjena."
        }        
        
	});
    
    
    socket.on("commandToArduinoFW", function(data) { // ko je socket ON in je posredovan preko connection-a: ukazArduinu (t.j. ukaz: išči funkcijo ukazArduinu)
        STARTctrlFW = 0; // control flag for ForWard part of the control algorithm
        STARTctrlBK = 0; // similar
        STARTctrlSpinL = 0;
        STARTctrlSpinR = 0;
        STARTctrlHzLRfw = 0;
        STARTctrlHzLRbk = 0;

        zelenaVrednostNaprej = 10;
        zelenaVrednostNazaj = 0;
        zelenaVrednostSpinLevo = 0; 
        zelenaVrednostSpinDesno = 0;
        zelenaVrednostHzLevo = 0; 
        zelenaVrednostHzDesno = 0;
        
        PWMfw = 124; // value for pin forward (pin 5)
        PWMbk = 0; // falue for pin backward (pin 6)
        PWMleft = 110; // value for pin left (pin 9)
        PWMright = 91; // value for pin right (pin 10)
        
        // we switch on the relay and LED indicator
        board.digitalWrite(3, board.HIGH); // na pinu 3 zapišemo vrednost HIGH
        board.digitalWrite(13, board.HIGH); // na pinu 3 zapišemo vrednost HIGH
        
        board.analogWrite(5, PWMfw); // tretji argument je lahko tudi callback - za funkcijo, ki jo kličemo po izvedbi
        board.analogWrite(6, PWMbk); // tretji argument je lahko tudi callback - za funkcijo, ki jo kličemo po izvedbi
        board.analogWrite(9, PWMleft); // tretji argument je lahko tudi callback - za funkcijo, ki jo kličemo po izvedbi
        board.analogWrite(10, PWMright); // tretji argument je lahko tudi callback - za funkcijo, ki jo kličemo po izvedbi
        
        if (refreshClientGui == 1) {
        socket.emit("refreshClientGUInumValues", {
            "zelenaVrednostNaprej": zelenaVrednostNaprej,
            "zelenaVrednostNazaj": zelenaVrednostNazaj,
            "zelenaVrednostSpinLevo": zelenaVrednostSpinLevo, 
            "zelenaVrednostSpinDesno": zelenaVrednostSpinDesno,
            "zelenaVrednostHzLevo": zelenaVrednostHzLevo, 
            "zelenaVrednostHzDesno": zelenaVrednostHzDesno,
            "PWMfw": PWMfw,
            "PWMbk": PWMbk,
            "PWMleft": PWMleft,
            "PWMright": PWMright,
        });
        }

        STARTctrlFW = 1; // zastavico za STARTctrlFW dvignemo, kontrolni algoritem lahko prične z delom, vse nastavitve zgoraj so vnešene
	
    });
    
    socket.on("commandToArduinoBK", function(data) { // ko je socket ON in je posredovan preko connection-a: ukazArduinu (t.j. ukaz: išči funkcijo ukazArduinu)
        STARTctrlFW = 0; // control flag for ForWard part of the control algorithm
        STARTctrlBK = 0; // similar
        STARTctrlSpinL = 0;
        STARTctrlSpinR = 0;
        STARTctrlHzLRfw = 0;
        STARTctrlHzLRbk = 0;

        zelenaVrednostNaprej = 0;
        zelenaVrednostNazaj = 10;
        zelenaVrednostSpinLevo = 0; 
        zelenaVrednostSpinDesno = 0;
        zelenaVrednostHzLevo = 0; 
        zelenaVrednostHzDesno = 0;
        
        PWMfw = 0; // value for pin forward (pin 5)
        PWMbk = 135; // falue for pin backward (pin 6)
        PWMleft = 110; // value for pin left (pin 9)
        PWMright = 91; // value for pin right (pin 10)
        
        // we switch on the relay and LED indicator
        board.digitalWrite(3, board.HIGH); // na pinu 3 zapišemo vrednost HIGH
        board.digitalWrite(13, board.HIGH); // na pinu 3 zapišemo vrednost HIGH
        
        board.analogWrite(5, PWMfw); // tretji argument je lahko tudi callback - za funkcijo, ki jo kličemo po izvedbi
        board.analogWrite(6, PWMbk); // tretji argument je lahko tudi callback - za funkcijo, ki jo kličemo po izvedbi
        board.analogWrite(9, PWMleft); // tretji argument je lahko tudi callback - za funkcijo, ki jo kličemo po izvedbi
        board.analogWrite(10, PWMright); // tretji argument je lahko tudi callback - za funkcijo, ki jo kličemo po izvedbi
        
        if (refreshClientGui == 1) { 
        socket.emit("refreshClientGUInumValues", {
            "zelenaVrednostNaprej": zelenaVrednostNaprej,
            "zelenaVrednostNazaj": zelenaVrednostNazaj,
            "zelenaVrednostSpinLevo": zelenaVrednostSpinLevo, 
            "zelenaVrednostSpinDesno": zelenaVrednostSpinDesno,
            "zelenaVrednostHzLevo": zelenaVrednostHzLevo, 
            "zelenaVrednostHzDesno": zelenaVrednostHzDesno,
            "PWMfw": PWMfw,
            "PWMbk": PWMbk,
            "PWMleft": PWMleft,
            "PWMright": PWMright,
        });
        }

        STARTctrlBK = 1; // zastavico za STARTctrlFW dvignemo, kontrolni algoritem lahko prične z delom, vse nastavitve zgoraj so vnešene
	
    });
    
    socket.on("commandToArduinoSpinL", function(data) { // ko je socket ON in je posredovan preko connection-a: ukazArduinu (t.j. ukaz: išči funkcijo ukazArduinu)
        STARTctrlFW = 0; // control flag for ForWard part of the control algorithm
        STARTctrlBK = 0; // similar
        STARTctrlSpinL = 0;
        STARTctrlSpinR = 0;
        STARTctrlHzLRfw = 0;
        STARTctrlHzLRbk = 0;

        zelenaVrednostNaprej = 0;
        zelenaVrednostNazaj = 0;
        zelenaVrednostSpinLevo = 10; 
        zelenaVrednostSpinDesno = 0;
        zelenaVrednostHzLevo = 0; 
        zelenaVrednostHzDesno = 0;
        
        PWMfw = 85; // value for pin forward (pin 5)
        PWMbk = 116; // falue for pin backward (pin 6)
        PWMleft = 131; // value for pin left (pin 9)
        PWMright = 0; // value for pin right (pin 10)
        
        // we switch on the relay and LED indicator
        board.digitalWrite(3, board.HIGH); // na pinu 3 zapišemo vrednost HIGH
        board.digitalWrite(13, board.HIGH); // na pinu 3 zapišemo vrednost HIGH
        
        board.analogWrite(5, PWMfw); // tretji argument je lahko tudi callback - za funkcijo, ki jo kličemo po izvedbi
        board.analogWrite(6, PWMbk); // tretji argument je lahko tudi callback - za funkcijo, ki jo kličemo po izvedbi
        board.analogWrite(9, PWMleft); // tretji argument je lahko tudi callback - za funkcijo, ki jo kličemo po izvedbi
        board.analogWrite(10, PWMright); // tretji argument je lahko tudi callback - za funkcijo, ki jo kličemo po izvedbi
        
        if (refreshClientGui == 1) { 
        socket.emit("refreshClientGUInumValues", {
            "zelenaVrednostNaprej": zelenaVrednostNaprej,
            "zelenaVrednostNazaj": zelenaVrednostNazaj,
            "zelenaVrednostSpinLevo": zelenaVrednostSpinLevo, 
            "zelenaVrednostSpinDesno": zelenaVrednostSpinDesno,
            "zelenaVrednostHzLevo": zelenaVrednostHzLevo, 
            "zelenaVrednostHzDesno": zelenaVrednostHzDesno,
            "PWMfw": PWMfw,
            "PWMbk": PWMbk,
            "PWMleft": PWMleft,
            "PWMright": PWMright,
        });
        }

        STARTctrlSpinL = 1; // zastavico za STARTctrlFW dvignemo, kontrolni algoritem lahko prične z delom, vse nastavitve zgoraj so vnešene
	
    });
    
socket.on("commandToArduinoSpinR", function(data) { // ko je socket ON in je posredovan preko connection-a: ukazArduinu (t.j. ukaz: išči funkcijo ukazArduinu)
        STARTctrlFW = 0; // control flag for ForWard part of the control algorithm
        STARTctrlBK = 0; // similar
        STARTctrlSpinL = 0;
        STARTctrlSpinR = 0;
        STARTctrlHzLRfw = 0;
        STARTctrlHzLRbk = 0;

        zelenaVrednostNaprej = 0;
        zelenaVrednostNazaj = 0;
        zelenaVrednostSpinLevo = 0; 
        zelenaVrednostSpinDesno = 10;
        zelenaVrednostHzLevo = 0; 
        zelenaVrednostHzDesno = 0;
        
        PWMfw = 102; // value for pin forward (pin 5)
        PWMbk = 98; // falue for pin backward (pin 6)
        PWMleft = 0; // value for pin left (pin 9)
        PWMright = 127; // value for pin right (pin 10)
        
        // we switch on the relay and LED indicator
        board.digitalWrite(3, board.HIGH); // na pinu 3 zapišemo vrednost HIGH
        board.digitalWrite(13, board.HIGH); // na pinu 3 zapišemo vrednost HIGH
        
        board.analogWrite(5, PWMfw); // tretji argument je lahko tudi callback - za funkcijo, ki jo kličemo po izvedbi
        board.analogWrite(6, PWMbk); // tretji argument je lahko tudi callback - za funkcijo, ki jo kličemo po izvedbi
        board.analogWrite(9, PWMleft); // tretji argument je lahko tudi callback - za funkcijo, ki jo kličemo po izvedbi
        board.analogWrite(10, PWMright); // tretji argument je lahko tudi callback - za funkcijo, ki jo kličemo po izvedbi
        
        if (refreshClientGui == 1) { 
        socket.emit("refreshClientGUInumValues", {
            "zelenaVrednostNaprej": zelenaVrednostNaprej,
            "zelenaVrednostNazaj": zelenaVrednostNazaj,
            "zelenaVrednostSpinLevo": zelenaVrednostSpinLevo, 
            "zelenaVrednostSpinDesno": zelenaVrednostSpinDesno,
            "zelenaVrednostHzLevo": zelenaVrednostHzLevo, 
            "zelenaVrednostHzDesno": zelenaVrednostHzDesno,
            "PWMfw": PWMfw,
            "PWMbk": PWMbk,
            "PWMleft": PWMleft,
            "PWMright": PWMright,
        });
        }

        STARTctrlSpinR = 1; // zastavico za STARTctrlFW dvignemo, kontrolni algoritem lahko prične z delom, vse nastavitve zgoraj so vnešene
	
    });
    
    socket.on("commandToArduinoTurnFwLeftL5R10", function(data) { // ko je socket ON in je posredovan preko connection-a: ukazArduinu (t.j. ukaz: išči funkcijo ukazArduinu)
        STARTctrlFW = 0; // control flag for ForWard part of the control algorithm
        STARTctrlBK = 0; // similar
        STARTctrlSpinL = 0;
        STARTctrlSpinR = 0;
        STARTctrlHzLRfw = 0;
        STARTctrlHzLRbk = 0;

        zelenaVrednostNaprej = 0;
        zelenaVrednostNazaj = 0;
        zelenaVrednostSpinLevo = 0; 
        zelenaVrednostSpinDesno = 0;
        zelenaVrednostHzLevo = 5; 
        zelenaVrednostHzDesno = 10;
        
        PWMfw = 123; // value for pin forward (pin 5)
        PWMbk = 0; // falue for pin backward (pin 6)
        PWMleft = 113; // value for pin left (pin 9)
        PWMright = 87; // value for pin right (pin 10)
        
        // we switch on the relay and LED indicator
        board.digitalWrite(3, board.HIGH); // na pinu 3 zapišemo vrednost HIGH
        board.digitalWrite(13, board.HIGH); // na pinu 3 zapišemo vrednost HIGH
        
        board.analogWrite(5, PWMfw); // tretji argument je lahko tudi callback - za funkcijo, ki jo kličemo po izvedbi
        board.analogWrite(6, PWMbk); // tretji argument je lahko tudi callback - za funkcijo, ki jo kličemo po izvedbi
        board.analogWrite(9, PWMleft); // tretji argument je lahko tudi callback - za funkcijo, ki jo kličemo po izvedbi
        board.analogWrite(10, PWMright); // tretji argument je lahko tudi callback - za funkcijo, ki jo kličemo po izvedbi
        
        if (refreshClientGui == 1) { 
        socket.emit("refreshClientGUInumValues", {
            "zelenaVrednostNaprej": zelenaVrednostNaprej,
            "zelenaVrednostNazaj": zelenaVrednostNazaj,
            "zelenaVrednostSpinLevo": zelenaVrednostSpinLevo, 
            "zelenaVrednostSpinDesno": zelenaVrednostSpinDesno,
            "zelenaVrednostHzLevo": zelenaVrednostHzLevo, 
            "zelenaVrednostHzDesno": zelenaVrednostHzDesno,
            "PWMfw": PWMfw,
            "PWMbk": PWMbk,
            "PWMleft": PWMleft,
            "PWMright": PWMright,
        });
        }

        STARTctrlHzLRfw = 1; // zastavico za STARTctrlFW dvignemo, kontrolni algoritem lahko prične z delom, vse nastavitve zgoraj so vnešene
	
    });   
    
     socket.on("commandToArduinoTurnFwRightL10R5", function(data) { // ko je socket ON in je posredovan preko connection-a: ukazArduinu (t.j. ukaz: išči funkcijo ukazArduinu)
        STARTctrlFW = 0; // control flag for ForWard part of the control algorithm
        STARTctrlBK = 0; // similar
        STARTctrlSpinL = 0;
        STARTctrlSpinR = 0;
        STARTctrlHzLRfw = 0;
        STARTctrlHzLRbk = 0;

        zelenaVrednostNaprej = 0;
        zelenaVrednostNazaj = 0;
        zelenaVrednostSpinLevo = 0; 
        zelenaVrednostSpinDesno = 0;
        zelenaVrednostHzLevo = 10; 
        zelenaVrednostHzDesno = 5;
        
        PWMfw = 122; // value for pin forward (pin 5)
        PWMbk = 0; // falue for pin backward (pin 6)
        PWMleft = 91; // value for pin left (pin 9)
        PWMright = 107; // value for pin right (pin 10)
        
        // we switch on the relay and LED indicator
        board.digitalWrite(3, board.HIGH); // na pinu 3 zapišemo vrednost HIGH
        board.digitalWrite(13, board.HIGH); // na pinu 3 zapišemo vrednost HIGH
        
        board.analogWrite(5, PWMfw); // tretji argument je lahko tudi callback - za funkcijo, ki jo kličemo po izvedbi
        board.analogWrite(6, PWMbk); // tretji argument je lahko tudi callback - za funkcijo, ki jo kličemo po izvedbi
        board.analogWrite(9, PWMleft); // tretji argument je lahko tudi callback - za funkcijo, ki jo kličemo po izvedbi
        board.analogWrite(10, PWMright); // tretji argument je lahko tudi callback - za funkcijo, ki jo kličemo po izvedbi
        
         if (refreshClientGui == 1) {
         socket.emit("refreshClientGUInumValues", {
            "zelenaVrednostNaprej": zelenaVrednostNaprej,
            "zelenaVrednostNazaj": zelenaVrednostNazaj,
            "zelenaVrednostSpinLevo": zelenaVrednostSpinLevo, 
            "zelenaVrednostSpinDesno": zelenaVrednostSpinDesno,
            "zelenaVrednostHzLevo": zelenaVrednostHzLevo, 
            "zelenaVrednostHzDesno": zelenaVrednostHzDesno,
            "PWMfw": PWMfw,
            "PWMbk": PWMbk,
            "PWMleft": PWMleft,
            "PWMright": PWMright,
         });
         }

        STARTctrlHzLRfw = 1; // zastavico za STARTctrlFW dvignemo, kontrolni algoritem lahko prične z delom, vse nastavitve zgoraj so vnešene
	
    }); 
    
     socket.on("commandToArduinoTurnBkLeftL5R10", function(data) { // ko je socket ON in je posredovan preko connection-a: ukazArduinu (t.j. ukaz: išči funkcijo ukazArduinu)
        STARTctrlFW = 0; // control flag for ForWard part of the control algorithm
        STARTctrlBK = 0; // similar
        STARTctrlSpinL = 0;
        STARTctrlSpinR = 0;
        STARTctrlHzLRfw = 0;
        STARTctrlHzLRbk = 0;

        zelenaVrednostNaprej = 0;
        zelenaVrednostNazaj = 0;
        zelenaVrednostSpinLevo = 0; 
        zelenaVrednostSpinDesno = 0;
        zelenaVrednostHzLevo = 5; 
        zelenaVrednostHzDesno = 10;
        
        PWMfw = 0; // value for pin forward (pin 5)
        PWMbk = 132; // falue for pin backward (pin 6)
        PWMleft = 81; // value for pin left (pin 9)
        PWMright = 109; // value for pin right (pin 10)
        
        // we switch on the relay and LED indicator
        board.digitalWrite(3, board.HIGH); // na pinu 3 zapišemo vrednost HIGH
        board.digitalWrite(13, board.HIGH); // na pinu 3 zapišemo vrednost HIGH
        
        board.analogWrite(5, PWMfw); // tretji argument je lahko tudi callback - za funkcijo, ki jo kličemo po izvedbi
        board.analogWrite(6, PWMbk); // tretji argument je lahko tudi callback - za funkcijo, ki jo kličemo po izvedbi
        board.analogWrite(9, PWMleft); // tretji argument je lahko tudi callback - za funkcijo, ki jo kličemo po izvedbi
        board.analogWrite(10, PWMright); // tretji argument je lahko tudi callback - za funkcijo, ki jo kličemo po izvedbi
        
        if (refreshClientGui == 1) { 
        socket.emit("refreshClientGUInumValues", {
            "zelenaVrednostNaprej": zelenaVrednostNaprej,
            "zelenaVrednostNazaj": zelenaVrednostNazaj,
            "zelenaVrednostSpinLevo": zelenaVrednostSpinLevo, 
            "zelenaVrednostSpinDesno": zelenaVrednostSpinDesno,
            "zelenaVrednostHzLevo": zelenaVrednostHzLevo, 
            "zelenaVrednostHzDesno": zelenaVrednostHzDesno,
            "PWMfw": PWMfw,
            "PWMbk": PWMbk,
            "PWMleft": PWMleft,
            "PWMright": PWMright,
        });
        }

        STARTctrlHzLRbk = 1; // zastavico za STARTctrlFW dvignemo, kontrolni algoritem lahko prične z delom, vse nastavitve zgoraj so vnešene
	
    }); 
    
     socket.on("commandToArduinoTurnBkRightL10R5", function(data) { // ko je socket ON in je posredovan preko connection-a: ukazArduinu (t.j. ukaz: išči funkcijo ukazArduinu)
        STARTctrlFW = 0; // control flag for ForWard part of the control algorithm
        STARTctrlBK = 0; // similar
        STARTctrlSpinL = 0;
        STARTctrlSpinR = 0;
        STARTctrlHzLRfw = 0;
        STARTctrlHzLRbk = 0;

        zelenaVrednostNaprej = 0;
        zelenaVrednostNazaj = 0;
        zelenaVrednostSpinLevo = 0; 
        zelenaVrednostSpinDesno = 0;
        zelenaVrednostHzLevo = 10; 
        zelenaVrednostHzDesno = 5;
        
        PWMfw = 0; // value for pin forward (pin 5)
        PWMbk = 132; // falue for pin backward (pin 6)
        PWMleft = 113; // value for pin left (pin 9)
        PWMright = 76; // value for pin right (pin 10)
        
        // we switch on the relay and LED indicator
        board.digitalWrite(3, board.HIGH); // na pinu 3 zapišemo vrednost HIGH
        board.digitalWrite(13, board.HIGH); // na pinu 3 zapišemo vrednost HIGH
        
        board.analogWrite(5, PWMfw); // tretji argument je lahko tudi callback - za funkcijo, ki jo kličemo po izvedbi
        board.analogWrite(6, PWMbk); // tretji argument je lahko tudi callback - za funkcijo, ki jo kličemo po izvedbi
        board.analogWrite(9, PWMleft); // tretji argument je lahko tudi callback - za funkcijo, ki jo kličemo po izvedbi
        board.analogWrite(10, PWMright); // tretji argument je lahko tudi callback - za funkcijo, ki jo kličemo po izvedbi
        
        if (refreshClientGui == 1) { 
         socket.emit("refreshClientGUInumValues", {
            "zelenaVrednostNaprej": zelenaVrednostNaprej,
            "zelenaVrednostNazaj": zelenaVrednostNazaj,
            "zelenaVrednostSpinLevo": zelenaVrednostSpinLevo, 
            "zelenaVrednostSpinDesno": zelenaVrednostSpinDesno,
            "zelenaVrednostHzLevo": zelenaVrednostHzLevo, 
            "zelenaVrednostHzDesno": zelenaVrednostHzDesno,
            "PWMfw": PWMfw,
            "PWMbk": PWMbk,
            "PWMleft": PWMleft,
            "PWMright": PWMright,
        });
        }

        STARTctrlHzLRbk = 1; // zastavico za STARTctrlFW dvignemo, kontrolni algoritem lahko prične z delom, vse nastavitve zgoraj so vnešene
	
    }); 
    
    
    
    
    
    
    
    
	socket.on("ukazArduinuSTOP", function() {
        STARTctrlFW = 0; // zastavica za zagon kontrolnega algortma za Naprej
        STARTctrlBK = 0; // zastavica za zagon kontrolnega algortma za Nazaj
        STARTctrlSpinL = 0; // zastavica za vklop kontrolnega algoritma SpinL
        STARTctrlSpinR = 0; // zastavica za izklop kontrolnega algoritma SpinR
        STARTctrlHzLRfw = 0; // zastavica za rotacijo koles naprej z različnimi frekvencami, npr. Levo = 10Hz, Desno = 5Hz 
        STARTctrlHzLRbk = 0; // zastavica za rotacijo koles nazaj z različnimi frekvencami, npr. Levo = 10Hz, Desno = 5Hz
        
        board.digitalWrite(3, board.LOW); // na pinu 3 zapišemo vrednost LOW
        board.digitalWrite(13, board.LOW); // na pinu 3 zapišemo vrednost LOW
        board.analogWrite(5, 0); // Naprej
        board.analogWrite(6, 0); // Nazaj
        board.analogWrite(9, 0); // Levo
        board.analogWrite(10, 0); // Desno
        
        zelenaVrednostNaprej = 0;    
        zelenaVrednostNazaj = 0;
    
        zelenaVrednostSpinLevo = 0;    
        zelenaVrednostSpinDesno = 0;         
    
        zelenaVrednostHzLevo = 0;    
        zelenaVrednostHzDesno = 0;
    });
    
    
    board.digitalRead(22, function(value) { // LEFT funkcija se aktivira le, kadar se spremeni stanje; sicer bi bilo 1M čitanj na sekundo
        if (secondLeftFlag < 1) { // ta del rabimo, da se ne zgodi, da nam ob vklopu, ko kolesa mirujejo digitalRead prebere 1 - kolo sicer miruje (enko vedno prebre) in bi nato narobe preračunali frekvenco 1/0.5=2 V resnici kolo miruje. Prvi preračun lahko naredimo le, ko se pojavi naslednja vrednost
            secondLeftFlag++;
        }
        else
        {
        timesArrayLeft.push(Date.now());
        socket.emit("klientBeri1", {"vrednost": value, "cas": timesArrayLeft[timesArrayLeft.length - 1]});
        }
        
        socket.emit("sporociloKlientu", "Flag LEFT ->" + secondLeftFlag);
        
    });
    
    board.digitalRead(52, function(value) { // RIGHT funkcija se aktivira le, kadar se spremeni stanje; sicer bi bilo 1M čitanj na sekundo
        if (secondRightFlag < 1) { // ta del rabimo, da se ne zgodi, da nam ob vklopu, ko kolesa mirujejo digitalRead prebere 1 - kolo sicer miruje (enko vedno prebre) in bi nato narobe preračunali frekvenco 1/0.5=2 V resnici kolo miruje. Prvi preračun lahko naredimo le, ko se pojavi naslednja vrednost
            secondRightFlag++;
        }
        else
        {
        timesArrayRight.push(Date.now());
        socket.emit("klientBeri2", {"vrednost": value, "cas": timesArrayRight[timesArrayRight.length - 1]});
        }
        
        socket.emit("sporociloKlientu", "Flag RIGHT ->" + secondRightFlag);
        
    });
    
    
    //},1);
    
//}, 500); // digitalno branje poženemo šele čez pol sekunde zaradi pr        
        
    //analog read RIGHT:
    

    
//    board.analogRead(2, function(value) {
//        socket.emit("klientBeri2", value);
//    });
    
    
    
function frequencyMeasureLeftRight() {
    
    timeNextLeft = Date.now();
    timeNextRight = timeNextLeft;    
    numberOfCountsLeft = countValuesAndChopArrayLeft(timesArrayLeft, timeNextLeft); // number of counts up to current time within last second
    numberOfCountsRight = countValuesAndChopArrayRight(timesArrayRight, timeNextRight); // number of counts up to current time within last second
    timeIntervalLeft = timeNextLeft - timePreviousLeft;
    timePreviousLeft = timeNextLeft;
    frequencyLeft = numberOfCountsLeft/(timeIntervalLeft/1000);
    
    timeIntervalRight = timeNextRight - timePreviousRight;
    timePreviousRight = timeNextRight;
    frequencyRight = numberOfCountsRight/(timeIntervalRight/1000);    
    
    socket.emit("sporociloKlientu", "No->" + numberOfCountsLeft);
    socket.emit("sporociloKlientu", "Time interval->" + timeIntervalLeft + "Freq->" + frequencyLeft);

    socket.emit("sporociloKlientu", "No->" + numberOfCountsRight);
    socket.emit("sporociloKlientu", "Time interval->" + timeIntervalRight + "Freq->" + frequencyRight);
    
    socket.emit("readOutFrequencyLeftRight", {"leftCount": numberOfCountsLeft, "frequencyLeft": frequencyLeft, "rightCount": numberOfCountsRight, "frequencyRight": frequencyRight});
    
    // **************************************************************************************
    // Kontrolni algoritem ZAČETEK
    // **************************************************************************************

    // *************************************************************************
    // Del algoritma za naprej
    // *************************************************************************
    
    if (zelenaVrednostNazaj == 0 && STARTctrlFW == 1) { // le v primeru, da želene vrednosti v smeri nazaj nismo podali izvedemo algoritem za naprej
    
        if (frequencyLeft < zelenaVrednostNaprej || frequencyRight < zelenaVrednostNaprej) { // upoštevati moramo oba enkoderja, saj se lahko enkrat vrti le levi, drugič pa le desni
            
            if (PWMfw < upperLimitPWM) { // omejimo najvišjo vrednost PWM za naprej na upperLimitPWM 
            
                PWMfw++; // povečamo vrednost PWM za 1
            }
                
                valuePWM = PWMfw;
                board.analogWrite(5, valuePWM);
        
                if (frequencyLeft > frequencyRight) { // korekcija če je razlika v hitrosti vrtenja levega in desnega kolesa
                    
                    if (PWMleft < upperLimitPWM) { // omejimo najvišjo vrednost PWM za levo na upperLimitPWM 
                        PWMleft++; // povečamo vrednost PWM za LEVO rotacijo za 1
                    }
                    valuePWMleft = PWMleft;
                    
                    if (PWMright > 0) { // omejimo najmanjšo vrednost PWM za desno na 0 
                        PWMright--; // zmanjšamo vrednost PWM za DESNO rotacijo za 1
                    }
                    valuePWMright = PWMright;
                    
                    board.analogWrite(9, valuePWMleft);
                    board.analogWrite(10, valuePWMright);
                }
                else if (frequencyLeft < frequencyRight) { // korekcija če je razlika v hitrosti vrtenja levega in desnega kolesa
                    
                    if (PWMleft > 0) { // omejimo najmanjšo vrednost PWM za levo na 0 
                        PWMleft--; // povečamo vrednost PWM za LEVO rotacijo 1
                    }
                    valuePWM = PWMleft;
                    
                    if (PWMright < upperLimitPWM) { // omejimo najvišjo vrednost PWM za desno na upperLimitPWM 
                        PWMright++; // povečamo vrednost PWM za DESNO rotacijo za 1
                    }
                    valuePWMright = PWMright;
                    
                    board.analogWrite(9, valuePWM);
                    board.analogWrite(10, valuePWMright);
                }
            //}
        }
        else if (frequencyLeft > zelenaVrednostNaprej || frequencyRight > zelenaVrednostNaprej) {
            
            if (PWMfw > 0) { // omejimo najnižjo vrednost PWM za NAPREJ na 0 - DA NE GREMO V - (divja rotacia!) 
            
                PWMfw--; // zmanjšamo vrednost PWM za 1
            }
                valuePWM = PWMfw;
                board.analogWrite(5, valuePWM);

                if (frequencyLeft > frequencyRight) {
                   
                    if (PWMleft < upperLimitPWM) { // omejimo najvišjo vrednost PWM za levo na upperLimitPWM 
                        PWMleft++; // povečamo vrednost PWM za LEVO rotacijo za 1
                    }
                    valuePWMleft = PWMleft;
                    
                    if (PWMright > 0) { // omejimo najmanjšo vrednost PWM za desno na 0 
                        PWMright--; // zmanjšamo vrednost PWM za DESNO rotacijo za 1
                    }
                    valuePWMright = PWMright;
                    
                    board.analogWrite(9, valuePWMleft);
                    board.analogWrite(10, valuePWMright);
                }
                else if (frequencyLeft < frequencyRight) {
                   
                    if (PWMleft > 0) { // omejimo najmanjšo vrednost PWM za levo na 0 
                        PWMleft--; // povečamo vrednost PWM za LEVO rotacijo 1
                    }
                    valuePWM = PWMleft;
                    
                    if (PWMright < upperLimitPWM) { // omejimo najvišjo vrednost PWM za desno na upperLimitPWM
                        PWMright++; // povečamo vrednost PWM za DESNO rotacijo za 1
                    }
                    valuePWMright = PWMright;
                    
                    board.analogWrite(9, valuePWM);
                    board.analogWrite(10, valuePWMright);
                }
            //}

        }
    }
    
    // *****************************************************************************
    // Del algoritma za nazaj
    // *****************************************************************************
    
    else if (zelenaVrednostNaprej == 0 && STARTctrlBK == 1) {// // le v primeru, da želene vrednosti v smeri naprej nismo podali izvedemo algoritem za nazaj
        //socket.emit("ukazArduinu", {"stevilkaUkaza": stevilkaUkaza, "pinNo": 5, "valuePWM": 1}); // za vsak primer pin naprej postavimo na 0
    
        if (frequencyLeft < zelenaVrednostNazaj || frequencyRight < zelenaVrednostNazaj) { // upoštevati moramo oba enkoderja, saj se lahko enkrat vrti le levi, drugič pa le desni
            
            if (PWMbk < upperLimitPWM) { // omejimo najvišjo vrednost za nazaj na upperLimitPWM 
        
                PWMbk++; // povečamo vrednost PWM nazaj za 1
            }
                valuePWM = PWMbk;
                board.analogWrite(6, valuePWM);
        
                if (frequencyLeft < frequencyRight) {
                    
                    if (PWMleft < upperLimitPWM) { // omejimo najvišjo vrednost PWM za levo na upperLimitPWM 
                        PWMleft++; // povečamo vrednost PWM za LEVO rotacijo za 1
                    }
                    valuePWMleft = PWMleft;
                    
                    if (PWMright > 0) { // omejimo najmanjšo vrednost PWM za desno na 0 
                        PWMright--; // zmanjšamo vrednost PWM za DESNO rotacijo za 1
                    }
                    valuePWMright = PWMright;
                    
                    board.analogWrite(9, valuePWMleft);
                    board.analogWrite(10, valuePWMright);
                }
                else if (frequencyLeft > frequencyRight) {
                    
                    if (PWMleft > 0) { // omejimo najmanjšo vrednost PWM za levo na 0 
                        PWMleft--; // povečamo vrednost PWM za LEVO rotacijo 1
                    }
                    valuePWM = PWMleft;
                    
                    if (PWMright < upperLimitPWM) { // omejimo najvišjo vrednost PWM za desno na upperLimitPWM 
                        PWMright++; // povečamo vrednost PWM za DESNO rotacijo za 1
                    }
                    valuePWMright = PWMright;
                    
                    board.analogWrite(9, valuePWM);
                    board.analogWrite(10, valuePWMright);
                }
            //}
        
        }
        else if (frequencyLeft > zelenaVrednostNazaj || frequencyRight > zelenaVrednostNazaj) {
            
            if (PWMbk > 0) { // omejimo najnižjo vrednost za NAZAJ na 0 - DA NE GREMO V - (divja rotacia!) 

                PWMbk--; // zmanjšamo vrednost PWM nazaj za 1
            }
                valuePWM = PWMbk;
                board.analogWrite(6, valuePWM);

                if (frequencyLeft < frequencyRight) {
                    
                    if (PWMleft < upperLimitPWM) { // omejimo najvišjo vrednost PWM za levo na upperLimitPWM 
                        PWMleft++; // povečamo vrednost PWM za LEVO rotacijo za 1
                    }
                    valuePWMleft = PWMleft;
                    
                    if (PWMright > 0) { // omejimo najmanjšo vrednost PWM za desno na 0 
                        PWMright--; // zmanjšamo vrednost PWM za DESNO rotacijo za 1
                    }
                    valuePWMright = PWMright;
                    
                    board.analogWrite(9, valuePWMleft);
                    board.analogWrite(10, valuePWMright);
                }
                else if (frequencyLeft > frequencyRight) {
                    
                    if (PWMleft > 0) { // omejimo najmanjšo vrednost PWM za levo na 0 
                        PWMleft--; // povečamo vrednost PWM za LEVO rotacijo 1
                    }
                    valuePWM = PWMleft;
                    
                    if (PWMright < upperLimitPWM) { // omejimo najvišjo vrednost PWM za desno na upperLimitPWM 
                        PWMright++; // povečamo vrednost PWM za DESNO rotacijo za 1
                    }
                    valuePWMright = PWMright;
                    
                    board.analogWrite(9, valuePWM);
                    board.analogWrite(10, valuePWMright);
                }
            //}
        }
    
    
    }
    
    
    // *************************************************************************
    // Del algoritma za SpinLEFT
    // *************************************************************************
    
    if (zelenaVrednostSpinDesno == 0 && STARTctrlSpinL == 1) { // le v primeru, da želene vrednosti v smeri SpinDesno nismo podali izvedemo algoritem za SpinLevo
    
        if (frequencyLeft < zelenaVrednostSpinLevo || frequencyRight < zelenaVrednostSpinLevo) { // upoštevati moramo oba enkoderja, saj se lahko enkrat vrti le levi, drugič pa le desni
            
            if (PWMleft < upperLimitPWM) { // omejimo najvišjo vrednost PWM za naprej na upperLimitPWM 
            
                PWMleft++; // povečamo vrednost PWM za 1
            }
                valuePWM = PWMleft;
                board.analogWrite(9, valuePWM);
        
                if (frequencyLeft > frequencyRight) { // korekcija če je razlika v hitrosti vrtenja levega in desnega kolesa
                    
                    if (PWMfw < upperLimitPWM) { // omejimo najvišjo vrednost PWM za levo na upperLimitPWM 
                        PWMfw++; // povečamo vrednost PWM za LEVO rotacijo za 1
                    }
                    valuePWMleft = PWMfw;
                    
                    if (PWMbk > 0) { // omejimo najmanjšo vrednost PWM za desno na 0 
                        PWMbk--; // zmanjšamo vrednost PWM za DESNO rotacijo za 1
                    }
                    valuePWMright = PWMbk;
                    
                    board.analogWrite(5, valuePWMleft);
                    board.analogWrite(6, valuePWMright);
                }
                else if (frequencyLeft < frequencyRight) { // korekcija če je razlika v hitrosti vrtenja levega in desnega kolesa
                    
                    if (PWMfw > 0) { // omejimo najmanjšo vrednost PWM za levo na 0 
                        PWMfw--; // povečamo vrednost PWM za LEVO rotacijo 1
                    }
                    valuePWM = PWMfw;
                    
                    if (PWMbk < upperLimitPWM) { // omejimo najvišjo vrednost PWM za desno na upperLimitPWM 
                        PWMbk++; // povečamo vrednost PWM za DESNO rotacijo za 1
                    }
                    valuePWMright = PWMbk;
                    
                    board.analogWrite(5, valuePWM);
                    board.analogWrite(6, valuePWMright);
                }
            //}
        }
        else if (frequencyLeft > zelenaVrednostSpinLevo || frequencyRight > zelenaVrednostSpinLevo) {
            
            if (PWMleft > 0) { // omejimo najnižjo vrednost PWM za NAPREJ na 0 - DA NE GREMO V - (divja rotacia!) 
            
                PWMleft--; // zmanjšamo vrednost PWM za 1
            }
                valuePWM = PWMleft;
                board.analogWrite(9, valuePWM);

                if (frequencyLeft > frequencyRight) {
                   
                    if (PWMfw < upperLimitPWM) { // omejimo najvišjo vrednost PWM za levo na upperLimitPWM 
                        PWMfw++; // povečamo vrednost PWM za LEVO rotacijo za 1
                    }
                    valuePWMleft = PWMfw;
                    
                    if (PWMbk > 0) { // omejimo najmanjšo vrednost PWM za desno na 0 
                        PWMbk--; // zmanjšamo vrednost PWM za DESNO rotacijo za 1
                    }
                    valuePWMright = PWMbk;
                    
                    board.analogWrite(5, valuePWMleft);
                    board.analogWrite(6, valuePWMright);
                }
                else if (frequencyLeft < frequencyRight) {
                   
                    if (PWMfw > 0) { // omejimo najmanjšo vrednost PWM za levo na 0 
                        PWMfw--; // povečamo vrednost PWM za LEVO rotacijo 1
                    }
                    valuePWM = PWMfw;
                    
                    if (PWMbk < upperLimitPWM) { // omejimo najvišjo vrednost PWM za desno na upperLimitPWM
                        PWMbk++; // povečamo vrednost PWM za DESNO rotacijo za 1
                    }
                    valuePWMright = PWMright;
                    
                    board.analogWrite(5, valuePWM);
                    board.analogWrite(6, valuePWMright);
                }
            //}

        }
    }
    
    // *****************************************************************************
    // Del algoritma za SpinRIGHT
    // *****************************************************************************
    
    else if (zelenaVrednostSpinLevo == 0 && STARTctrlSpinR == 1) { // le v primeru, da želene vrednosti v smeri SpinLevo nismo podali izvedemo algoritem za SpinDesno
    
        if (frequencyLeft < zelenaVrednostSpinDesno || frequencyRight < zelenaVrednostSpinDesno) { // upoštevati moramo oba enkoderja, saj se lahko enkrat vrti le levi, drugič pa le desni
            
            if (PWMright < upperLimitPWM) { // omejimo najvišjo vrednost za desno na upperLimitPWM 
        
                PWMright++; // povečamo vrednost PWM nazaj za 1
            }
                valuePWM = PWMright;
                board.analogWrite(10, valuePWM);
        
                if (frequencyLeft < frequencyRight) {
                    
                    if (PWMfw < upperLimitPWM) { // omejimo najvišjo vrednost PWM za levo na upperLimitPWM 
                        PWMfw++; // povečamo vrednost PWM za LEVO rotacijo za 1
                    }
                    valuePWMleft = PWMfw;
                    
                    if (PWMbk > 0) { // omejimo najmanjšo vrednost PWM za desno na 0 
                        PWMbk--; // zmanjšamo vrednost PWM za DESNO rotacijo za 1
                    }
                    valuePWMright = PWMbk;
                    
                    board.analogWrite(5, valuePWMleft);
                    board.analogWrite(6, valuePWMright);
                }
                else if (frequencyLeft > frequencyRight) {
                    
                    if (PWMfw > 0) { // omejimo najmanjšo vrednost PWM za levo na 0 
                        PWMfw--; // povečamo vrednost PWM za LEVO rotacijo 1
                    }
                    valuePWM = PWMfw;
                    
                    if (PWMbk < upperLimitPWM) { // omejimo najvišjo vrednost PWM za desno na upperLimitPWM 
                        PWMbk++; // povečamo vrednost PWM za DESNO rotacijo za 1
                    }
                    valuePWMright = PWMbk;
                    
                    board.analogWrite(5, valuePWM);
                    board.analogWrite(6, valuePWMright);
                }
            //}
        
        }
        else if (frequencyLeft > zelenaVrednostSpinDesno || frequencyRight > zelenaVrednostSpinDesno) {
            
            if (PWMright > 0) { // omejimo najnižjo vrednost za NAZAJ na 0 - DA NE GREMO V - (divja rotacia!) 

                PWMright--; // zmanjšamo vrednost PWM nazaj za 1
            }
                valuePWM = PWMright;
                board.analogWrite(10, valuePWM);

                if (frequencyLeft < frequencyRight) {
                    
                    if (PWMfw < upperLimitPWM) { // omejimo najvišjo vrednost PWM za levo na upperLimitPWM 
                        PWMfw++; // povečamo vrednost PWM za LEVO rotacijo za 1
                    }
                    valuePWMleft = PWMfw;
                    
                    if (PWMbk > 0) { // omejimo najmanjšo vrednost PWM za desno na 0 
                        PWMbk--; // zmanjšamo vrednost PWM za DESNO rotacijo za 1
                    }
                    valuePWMright = PWMbk;
                    
                    board.analogWrite(5, valuePWMleft);
                    board.analogWrite(6, valuePWMright);
                }
                else if (frequencyLeft > frequencyRight) {
                    
                    if (PWMfw > 0) { // omejimo najmanjšo vrednost PWM za levo na 0 
                        PWMfw--; // povečamo vrednost PWM za LEVO rotacijo 1
                    }
                    valuePWM = PWMfw;
                    
                    if (PWMbk < upperLimitPWM) { // omejimo najvišjo vrednost PWM za desno na upperLimitPWM 
                        PWMbk++; // povečamo vrednost PWM za DESNO rotacijo za 1
                    }
                    valuePWMright = PWMbk;
                    
                    board.analogWrite(5, valuePWM);
                    board.analogWrite(6, valuePWMright);
                }
            //}
        }
    
    
    }
    
    // *************************************************************************
    // Del algoritma za Hz naprej
    // *************************************************************************
    
    if (STARTctrlHzLRfw == 1) { // če je zastavica 1 izvedemo ta del algoritma
        
                if (frequencyLeft > zelenaVrednostHzLevo) { // korekcija če je razlika v hitrosti vrtenja levega in desnega kolesa
                    
                    if (PWMleft < upperLimitPWM) { // omejimo najvišjo vrednost PWM za levo na upperLimitPWM 
                        PWMleft++; // povečamo vrednost PWM za LEVO rotacijo za 1
                    }
                    valuePWMleft = PWMleft;
                    
                    if (PWMright > 0) { // omejimo najmanjšo vrednost PWM za desno na 0 
                        PWMright--; // zmanjšamo vrednost PWM za DESNO rotacijo za 1
                    }
                    valuePWMright = PWMright;
                    
                    if (frequencyRight < zelenaVrednostHzDesno) { // upoštevati moramo oba enkoderja, saj se lahko enkrat vrti le levi, drugič pa le desni
                        if (PWMfw < upperLimitPWM) { // omejimo najvišjo vrednost PWM za naprej na upperLimitPWM 
                            PWMfw++; // povečamo vrednost PWM za 1
                        }
                    }            
                    else if (PWMfw > 0) { // omejimo najnižjo vrednost PWM za NAPREJ na 0 - DA NE GREMO V - (divja rotacia!) 
                        PWMfw--; // zmanjšamo vrednost PWM za 1
                    }
     
                }

                else if (frequencyLeft < zelenaVrednostHzLevo) { // korekcija če je razlika v hitrosti vrtenja levega in desnega kolesa
                    
                    if (PWMleft > 0) { // omejimo najmanjšo vrednost PWM za levo na 0 
                        PWMleft--; // povečamo vrednost PWM za LEVO rotacijo 1
                    }
                    valuePWMleft = PWMleft;
                    
                    if (PWMright < upperLimitPWM) { // omejimo najvišjo vrednost PWM za desno na upperLimitPWM 
                        PWMright++; // povečamo vrednost PWM za DESNO rotacijo za 1
                    }
                    valuePWMright = PWMright;
            
                    if (frequencyRight > zelenaVrednostHzDesno) {
                        if (PWMfw > 0) { // omejimo najnižjo vrednost PWM za NAPREJ na 0 - DA NE GREMO V - (divja rotacia!) 
                            PWMfw--; // zmanjšamo vrednost PWM za 1
                        }
                    }
                    else if (PWMfw < upperLimitPWM) { // omejimo najvišjo vrednost PWM za naprej na upperLimitPWM 
                        PWMfw++; // povečamo vrednost PWM za 1
                    }

                }
        
                else if (frequencyRight < zelenaVrednostHzDesno) { // upoštevati moramo oba enkoderja, saj se lahko enkrat vrti le levi, drugič pa le desni
                        
                    if (PWMleft < upperLimitPWM) { // omejimo najvišjo vrednost PWM za levo na upperLimitPWM 
                        PWMleft++; // povečamo vrednost PWM za LEVO rotacijo za 1
                    }
                    valuePWMleft = PWMleft;
                    
                    if (PWMright > 0) { // omejimo najmanjšo vrednost PWM za desno na 0 
                        PWMright--; // zmanjšamo vrednost PWM za DESNO rotacijo za 1
                    }
                    valuePWMright = PWMright;

                }
                
                else if (frequencyRight > zelenaVrednostHzDesno) {

                    if (PWMleft > 0) { // omejimo najmanjšo vrednost PWM za levo na 0 
                        PWMleft--; // povečamo vrednost PWM za LEVO rotacijo 1
                    }
                    valuePWMleft = PWMleft;
                    
                    if (PWMright < upperLimitPWM) { // omejimo najvišjo vrednost PWM za desno na upperLimitPWM 
                        PWMright++; // povečamo vrednost PWM za DESNO rotacijo za 1
                    }
                    valuePWMright = PWMright;
            
                }                  

                valuePWM = PWMfw;
                board.analogWrite(5, valuePWM); 
        
                board.analogWrite(9, valuePWMleft);
                board.analogWrite(10, valuePWMright);
    
    }
    
    
    // *****************************************************************************
    // Del algoritma za Hz nazaj
    // *****************************************************************************
    
    else if (STARTctrlHzLRbk == 1) {// če je zastavica za ta del algoritma 1 ga izvedemo
        
                if (frequencyLeft < zelenaVrednostHzLevo) {
                    
                    if (PWMleft < upperLimitPWM) { // omejimo najvišjo vrednost PWM za levo na upperLimitPWM 
                        PWMleft++; // povečamo vrednost PWM za LEVO rotacijo za 1
                    }
                    valuePWMleft = PWMleft;
                    
                    if (PWMright > 0) { // omejimo najmanjšo vrednost PWM za desno na 0 
                        PWMright--; // zmanjšamo vrednost PWM za DESNO rotacijo za 1
                    }
                    valuePWMright = PWMright;
                    
                    if (frequencyRight > zelenaVrednostHzDesno) {
                        if (PWMbk > 0) { // omejimo najnižjo vrednost za NAZAJ na 0 - DA NE GREMO V - (divja rotacia!) 
                            PWMbk--; // zmanjšamo vrednost PWM nazaj za 1
                        }
                    }
                    else if (PWMbk < upperLimitPWM) { // omejimo najvišjo vrednost za nazaj na upperLimitPWM 
                        PWMbk++; // povečamo vrednost PWM nazaj za 1
                    }
                    
                }
        
                else if (frequencyLeft > zelenaVrednostHzLevo) {
                    
                    if (PWMleft > 0) { // omejimo najmanjšo vrednost PWM za levo na 0 
                        PWMleft--; // povečamo vrednost PWM za LEVO rotacijo 1
                    }
                    valuePWMleft = PWMleft;
                    
                    if (PWMright < upperLimitPWM) { // omejimo najvišjo vrednost PWM za desno na upperLimitPWM 
                        PWMright++; // povečamo vrednost PWM za DESNO rotacijo za 1
                    }
                    valuePWMright = PWMright;
                
                    if (frequencyRight < zelenaVrednostHzDesno) { // upoštevati moramo oba enkoderja, saj se lahko enkrat vrti le levi, drugič pa le desni
                        if (PWMbk < upperLimitPWM) { // omejimo najvišjo vrednost za nazaj na upperLimitPWM 
                            PWMbk++; // povečamo vrednost PWM nazaj za 1
                        }
                    }
                    else if (PWMbk > 0) { // omejimo najnižjo vrednost za NAZAJ na 0 - DA NE GREMO V - (divja rotacia!) 
                        PWMbk--; // zmanjšamo vrednost PWM nazaj za 1
                    }
                }

                else if (frequencyRight > zelenaVrednostHzDesno) {
                    if (PWMleft < upperLimitPWM) { // omejimo najvišjo vrednost PWM za levo na upperLimitPWM 
                        PWMleft++; // povečamo vrednost PWM za LEVO rotacijo za 1
                    }
                    valuePWMleft = PWMleft;
                    
                    if (PWMright > 0) { // omejimo najmanjšo vrednost PWM za desno na 0 
                        PWMright--; // zmanjšamo vrednost PWM za DESNO rotacijo za 1
                    }
                    valuePWMright = PWMright;
                }
        
        
                else if (frequencyRight < zelenaVrednostHzDesno) { // upoštevati moramo oba enkoderja, saj se lahko enkrat vrti le levi, drugič pa le desni

                    if (PWMleft > 0) { // omejimo najmanjšo vrednost PWM za levo na 0 
                        PWMleft--; // povečamo vrednost PWM za LEVO rotacijo 1
                    }
                    valuePWMleft = PWMleft;
                    
                    if (PWMright < upperLimitPWM) { // omejimo najvišjo vrednost PWM za desno na upperLimitPWM 
                        PWMright++; // povečamo vrednost PWM za DESNO rotacijo za 1
                    }
                    valuePWMright = PWMright;
                    
                }
                    
                valuePWM = PWMbk;
                board.analogWrite(6, valuePWM);
        
                board.analogWrite(9, valuePWMleft);
                board.analogWrite(10, valuePWMright);
        
    }
    
    
    // **************************************************************************************
    // Kontrolni algoritem KONEC
    // **************************************************************************************       
 
    if (refreshClientGui == 1) {
    socket.emit("refreshClientGUInumValues", {
            "zelenaVrednostNaprej": zelenaVrednostNaprej,
            "zelenaVrednostNazaj": zelenaVrednostNazaj,
            "zelenaVrednostSpinLevo": zelenaVrednostSpinLevo, 
            "zelenaVrednostSpinDesno": zelenaVrednostSpinDesno,
            "zelenaVrednostHzLevo": zelenaVrednostHzLevo, 
            "zelenaVrednostHzDesno": zelenaVrednostHzDesno,
            "PWMfw": PWMfw,
            "PWMbk": PWMbk,
            "PWMleft": PWMleft,
            "PWMright": PWMright,
    });
    }
    
}
    
var frequencyMeasureLeftRightTimer=setInterval(function(){frequencyMeasureLeftRight()}, refreshFrequency);        
    
});
