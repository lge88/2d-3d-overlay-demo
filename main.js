
var THREE = THREE;
var GUI = dat.GUI;

var scope = {};
var scene, camera, renderer, controller, container, video;
var backCtx, ctx2D;
var running = false;
var gui;
var randomBallOptions = {
  amount: 50,
  radius: 20,
  'position range': 50
};

var doAddBallsToScene = randomBallsGenerator( randomBallOptions );

var initTasks = [
  doInitModel,
  doSetup3DSceneView,
  doSetupSceneViewControls,
  doSetupGui,
  doSetupVideo,
  doSetup2DContext,
  doSetupUserMedia,
  // doAddCubesToScene,
  doAddBallsToScene,
  noop
];

var frameTasks = [
  readVideoPixels,
  doInvertRGB,
  // doSmooth,
  writeVideoPixels,
  doUpdateCamera,
  // doUpdateScene,
  doRenderScene3D,
  noop
];


init();
animate();

function init() {
  scope = {};
  compile( initTasks )( scope );
}

function doInitModel( scope ) {
  scope.model = {
    randomBallOptions: randomBallOptions
  };

  return scope;
}

function doSetup3DSceneView( scope ) {
  extend( scope, setup3DSceneView( 'main' ) );
  scene = scope.scene;
  camera = scope.camera;
  renderer = scope.renderer;
  scope.sceneDirty = true;
  return scope;
}

function doSetupGui( scope ) {
  var scene = scope.scene;
  var randomBallOptions = scope.model.randomBallOptions;

  gui = scope.gui = new GUI();

  gui.add( { regenerate: updateScene }, 'regenerate' );
  gui.add( randomBallOptions, 'amount', 0, 100 ).onChange( updateScene );
  gui.add( randomBallOptions, 'radius', 0, 50 ).onChange( updateScene );
  gui.add( randomBallOptions, 'position range', 20, 100 ).onChange( updateScene );

  gui.add( { 'invert rgb': true }, 'invert rgb' ).onChange( toggleFrameTask( doInvertRGB ) );

  function updateScene() {
    clearScene( scene );
    doAddBallsToScene = randomBallsGenerator( randomBallOptions );
    doAddBallsToScene( scope );
  }

  function toggleFrameTask( task ) {
    var f = makeToggleTaskFunc( frameTasks, task );
    return function( flag ) {
      f( flag );
      frameFuncNeedsUpdate = true;
    }
  }

  return scope;
}

function makeToggleTaskFunc( tasks, task ) {
  return function( tasks, task ) {
    var index = tasks.indexOf( task );
    return function toggle( flag ) {
      if ( flag === true ) {
        replaceAt( tasks, index, task );
      } else {
        replaceAt( tasks, index, noop );
      }
    }
  }( tasks, task );
}

function doUpdateScene( scope ) {
  var dirty = scope.sceneDirty;
  var randomBallOptions = scope.randomBallOptions;

  if ( dirty === true ) {
    doAddBallsToScene = randomBallsGenerator( randomBallOptions );
    clearScene( scene );
    doAddBallsToScene( scope );
  }
}

function clearScene( scene ) {
  var i, len = scene.children.length;
  for ( i = 0; i < len; ++i ) {
    scene.remove( scene.children[0] );
  }
}

function setup3DSceneView( id ) {

  var container = document.getElementById( id );

  camera = new THREE.PerspectiveCamera( 50, window.innerWidth / window.innerHeight, 1, 1000 );
  camera.position.set( 0, 0, 300 );

  scene = new THREE.Scene();

  renderer = new THREE.WebGLRenderer( { antialias: true } );
  renderer.setSize( window.innerWidth, window.innerHeight );
  container.appendChild( renderer.domElement );

  return {
    scene: scene,
    camera: camera,
    renderer: renderer
  };

}

function doSetup2DContext( scope ) {
  scope.ctx2D = setup2DContext( 'front-canvas' );
  scope.backCtx = setup2DContext( 'back-canvas' );

  ctx2D = scope.ctx2D;
  backCtx = scope.backCtx;

  return scope;
}

function setup2DContext( id ) {
  return document.getElementById( id ).getContext( '2d' );
}

function doSetupVideo( scope ) {
  video = scope.video = document.getElementById( 'video' );
  return scope;
}

function doSetupUserMedia( scope ) {
  setupUserMedia( scope.video, function() {
    scope.backCtx.translate( scope.backCtx.canvas.width, 0 );
    scope.backCtx.scale( -1, 1 );
  }, noop );

  return scope;
}

function setupUserMedia( video, success, fail ) {
  navigator.getMedia = ( navigator.getUserMedia ||
                         navigator.webkitGetUserMedia ||
                         navigator.mozGetUserMedia ||
                         navigator.msGetUserMedia );

  navigator.getMedia(
    { video: true },
    function( stream ){
      video.src = window.URL.createObjectURL( stream );
      video.play();
      success( stream, video );
    },
    function( err ){
      console.log( 'Error occured when getting user media: ' + err );
      fail( err, video );
    } );

  return video;
}

