var http = require("http").createServer(handler) // tu je pomemben argument "handler", ki je kasneje uporabljen -> "function handler (req, res); v tej vrstici kreiramo server! (http predstavlja napo aplikacijo - app)
  , io  = require("socket.io").listen(http)
  , fs  = require("fs");

function handler (req, res) { // handler za "response"; ta handler "handla" le datoteko index.html
    fs.readFile(__dirname + "/pwmbutton_14.html",
    function (err, data) {
        if (err) {
            res.writeHead(500, {'Content-Type': 'text/plain'});
            return res.end("Napaka pri nalaganju datoteke pwmbutton_01.html");
        }
    res.writeHead(200);
    res.end(data);
    });
}

http.listen(8080); // določimo na katerih vratih bomo poslušali | vrata 80 sicer uporablja LAMP | lahko določimo na "router-ju" (http je glavna spremenljivka, t.j. aplikacija oz. app)

var firmata = require("firmata");

console.log("Zagon sistema"); // na konzolo zapišemo sporočilo (v terminal)

var board = new firmata.Board("/dev/ttyACM0",function(){
    console.log("Priključitev na Arduino");
    console.log("Firmware: " + board.firmware.name + "-" + board.firmware.version.major + "." + board.firmware.version.minor); // izpišemo verzijo Firmware
    console.log("Omogočimo pine");
	board.pinMode(13, board.MODES.OUTPUT);
    board.pinMode(12, board.MODES.INPUT);
    board.pinMode(3, board.MODES.OUTPUT);
    board.pinMode(5, board.MODES.PWM);
    board.pinMode(6, board.MODES.PWM);
    board.pinMode(9, board.MODES.PWM);
    board.pinMode(10, board.MODES.PWM);    
});


// var timePrevious = Date.now();

