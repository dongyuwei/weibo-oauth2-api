var https = require('https');
var path = require('path');
var fs = require('fs');
var qs = require('querystring');
var multiparter = require("multiparter");

function parse_json(res, callback) {
    var list = [];
    res.on('data', function (chunk) {
        list.push(chunk);
    });
    res.on('end', function () {
        callback(JSON.parse(Buffer.concat(list).toString()));
        list = null;
    });

    res.on("error", function (error) {
        console.log(error);
    });
};

IMG_CONTENT_TYPES = {
    '.gif': 'image/gif',
    '.jpeg': 'image/jpeg',
    '.jpg': 'image/jpeg',
    '.png': 'image/png'
}

var api = {
    config: function (client_id, client_secret, redirect_uri) {
        this.client_id = client_id;
        this.client_secret = client_secret;
        this.redirect_uri = redirect_uri;

        return this;
    },
    get_authorize_url: function (client_id, redirect_uri) {
        return 'https://api.weibo.com/oauth2/authorize?client_id=' + this.client_id + '&redirect_uri=' + this.redirect_uri + '&response_type=code';
    },
    access_token: function (code, callback) {
        var post_data = qs.stringify({
            'client_id': this.client_id,
            'client_secret': this.client_secret,
            'grant_type': 'authorization_code',
            'code': code,
            'redirect_uri': this.redirect_uri
        });
        var options = {
            host: 'api.weibo.com',
            path: '/oauth2/access_token',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': post_data.length
            }
        };
        var req = https.request(options, function (res) {
            parse_json(res, callback);
        });
        req.write(post_data)
        req.end();

        req.on('error', function (e) {
            console.error(e);
        });
    }
};
api.statuses = {
    update: function (status, access_token, callback) {
        var post_data = qs.stringify({
            'status': status,
            'access_token': access_token
        });
        var options = {
            host: 'api.weibo.com',
            path: '/2/statuses/update.json',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': post_data.length
            }
        };
        var req = https.request(options, function (res) {
            parse_json(res, callback);
        });
        req.write(post_data)
        req.end();

        req.on('error', function (e) {
            console.error(e);
        });
    },
    upload: function (status, pic_url, access_token, callback) {
        var request = new multiparter.request(https, {
            host: 'api.weibo.com',
            port: '443',
            path: "/2/statuses/upload.json",
            method: "POST",
            headers: { //上传文件时使用Authorization header做授权认证
                'Authorization': 'OAuth2 ' + access_token
            }
        });

        request.setParam('status', status);

        fs.stat(pic_url, function (err, stats) {
            if (err) {
                throw err;
            }
            request.addStream('pic', path.basename(pic_url), IMG_CONTENT_TYPES[path.extname(pic_url)], stats.size, fs.createReadStream(pic_url));
            request.send(function (error, res) {
                if (error) {
                    console.log(error);
                }
                parse_json(res, callback);
            });
        });
    },
    friends_timeline: function (access_token, callback) {
        https.get({
            host: 'api.weibo.com',
            path: '/2/statuses/friends_timeline.json?access_token=' + access_token
        }, function (res) {
            parse_json(res, callback);
        }).on('error', function (e) {
            console.error(e);
        });
    }
};

module.exports = api;