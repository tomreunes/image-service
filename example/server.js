/** run node server.js to execute **/
var $express = require('express'),
    $multipart = require('connect-multiparty'),
    $cors = require('cors'),
    $imgService = require('images-service');

var app = $express();

var routes = {
    root: __dirname,
    apiRoute: '/api/images'
};

//Tell server where to store images locally and how to retrieve them from client side
$imgService.config(routes);
//Clear temporary files when booting
$imgService.clearTmp();

app
    //Enable cross domain requests
    .use($cors())
    //Request logging
    .all('*', function (req, res, next) {
        console.log(req.method + " " + req.url);
        next();
    })
    //Upload/Post images
    .post(routes.apiRoute, $multipart(), function(req,res,next){
        if(!(req.get('content-type') && req.get('content-type').indexOf('multipart/form-data') > -1)){
            res.status(401);
            next();
            return;
        }
        var files = req.files.file;
        $imgService.upload(files).then(function(data){
            res.status(200).send(data);
        }).done();
        //res.status(200).send(images);
    })
    .put(routes.apiRoute+':filename', function (req, res) {
        var filename = req.params.filename;
        var image = $imgService.confirm(filename);
        res.status(200).send(image);
    })
    .get(routes.apiRoute+':filename', function (req, res) {
        var filename = req.params.filename;
        $imgService.show(res,filename);
    })
    .delete(routes.apiRoute+':filename',function(req,res){
        var filename = req.params.filename;
        $imgService.delete(filename);
        res.status(200).send('Succesfully removed!');
    });

app.listen(3000);

console.log('Listening to port 3000 (' + __dirname + ')');