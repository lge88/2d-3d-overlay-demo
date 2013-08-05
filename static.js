
var express = require( 'express' );
var app = express();

app
  .use( express.logger( 'dev' ) )
  .use( express.static( __dirname ) )
  .listen( 3000 );
