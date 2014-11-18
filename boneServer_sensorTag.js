#!/usr/bin/node
 // From Getting Started With node.js and socket.io 
// http://codehenge.net/blog/2011/12/getting-started-with-node-js-and-socket-io-v0-7-part-2/
// This is a general server for the various web frontends
// buttonBox, ioPlot, realtimeDemo
"use strict";

var port = 9090, // Port to listen on
    http = require('http'),
    url = require('url'),
    fs = require('fs'),
    b = require('bonescript'),
    child_process = require('child_process'),
    server,
    connectCount = 0, // Number of connections to server
    errCount = 0; // Counts the AIN errors.

function send404(res) {
    res.writeHead(404);
    res.write('404');
    res.end();
}


server = http.createServer(function(req, res) {
    // server code
    var path = url.parse(req.url).pathname;
    console.log("path: " + path);
    if (path === '/') {
        path = '/boneServer.html';
    }

    fs.readFile(__dirname + path, function(err, data) {
        if (err) {
            return send404(res);
        }
        //            console.log("path2: " + path);
        res.write(data, 'utf8');
        res.end();
    });
});

server.listen(port);
console.log("Listening on " + port);

// socket.io, I choose you
var io = require('socket.io').listen(server);
io.set('log level', 2);

// See https://github.com/LearnBoost/socket.io/wiki/Exposed-events
// for Exposed events

// on a 'connection' event
io.sockets.on('connection', function(socket) {

    console.log("Connection " + socket.id + " accepted.");
    //    console.log("socket: " + socket);

    // now that we have our connected 'socket' object, we can 
    // define its event handlers

    // Send value every time a 'message' is received.

    sensorInit(socket)

    connectCount++;
    console.log("connectCount = " + connectCount);
});

function sensorInit(socket) {
    var util = require('util');
    var async = require('async');
    var SensorTag = require('./index');

    console.log('starting test_gyro');
    SensorTag.discover(function(sensorTag) {
        sensorTag.on('disconnect', function() {
            console.log('disconnected!');
        });

        sensorTag.on('connectionDrop', function() {
            console.log('connection drop! - reconnect');
            sensorTag.reconnect();
        });

        sensorTag.on('reconnect', function() {
            console.log('successfully reconnected!');
        });


        async.series([
            function(callback) {
                console.log('connect');
                sensorTag.connect(callback);
            },
            function(callback) {
                console.log('discoverServicesAndCharacteristics');
                sensorTag.discoverServicesAndCharacteristics(callback);
            },
            function(callback) {
                console.log('readFirmwareRevision');
                sensorTag.readFirmwareRevision(function(firmwareRevision) {
                    console.log('\tfirmware revision = ' + firmwareRevision);
                    callback();
                });
            },

            function(callback) {
                console.log('enableGyroscope');
                sensorTag.enableGyroscope(function() {
                    //1000 corresponds to 100ms
                    sensorTag.setGyroscopePeriod(10, function() {
                        callback();
                    });
                });
            },

            function(callback) {
                console.log('enableAccelerometer');
                sensorTag.enableAccelerometer(function() {

                    sensorTag.setAccelerometerPeriod(10, function() {
                        callback();
                    });
                });
            },
            function(callback) {
                setTimeout(callback, 1000);
            },


            function(callback) {
                async.parallel([
                    function(callback) {
                        sensorTag.on('gyroscopeChange', function(x, y, z) {
                            // console.log('\tx = %d °/s - y = %d °/s - z = %d °/s', x.toFixed(1), y.toFixed(1), z.toFixed(1));
                            socket.emit('gyroIn', {
                                Gx: y,
                                Gy: x,
                                Gz: z
                            });
                        });
                        sensorTag.notifyGyroscope(function() {
                            callback();
                        });
                    },

                    function(callback) {
                        sensorTag.on('accelerometerChange', function(x, y, z) {
                            // console.log('\tx = %d G - y = %d G - z = %d G', x.toFixed(1), y.toFixed(1), z.toFixed(1));
                            socket.emit('accIn', {
                                Ax: x,
                                Ay: y,
                                Az: z
                            });
                        });
                        sensorTag.notifyAccelerometer(function() {
                            callback();
                        });
                    }
                ], function(err) { //This function gets called after the two tasks have called their "task callbacks"
                    if (err) {
                        console.log('test failed error : ' + err);
                        // process.exit(1);
                    }
                    console.log('test of gyro completed');
                    // process.exit(0);
                });
            },

            function(callback) {
                setTimeout(callback, 100000);
                // delay 100 sec 
            },
        ], function(err) { //This function gets called after the two tasks have called their "task callbacks"
            if (err) {
                console.log('test failed error : ' + err);
                process.exit(1);
            }
            console.log('test of gyro SUCCESSFUL');
            process.exit(0);
        });

      
    });
}