if ( ! Detector.webgl ) {
    Detector.addGetWebGLMessage();
    document.getElementById( 'container' ).innerHTML = "";
}

var idv = idv || {};
idv.vr = idv.vr || function(){
        this.container = document.getElementById( 'container' );
        this.worldWidth = 256;
        this.worldDepth = 256;

        // position
        var VIEW_ANGLE = 60,
            ASPECT = window.innerWidth / window.innerHeight,
            NEAR = 1,
            FAR = 20000;
        this.camera = new THREE.PerspectiveCamera(VIEW_ANGLE, ASPECT, NEAR, FAR);

        this.controls = new THREE.FirstPersonControls( camera );
        this.controls.movementSpeed = 1000;
        this.controls.lookSpeed = 0.1;

        this.scene = new THREE.Scene();
        this.renderer = null;
        this.worldHalfWidth = this.worldWidth / 2;
        this.worldHalfDepth = this.worldDepth / 2;
        this.clock = new THREE.Clock();

        this.mesh = null;

        return this;
}();

idv.vr.getTexture = function () {
  return this.texture;
};

idv.vr.getMesh = function () {
    return this.mesh;
};

idv.vr.getWorldWidth = function () {
  return this.worldWidth;
};

idv.vr.getWorldDepth = function () {
    return this.worldDepth;
};

idv.vr.onWindowResize = function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );

    controls.handleResize();
};


idv.vr.render = function () {
    controls.update( clock.getDelta() );
    renderer.render( scene, camera );
};

idv.vr.animate = function() {
    requestAnimationFrame(idv.vr.animate);
    this.render();
    this.stats.update();
};

idv.vr.generateHeight = function (width, height) {
    var size = width * height,
        data = new Uint8Array( size ),
        perlin = new ImprovedNoise(),
        quality = 1,
        z = Math.random() * 100
        ;

    for ( var j = 0; j < 4; j ++ ) {
        for ( var i = 0; i < size; i ++ ) {
            var x = i % width, y = ~~ ( i / width );
            data[ i ] += Math.abs( perlin.noise( x / quality, y / quality, z ) * quality * 1.75 );
        }
        quality *= 5;
    }

    return data;
};

idv.vr.attachStats = function () {
    this.stats = new Stats();
    container.appendChild( stats.dom );
};


idv.vr.createContourMesh = function (width, height, material, data2D) {
    var geometry = new THREE.PlaneBufferGeometry( 7500, 7500, worldWidth - 1, worldDepth - 1 );
    geometry.rotateX( - Math.PI / 2 );

    var generateHeight = function ( width, height ) {
        var size = width * height,
            data = new Uint8Array( size ),
            perlin = new ImprovedNoise(), quality = 1, z = Math.random() * 100;
        var x, y;
        for ( var j = 0; j < 4; j ++ ) {
            for ( var i = 0; i < size; i ++ ) {
                x = i % width;
                y = ~~ ( i / width );
                data[ i ] += Math.abs( perlin.noise( x / quality, y / quality, z ) * quality * 1.75 );
            }
            quality *= 5;
        }

        return data;
    };

    var data = generateHeight( worldWidth, worldDepth );

    var vertices = geometry.attributes.position.array;
    for ( var i = 0, j = 0, l = vertices.length; i < l; i ++, j += 3 ) {
        vertices[ j + 1 ] = data[ i ] * 10;
    }

    return new THREE.Mesh( geometry, material );

};

