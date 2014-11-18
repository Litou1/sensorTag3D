#!/usr/bin/node

var util = require('util');
var debug = require('debug')('test_gyro');
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
            console.log('readDeviceName');
            sensorTag.readDeviceName(function(deviceName) {
                console.log('\tdevice name = ' + deviceName);
                callback();
            });
        },
        function(callback) {
            console.log('readSystemId');
            sensorTag.readSystemId(function(systemId) {
                console.log('\tsystem id = ' + systemId);
                callback();
            });
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
                sensorTag.setGyroscopePeriod(100, function() {
                    callback();
                });
            });
        },
        function(callback) {
            setTimeout(callback, 1000);
        },
        function(callback) {
            sensorTag.on('gyroscopeChange', function(x, y, z) {
                debug('\tx = %d °/s - y = %d °/s - z = %d °/s', x.toFixed(1), y.toFixed(1), z.toFixed(1));
            });
            sensorTag.notifyGyroscope(function() {
                callback();
            });
        },
        function(callback) {
            setTimeout(callback, 100000);
            // delay 100 sec 
        },
        function(callback) {
            sensorTag.disableGyroscope(function() {
                console.log('Gyroscope disabled');
                setTimeout(callback, 1000);
            });
        },
        function(callback) {
            sensorTag.unnotifyGyroscope(function() {
                callback();
            });
        },

        function(callback) {
            sensorTag.disconnect(function() {
                console.log('sensor tag disconnected');
                callback();
            });
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