function doSetupSceneViewControls( scope ) {
  scope.controller = setupSceneViewControls( scope.camera, scope.renderer.domElement );
  return scope;
}

function setupSceneViewControls( camera, domElement ) {
  return controller = new THREE.TrackballControls( camera, domElement );
}

function build3DScene() {
  var c, v;
  for ( i = 0; i < 100; ++i ) {
    v = randomVector3( 0, 30 );
    c = cube( v.x, v.y, v.z );
    c.position.copy( randomVector3( -50, 50 ) );
    scene.add( c );

    c = ball( random( 20 ) );
    c.position.copy( randomVector3( -50, 50 ) );
    scene.add( c );
  }
}

function randomBallsGenerator( options ) {
  options || ( options = {} );
  var amount = options.amount || 100;

  var radius = options.radius || 20;
  var radiusRange = [0, radius];

  var pos = options['position range'] || 50;
  var posRange =  [-pos, pos];

  return function doAddBallsToScene( scope ) {
    var scene = scope.scene;

    var balls = createArrayOfObjects( amount, ball, function() {
      return randomVector(
        [
          radiusRange,
          posRange,
          posRange,
          posRange
        ]
      );
    } );

    balls.forEach( function( b ) { scene.add( b ); } );
    return scope;
  }
}


function createArrayOfObjects( amount, createFn, parameterFn ) {
  var obj, params, arr = [];
  for ( i = 0; i < amount; ++i ) {
    params = parameterFn( i );
    obj = createFn.apply( null, params );
    arr.push( obj );
  }
  return arr;
}

function ball( r, x, y, z ) {
  var m = new THREE.Mesh(
    new THREE.SphereGeometry( r || 40 )
  );
  m.material.wireframe = false;
  x && ( m.position.x = x );
  y && ( m.position.y = y );
  z && ( m.position.z = z );
  return m;
}

function random( a, b ) {
  a || ( a = 1.0 );
  b || ( b = 0.0 );
  return Math.random()*( b - a ) + a;
}

// ranges is a 2D array
// example ranges = [ [-10, 10], [30, 40], ... ]
function randomVector( ranges ) {
  var i, arr = new Array( ranges.length ), len = arr.length;
  for ( i = 0; i < len; ++i ) {
    arr[i] = random.apply( null, ranges[i] );
  }
  return arr;
}

function cube( w, h, t, x, y, z ) {
  var m = new THREE.Mesh(
    new THREE.CubeGeometry( w || 40, h || 40, t || 40 )
  );
  m.material.wireframe = false;
  x && ( m.position.x = x );
  y && ( m.position.y = y );
  z && ( m.position.z = z );
  return m;
}

function randomVector3( left, right ) {
  var x = random( left, right );
  var y = random( left, right );
  var z = random( left, right );
  return new THREE.Vector3( x, y, z );
}

function animate() {

  running = true;
  frameFuncNeedsUpdate = true;

  var frameFunc;

  function run() {
    if ( !frameFunc || frameFuncNeedsUpdate === true ) {
      frameFunc = compile( frameTasks );
      frameFuncNeedsUpdate = false;
    }

    frameFunc( scope );
    if ( running === true ) {
      requestAnimationFrame( run );
    }
  }

  run();
}

function stop() { running = false; }

function noop( x )  { return x; }

function compile( tasks ) {
  return sequence( tasks.filter( function( t ) {
    return t !== noop;
  } ) );
}

function runTasks( tasks, scope ) {
  var i, task, len = tasks.length;
  for ( i = 0; i < len; ++i ) {
    task = tasks[ i ];
    if ( Array.isArray( task ) ) {
      runTasks( task, scope );
    } else {
      task( scope );
    }
  }
}

function sequence( funcs ) {
  return funcs.reduce( function( sofar, f ) {
    return function( x ) {
      return f( sofar(x) );
    };
  }, noop );
}

// function runQTasks( tasks, scope ) {
//   var i = 0, task, len = tasks.length, result;
//   result = Q.fcall( function() { return scope; } );
//   while ( i < len ) {
//     task = tasks[ i ];
//     result = result.then( task );
//     ++i;
//   }
//   return result;
// }

function extend( object ) {
  var args = Array.prototype.slice.call( arguments, 1 );

  for ( var i = 0, source; source = args[i]; ++i ) {
    if ( !source ) continue;
    for ( var property in source ) {
      object[ property ] = source[ property ];
    }
  }

  return object;
};

function doUpdateCamera( scope ) {
  scope.controller.update();
  return scope;
}

function doRenderScene3D( scope ) {
  scope.renderer.render( scope.scene, scope.camera );;
  return scope;
}

function readVideoPixels( scope ) {
  var video = scope.video, ctx = scope.backCtx;
  ctx.drawImage( video, 0, 0 );
  if ( video.videoWidth > 10 && video.videoHeight > 10 ) {
    scope.imgData = ctx.getImageData( 0, 0, video.videoWidth, video.videoHeight );
  }
  return scope;
}

function writeVideoPixels( scope ) {
  if ( scope.imgData ) {
    scope.ctx2D.putImageData( scope.imgData, 0, 0 );
  }
  return scope;
}