idv.vr.createTexture = function (data2D) {
    var generateTexture = function ( data, width, height ) {
        var canvas, canvasScaled, context, image, imageData,
            level, diff, vector3, sun, shade;
        vector3 = new THREE.Vector3( 0, 0, 0 );
        sun = new THREE.Vector3( 1, 1, 1 );
        sun.normalize();
        canvas = document.createElement( 'canvas' );
        canvas.width = width;
        canvas.height = height;
        context = canvas.getContext( '2d' );
        context.fillStyle = '#000';
        context.fillRect( 0, 0, width, height );
        image = context.getImageData( 0, 0, canvas.width, canvas.height );
        imageData = image.data;
        for ( var i = 0, j = 0, l = imageData.length; i < l; i += 4, j ++ ) {
            vector3.x = data[ j - 2 ] - data[ j + 2 ];
            vector3.y = 2;
            vector3.z = data[ j - width * 2 ] - data[ j + width * 2 ];
            vector3.normalize();
            shade = vector3.dot( sun );
            imageData[ i ] = ( 96 + shade * 128 ) * ( 0.5 + data[ j ] * 0.007 );
            imageData[ i + 1 ] = ( 32 + shade * 96 ) * ( 0.5 + data[ j ] * 0.007 );
            imageData[ i + 2 ] = ( shade * 96 ) * ( 0.5 + data[ j ] * 0.007 );
        }
        context.putImageData( image, 0, 0 );
        // Scaled 4x
        canvasScaled = document.createElement( 'canvas' );
        canvasScaled.width = width * 4;
        canvasScaled.height = height * 4;
        context = canvasScaled.getContext( '2d' );
        context.scale( 4, 4 );
        context.drawImage( canvas, 0, 0 );
        image = context.getImageData( 0, 0, canvasScaled.width, canvasScaled.height );
        imageData = image.data;
        for ( var i = 0, l = imageData.length; i < l; i += 4 ) {
            var v = ~~ ( Math.random() * 5 );
            imageData[ i ] += v;
            imageData[ i + 1 ] += v;
            imageData[ i + 2 ] += v;
        }
        context.putImageData( image, 0, 0 );
        return canvasScaled;
    };

    this.texture = new THREE.CanvasTexture( generateTexture( data2D, idv.vr.getWorldWidth(), idv.vr.getWorldDepth() ) );
    this.texture.wrapS = THREE.ClampToEdgeWrapping;
    this.texture.wrapT = THREE.ClampToEdgeWrapping;
};

idv.vr.createRenderer = function () {
    // renderer
    // RENDERER
    this.renderer = new THREE.WebGLRenderer();
    renderer.setClearColor( 0xbfd1e5 );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize(window.innerWidth, window.innerHeight );

    // // LIGHT
    // var light = new THREE.PointLight(0xffffff);
    // light.position.set(0,250,0);
    // scene.add(light);
};

idv.vr.attachDisplay = function () {

    // display
    container.innerHTML = "";
    container.appendChild( renderer.domElement );
    idv.vr.attachStats();
};


idv.vr.play = function () {
    d3.csv("data/ascii_2013all.optimized-2-2.csv", function(error, pixelData) {
        var pointId = 0;
        var col = 0;
        var index = 0;

        var data2D = [];
        for (var i=0;i<pixelData.length;i++){ // rows loop
            var currentRow=[];
            col = 0; // reset for column value
            for (var key in pixelData[i]){ // columns loop
                var cellValue = +pixelData[i][key];
                currentRow.push(cellValue);
                col ++;
                index ++;
                if (cellValue > -9999) {
                    pointId ++; // current point id
                }
            }

            data2D.push(currentRow);
        }


        data2D = idv.vr.generateHeight(idv.vr.getWorldWidth(), idv.vr.getWorldDepth());

        // update camera position
        camera.position.y = data2D[ worldHalfWidth + worldHalfDepth * worldWidth ] * 10 + 500;

        // create texture
        idv.vr.createTexture(data2D);

        // create mesh

        if (!!idv.vr.getMesh()) {
            scene.remove( idv.vr.getMesh() );
        }

        idv.vr.mesh = idv.vr.createContourMesh(idv.vr.getWorldWidth(), idv.vr.getWorldDepth(), new THREE.MeshBasicMaterial( { map: idv.vr.getTexture() } ) , data2D);
        scene.add( idv.vr.getMesh() );

        // create renderer
        idv.vr.createRenderer();

        // display
        idv.vr.attachDisplay();

        window.addEventListener( 'resize', idv.vr.onWindowResize, false );
        idv.vr.animate();
    });
};



idv.vr.play();

