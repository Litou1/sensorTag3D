//#!/usr/bin/node
// Extended example from https://github.com/mrdoob/three.js/
// http://www.aerotwist.com/tutorials/getting-started-with-three-js/
//
// sensorTag 3D rotation demo 
var socket,
    firstconnect = true,
    // ainNum = ["P9_36", "P9_38"], // Pot and ultrasound
    updateInterval = 50, // In ms
    ainValue = [];
var camera, scene, renderer;
var geometry, material,
    ball, cube, torus;

// var axisX, axisY, axisZ;

var Gx = 0,
    Gy = 0,
    Gz = 0;
    period = 10; //10ms animation function
    omega = [0, 0, 0];
    lastOmega = [0, 0, 0];
var Ax = 0,
    Ay = 0,
    Az = 0;
var accX = 0;
    accY = 0;
    accZ = 0;
var ts = 100; // 100ms sampling rate
    T = 750; // .75 sec
    alpha = T / (ts + T);
    // alpha = 0.95;
var filteredAngle = [0, 0, 0]; // filtered angle array
    lastFilteredAngle = [0, 0, 0];
    accAngle = [0, 0, 0];
var WIDTH = 800,
    HEIGHT = 600;
var ENABLED_ACC = 1;
var ENABLED_ACC_Y = 0;

init();
animate();
connect();

function connect() {
    if (firstconnect) {
        socket = io.connect(null);

        socket.on('message', function(data) {
            status_update("Received: message " + data);
        });
        socket.on('connect', function() {
            status_update("Connected to Server");
        });
        socket.on('disconnect', function() {
            status_update("Disconnected from Server");
        });
        socket.on('reconnect', function() {
            status_update("Reconnected to Server");
        });
        socket.on('reconnecting', function(nextRetry) {
            status_update("Reconnecting in " + nextRetry / 1000 + " s");
        });
        socket.on('reconnect_failed', function() {
            status_update("Reconnect Failed");
        });

        socket.on('gyroIn', gyroIn);
        socket.on('accIn', accIn);

        firstconnect = false;
    } 

}

function status_update(txt) {
    document.getElementById('status').innerHTML = txt;
}

// When new data arrives, convert it 
function gyroIn(data) {

    Gx = data.Gx / 180 * Math.PI;
    Gy = data.Gy / 180 * Math.PI;
    Gz = data.Gz / 180 * Math.PI;
    omega = [Gx, Gy, Gz];

}

function accIn(data) {

    Az = data.Az; // downward in -Z direction
    Ax = -data.Ax;
    Ay = -data.Ay;

    // change accelerometer measurements to pitch and roll
    accY = Math.atan2(-Ax, Az);
    accX = Math.atan2(Ay, Math.sqrt(Ax * Ax + Az * Az));
    accZ = 0;  // can't sense rotation around Z since Z is aligned with g

    accAngle = [accX, accY, accZ];
    console.log('\tAx = ' + Ax + '\t, Ay = ' + Ay + '\t, Az = ' + Az);
    console.log('\tPitch= ' + accAngle[0]/Math.PI*180+'\tRoll= ' + accAngle[1]/Math.PI*180)

}


