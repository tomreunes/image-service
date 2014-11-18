/**
 * Node.js and Express application which contains functionalities concerning image uploading on a server. Files can be uploaded (temporary), confirmed, and deleted using this system.
 * This package is currently still in an initial construction phase and can be used by everyone for free! Enjoy!
 * @type {generate|exports}
 */

var $shortId = require('shortid'),
    $readChunk = require('read-chunk'),
    $imageType = require('image-type'),
    $path = require('path'),
    $fs = require('fs'),
    $q = require('q');

var functions = function () {
    /* Configurable variables */
    var scope = {};
    scope.host = 'http://localhost:3000';
    scope.apiRoute = '/uploads/';
    scope.uploadDir = 'uploads';
    var tmpPrefix = 'euricom_tmp_';
    var useTmpPrefix = true;
    var root = __dirname;
    var debug = false;
    var delimiter = {
        local: '\\',
        external: '/'
    };
    var path = {
        local: function () {
            return root + delimiter.local + scope.uploadDir + delimiter.local;
        },
        external: function () {
            return scope.host + scope.apiRoute;
        }
    };

    var imageTypes = {
        mapping: {
            "gif": 'image/gif',
            "jpg": 'image/jpeg',
            "png": 'image/png'
        },
        accepted: [],
        updateAccepted: function () {
            imageTypes.accepted = [];
            for (var key in imageTypes.mapping) {
                imageTypes.accepted.push(imageTypes.mapping[key]);
            }
        },
        accepts: function (type) {
            return imageTypes.accepted.indexOf(type) > -1;
        }
    };

    /* Initial configuration */
    imageTypes.updateAccepted();

    var config = function (options) {
        if (options == null) return;
        if (options.host) {
            scope.host = options.host;
        }
        if (options.uploadDir) {
            scope.uploadDir = options.uploadDir;
        }
        if (options.tmpPrefix) {
            tmpPrefix = options.tmpPrefx;
        }
        if (options.root) {
            root = options.root;
        }
        if (options.useTmpPrefix) {
            useTmpPrefix = options.useTmpPrefix;
        }
        if (options.debug) {
            debug = options.debug;
        }
        if (options.apiRoute) {
            scope.apiRoute = options.apiRoute;
        }
    };
    var uploadFile = function (file) {
        //var d = $q.defer();
        if (!imageTypes.accepts(file.headers['content-type'])) {
            if (debug) console.log("Wrong content-type!");
            //throw new Error("Wrong content-type");
            //d.reject(new Error('Wrong content-type'));
        } else {
            var id = $shortId.generate();

            var filename = id + $path.extname(file.name);
            if (useTmpPrefix) {
                filename = tmpPrefix + filename;
            }
            $fs.readFile(file.path, function (err, data) {
                $fs.writeFile(path.local() + filename, data, function (err) {
                    if (err && err != null) {
                        throw new Error(err);
                    } else {
                        if (debug) console.log('upload success');
                    }
                });
            });
            /*d.resolve({
             filename: filename,
             src: path.external() + filename,
             isTemporaryFile: useTmpPrefix
             });*/
            return {
                filename: filename,
                src: path.external() + filename,
                isTemporaryFile: useTmpPrefix
            };
        }
        //return d.promise;
    };
    var upload = function (files) {
        var d = $q.defer();
        var output = [];
        if (!Array.isArray(files)) {
            files = [files];
        }
        files.forEach(function (file) {
            /*uploadFile(file)
             .then(function (data) {
             output.push(data);
             }).catch(function (err) {
             //console.log(err);
             //errors.push(err);
             //console.log(err);
             });
             */
            var f = uploadFile(file);
            if(f) output.push(f);
        });
        if (!output.length) {
            d.reject(new Error("no valid files"));
            //console.log("test");
        } else {
            d.resolve(output);
        }
        return d.promise;
    };
    var getFile = function (res, filename, status) {
        var img = $fs.readFileSync(path.local() + filename);
        var buffer = $readChunk.sync(path.local() + filename, 0, 12);
        res.writeHead(status ? status : 200, {'Content-Type': imageTypes.mapping[$imageType(buffer)]});
        res.end(img, 'binary');
    };
    var confirm = function (filename) {
        var d = $q.defer();
        if (filename.indexOf(tmpPrefix) != 0) {
            d.reject(new Error('is no tmp file'));
        }else if (!useTmpPrefix) {
            d.reject(new Error('tmp prefixes arent used'));
        }else {
            var newFilename = filename.substr(tmpPrefix.length);
            $fs.exists(path.local() + filename, function(exists){
                if(exists){
                    $fs.rename(path.local() + filename, path.local() + newFilename);
                    d.resolve({
                        filename: newFilename,
                        src: path.external() + newFilename,
                        isTemporaryFile: false
                    });
                } else {
                    d.reject(new Error('file doesnt exist'))
                }
            });
        }
        return d.promise;
    };
    var clean = function () {
        var files = $fs.readdirSync(path.local());
        var counter = 0;
        files.forEach(function (filename) {
            if (filename.indexOf(tmpPrefix) == 0) {
                $fs.unlink(path.local() + filename);
                counter++;
            }
        });
        if (debug) console.log('All ' + counter + ' temporary files are deleted');
    };
    var remove = function (filename) {
        var d = $q.defer();
        $fs.exists(path.local() + filename,function(exists){
            if(exists){
                $fs.unlink(path.local() + filename);
                d.resolve();
            }else{
                d.reject(new Error('file doesnt exist'));
            }
        });
        return d.promise;
    };


    scope.config = config;
    scope.upload = upload;
    scope.show = getFile;
    scope.confirm = confirm;
    scope.clearTmp = clean;
    scope.delete = remove;
    return scope;
}();


module.exports = functions;