function doInvertRGB( scope ) {
  if ( scope.imgData ) {
    scope.imgData = invertRGB( scope.imgData );
  }
  return scope;
}

function removeAt( array, index ) {
  if ( index < 0 || index > array.length ) { return -1; }
  Array.prototype.splice.call( array, index, 1 );
  return index;
}

function removeItem( array, item ) {
  return removeAt( array, array.indexOf( item ) );
}

function replaceAt( array, index, newItem ) {
  if ( index < 0 || index > array.length ) { return -1; }
  Array.prototype.splice.call( array, index, 1, newItem );
  return index;
}

function replaceItem( array, oldItem, newItem ) {
  return replaceAt( array, array.indexOf( oldItem ) );
}

function insertAfter( array, index, newItem ) {
  if ( index < 0 || index > array.length ) { return -1; }
  ++index;
  Array.prototype.splice.call( array, index, 0, newItem );
  return index;
}

function insertAfterItem( array, itemExists, itemToBeInserted ) {
  return insertAfter( array, array.indexOf( itemExists ) );
}

function insertBefore( array, index, newItem ) {
  if ( index < 0 || index > array.length ) { return -1; }
  Array.prototype.splice.call( array, index, 0, newItem );
  return index;
}

function insertBeforeItem( array, itemExists, itemToBeInserted ) {
  return insertBefore( array, array.indexOf( itemExists ) );
}


function invertRGB( imgData ) {
  var i, data = imgData.data, len = data.length;

  for ( i = 0; i < len; i += 4 ) {
    var r = data[ i ];
    var g = data[ i+1 ];
    var b = data[ i+2 ];
    data[ i ] = g;
    data[ i+1 ] = b;
    data[ i+2 ] = r;
  }
  return imgData;
}

function getImageDataIndex( imgData, x, y, channel ) {
  var w = imgData.width, i;
  switch( channel ) {
  case 'r':
    i = 0;
    break;
  case 'g':
    i = 1;
    break;
  case 'b':
    i = 0;
    break;
  case 'a':
    i = 3;
    break;
  default:
    i = 0;
  }
  return ( x + y*w )*4 + i;
}

function setPixel( imgData, x, y, value ) {
  var ind = getImageDataIndex( imgData, x, y );
  if ( typeof value === 'number' ) {
    imgData[ ind ]
      = imgData[ ind + 1 ]
      = imgData[ ind + 2 ]
      = imgData[ ind + 3 ] = value;
  } else if ( typeof value === 'object' ) {
    value.r && ( imgData[ ind ] = value.r );
    value.g && ( imgData[ ind+1 ] = value.g );
    value.b && ( imgData[ ind+2 ] = value.b );
    value.a && ( imgData[ ind+3 ] = value.a );
  }
}

// filter is an 2d array with dimension 3x3, 5x5, 7x7...
// TODO: optimize this;
function applyFilter( imgData, filter ) {
  var data = imgData.data, len = data.length;
  var w = imgData.width, h = imgData.height;
  var filterWidth = filter[0].length, filterHeight = filter.length;
  var i, j, m, n;
  var ind, r, g, b, a;
  var subRegion;
  var out = new Array( data.length );

  for ( i = 0; i < w; ++i ) {
    for ( j = 0; j < h; ++j ) {
      r = 0, g = 0, b = 0;
      subRegion = filter
        .map( function( row, rowIndex ) {
          return row.map( function( val, colIndex ) {
            ind = getImageDataIndex(
              imgData,
              i - (filterWidth-1)/2 + rowIndex,
              j - (filterHeight-1)/2 + colIndex
            );
            return {
              r: data[ ind ] || 0,
              g: data[ ind+1 ] || 0,
              b: data[ ind+2 ] || 0,
              a: data[ ind+3 ] || 0
            };
          } );
        }  );

      for ( m = 0; m < filterWidth; ++m ) {
        for ( n = 0; n < filterHeight; ++n ) {
          r += filter[m][n] * subRegion[m][n].r;
          g += filter[m][n] * subRegion[m][n].g;
          b += filter[m][n] * subRegion[m][n].b;
          a += filter[m][n] * subRegion[m][n].a;
        }
      }

      ind = getImageDataIndex( imgData, i, j );
      out[ ind ] = r;
      out[ ind+1 ] = g;
      out[ ind+2 ] = b;
      out[ ind+3 ] = a;
    }
  }
  imgData.data = out;

  return imgData;
}

function createFilter( dim, fn ) {
  var i, j, ret = new Array( dim );
  for ( i = 0; i < dim; ++i ) {
    ret[ i ] = new Array( dim );
    for ( j = 0; j < dim; ++j ) {
      ret[i][j] = fn( i, j );
    }
  }
  return ret;
}

var smoothFilter = createFilter( 3, function( x, y ) {
  return 1/200;
} );

function doSmooth( scope ) {

  if ( scope.imgData ) {
    scope.imgData = applyFilter( scope.imgData, smoothFilter );
  }

  return scope;
}