function init() {
    // set the scene size
    var WIDTH = 800,
        HEIGHT = 600;

    // set some camera attributes
    var VIEW_ANGLE = 15,
        ASPECT = WIDTH / HEIGHT,
        NEAR = 0.1,
        FAR = 10000;

    scene = new THREE.Scene();

    var faceColors = [0xCC0000, 0x33FFFF, 0x996600, 0x000033, 0xFFFF99, 0x9999FF];

    geometry = new THREE.CubeGeometry(100, 200, 50);
    for (var i = 0; i < geometry.faces.length; i += 2) {
        /*
                var hex = Math.random() * 0xffffff;
                geometry.faces[ i ].color.setHex( hex );
                geometry.faces[ i + 1 ].color.setHex( hex );
        //        console.log("i=" + i);
        */
        geometry.faces[i].color.setHex(faceColors[i / 2]);
        geometry.faces[i + 1].color.setHex(faceColors[i / 2]);
    }
    //    console.log(geometry);
    material = new THREE.MeshBasicMaterial({
        //        color: 0xff0000,
        //        wireframeLinewidth: 10,
        vertexColors: THREE.FaceColors,
        overdraw: true
            //        wireframe: true
    });


    // // rotation axis
    // axisX = new THREE.Vector3(1, 0, 0);
    // axisY = new THREE.Vector3(0, 1, 0);
    // axisZ = new THREE.Vector3(0, 0, 1);
    cube = new THREE.Mesh(geometry, material);

    scene.add(cube);
    // console.log(cube);
    /*
        var loader = new THREE.TextureLoader();
        loader.load( 'beagle-hd-logo.gif', function ( texture ) {

            var geometry = new THREE.SphereGeometry( 100, 200, 100 );

            var material = new THREE.MeshBasicMaterial( { map: texture, overdraw: true } );
            var boris = new THREE.Mesh( geometry, material );
            boris.position.x = -200;
            boris.rotation.y = Math.PI/3;
            scene.add( boris );
            console.log( boris );
        } );
    */
    geometry = new THREE.SphereGeometry(100, 32, 32);
    material = new THREE.MeshBasicMaterial({
        color: 0x0000ff,
        wireframe: true
    });

    ball = new THREE.Mesh(geometry, material);
    ball.position.x = -200;
    //    scene.add(ball);

    geometry = new THREE.TorusGeometry(100, 40, 32, 16);
    material = new THREE.MeshBasicMaterial({
        color: 0x00ff00,
        wireframe: false
    });

    torus = new THREE.Mesh(geometry, material);
    torus.position.x = 200;
    //    scene.add(torus);

    camera = new THREE.PerspectiveCamera(VIEW_ANGLE, ASPECT, NEAR, FAR);
    camera.position.z = 2000;
    // camera.position.x = -500;
    // camera.position.y = 500;
    camera.lookAt(scene.position);

    scene.add(camera);

    renderer = new THREE.CanvasRenderer();
    // renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    //    renderer.setSize(WIDTH, HEIGHT);

    // get the DOM element to attach to
    // - assume we've got jQuery to hand
    var $container = $('#container');
    // attach the render-supplied DOM element
    $container.append(renderer.domElement);

    //    document.body.appendChild(renderer.domElement);

}

function animate() {


    requestAnimationFrame(animate);

    // check to see if omega got updated

    var is_same_omega = omega.length == lastOmega.length && omega.every(function(element, index) {
        return element === lastOmega[index];
    });

    if (!is_same_omega) {

        //         var d = new Date();
        // console.log(d.getMilliseconds());

        for (var i = 0; i < 3; i++) {
            // complementary filter
            filteredAngle[i] = alpha * (filteredAngle[i] + omega[i] * ts / 1000) + (1 - alpha) * accAngle[i];

        }
        // cube.rotateOnAxis(axisX, filteredAngle[0] - lastFilteredAngle[0]);
        // cube.rotateOnAxis(axisY, filteredAngle[1] - lastFilteredAngle[1]);
        // cube.rotateOnAxis(axisZ, filteredAngle[2] - lastFilteredAngle[2]);


        // console.log('\tgyro angle = '+omega[1]);
        // console.log('\tacc angle = '+accAngle[0]);

        // update mesasured filtered angle
        // for (var i = 0; i < 3; i++) {
        //     lastFilteredAngle[i] = filteredAngle[i];
        //     // console.log(lastFilteredAngle[i]);
        // }


        // set Euler rotation order
        cube.rotation.order = "YXZ";
        cube.rotation.x = filteredAngle[0];
        cube.rotation.y = filteredAngle[1];
        cube.rotation.z = filteredAngle[2];
        renderer.render(scene, camera);
    }
    lastOmega = omega;

}