function countValuesAndChopArrayLeft (timesArrayLeft, timeValue) {
// function counts the values in the timesArrayLeft that are less or equal to timeValue and chops them out
// function returns chopped array and number of occurences
// timesArrayLeft must be defined as global variable not to lose time in between    

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

io.sockets.on("connection", function(socket) {  // od oklepaja ( dalje imamo argument funkcije on -> ob 'connection' se prenese argument t.j. funkcija(socket) 
                                                // ko nekdo pokliče IP preko "browser-ja" ("browser" pošlje nekaj node.js-u) se vzpostavi povezava = "connection" oz.
                                                // je to povezava = "connection" oz. to smatramo kot "connection"
                                                // v tem primeru torej želi client nekaj poslati (ko nekdo z browserjem dostopi na naš ip in port)
                                                // ko imamo povezavo moramo torej izvesti funkcijo: function (socket)
                                                // pri tem so argument podatki "socket-a" t.j. argument = socket
                                                // ustvari se socket_id
    var timePrevious = Date.now(); // inicializiramo čas ob povezavi klienta
    var leftCount = 0;
    var rightCount = 0;
    var timesArrayLeft = new Array();
    var timesArrayLeft = []; // ob povezavi klienta matriko brišemo
    var secondLeftRightFlag = 0; // zastavica, da vemo, da sta iz enkoderja prišli vsaj dve vrednosti    
    
    
    
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
        else if (data.stevilkaUkaza == "2") { // če je številka ukaza, ki smo jo dobili iz klienta enaka 0
            if (data.valuePWM != 0) { // če PWM vrednost ni 0 vklopimo rele
                board.digitalWrite(3, board.HIGH); // na pinu 3 zapišemo vrednost HIGH
                board.digitalWrite(13, board.HIGH); // na pinu 3 zapišemo vrednost HIGH
            }
            else { // če je PWM vrednost enaka 0 izklopimo rele
                board.digitalWrite(3, board.LOW); // na pinu 3 zapišemo vrednost LOW
            }
            board.analogWrite(data.pinNo, data.valuePWM); // tretji argument je lahko tudi callback - za funkcijo, ki jo kličemo po izvedbi
            console.log("pinNO=" + data.pinNo + " | " + "valuePWM = " + data.valuePWM);
            socket.emit("sporociloKlientu", "PWM Custom."); // izvedemo to funkcijo = "sporociloKlientu" na klientu, z argumentom, t.j. podatki="LED ugasnjena."
        }
        
        else if (data.stevilkaUkaza == "3") { // če je številka ukaza, ki smo jo dobili iz klienta enaka 0
            if (data.valuePWM != 0) { // če PWM vrednost ni 0 vklopimo rele
                board.digitalWrite(3, board.HIGH); // na pinu 3 zapišemo vrednost HIGH
            }
            else { // če je PWM vrednost enaka 0 izklopimo rele
                board.digitalWrite(3, board.LOW); // na pinu 3 zapišemo vrednost LOW
                board.digitalWrite(13, board.LOW); // na pinu 3 zapišemo vrednost LOW
            }
            board.analogWrite(data.pinNo, data.valuePWM); // tretji argument je lahko tudi callback - za funkcijo, ki jo kličemo po izvedbi
            console.log("pinNO=" + data.pinNo + " | " + "valuePWM = " + data.valuePWM);
            socket.emit("sporociloKlientu", "PWM Custom."); // izvedemo to funkcijo = "sporociloKlientu" na klientu, z argumentom, t.j. podatki="LED ugasnjena."
        }        
        
	});
    
/*    
function test() {
    //console.log("hello");
    setInterval(function() {
    // Do something every 100ms
    //pinCallback will be called when data arrives from server
    board.digitalRead(12,pinCallback);
    }, 100);
}

    
function pinCallback(value) {
    socket.emit("klientBeri", value);
} 

test();

*/
    
    // digital read LEFT: {"stevilkaUkaza": stevilkaUkaza, "pinNo": pinNo, "valuePWM": valuePWM}
    //setInterval(function() {

    //var now;
    //var then = Date.now();
    
    //board.digitalRead(12, function(value)}; // slepo branje, da preberemo morebitno prvo enko - ta bi nam delala preglavice pri štetju "tickov" na začetku, saj se kolo ne bi vrtelo, dobili pa bi 1 tick, čeprav kolo miruje
    
    //setTimeout(function(){
    
    board.digitalRead(12, function(value) { // funkcija se aktivira le, kadar se spremeni stanje; sicer bi bilo 1M čitanj na sekundo
        if (secondLeftRightFlag < 1) { // ta del rabimo, da se ne zgodi, da nam ob vklopu, ko kolesa mirujejo digitalRead prebere 1 - kolo sicer miruje (enko vedno prebre) in bi nato narobe preračunali frekvenco 1/0.5=2 V resnici kolo miruje. Prvi preračun lahko naredimo le, ko se pojavi naslednja vrednost
            secondLeftRightFlag++;
        }
        else
        {
        timesArrayLeft.push(Date.now());
        socket.emit("klientBeri1", {"vrednost": value, "cas": timesArrayLeft[timesArrayLeft.length - 1]});
        }
        
        socket.emit("sporociloKlientu", "Flag->" + secondLeftRightFlag);
        
    });
    //},1);
    
//}, 500); // digitalno branje poženemo šele čez pol sekunde zaradi pr        
        
    //analog read RIGHT:
    board.analogRead(2, function(value) {
        socket.emit("klientBeri2", value);
    });
    
    
    
function frequencyMeasureLeft() {
    
//    timerObject = setTimeout(loop, 500);
    timeNext = Date.now();
    numberOfCounts = countValuesAndChopArrayLeft(timesArrayLeft, timeNext); // number of counts up to current time within last second
    timeInterval = timeNext - timePrevious;
    timePrevious = timeNext;
    frequency = numberOfCounts/(timeInterval/1000);
    
    socket.emit("sporociloKlientu", "No->" + numberOfCounts);
    socket.emit("sporociloKlientu", "Time interval->" + timeInterval + "Freq->" + frequency);
    
    socket.emit("readOutFrequencyLeft", {"stevilo": numberOfCounts, "frekvenca": frequency});
    
}    
    
var frequencyMeasureLeftTimer=setInterval(function(){frequencyMeasureLeft()}, 500);
    
});
