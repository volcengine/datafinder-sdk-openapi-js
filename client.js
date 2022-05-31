const crypto = require('crypto');
const { syncBuiltinESMExports } = require('module');
const fetch = require("node-fetch");
var mime = require('mime');
const fs = require('fs');  

function sha256HMAC(sk, data) {
    const hmac = crypto.createHmac('sha256', sk)
    return hmac.update(data).digest('hex')
}

function hash(ak, sk, expiration, method, path, params, body) {
    const timestamp = (+new Date() / 1000).toFixed(0);
    const signKeyInfo = `ak-v1/${ak}/${timestamp}/${expiration}`;
    const signKey = sha256HMAC(sk, signKeyInfo);
    const data = canonicalRequest(method, path, params, body);
    const signResult = sha256HMAC(signKey, data);
    return signKeyInfo + '/' + signResult;
}

function canonicalRequest(method, url, params, body) {
    let cm = canonicalMethod(method);
    let cu = canonicalUrl(url);
    let cp = canonicalParam(params);
    let cb = canonicalBody(body);
    return cm + '\n' + cu + '\n' + cp + '\n' + cb;
}

function canonicalMethod(method) {
    return 'HTTPMethod:' + method;
}

function canonicalUrl(url) {
    return 'CanonicalURI:' + url;
}

function canonicalParam(params) {
    let res = 'CanonicalQueryString:'
    if (!params) {
        return res;
    }
    return res + queryString(params);
}

function canonicalBody(body) {
    res = "CanonicalBody:"
    if (!body) {
        return res;
    }
    return res + body;
}

function queryString(params) {
    let esc = encodeURIComponent;
    return Object.keys(params)
        .map(k => esc(k) + '=' + esc(params[k]))
        .join('&');
}

class RangersClient {
    constructor(ak, sk, url = undefined, expiration = undefined) {
        this.org = '';
        if (url) {
            this.url = url;
        } else {
            this.url = "https://analytics.volcengineapi.com";
        }
        this.ak = ak;
        this.sk = sk;
        if (expiration) {
            this.expiration = expiration;
        } else {
            this.expiration = 1800;
        }
        this.services = {
            'analysisBase': '/analysisbase',
            'dataFinder': '/datafinder',
            'dataTracer': '/datatracer',
            'dataTester': '/datatester',
            'dataAnalyzer': '/dataanalyzer',
            'dataRangers': '/datarangers',
            'dataProfile': '/dataprofile'
        };
    }

    _requestService(service, method, path, headers, params, body) {
        let servicePath = this.services[service];
        if (!servicePath) {
            throw 'service: ' + service + 'not exist.';
        }
        let serviceUrl = servicePath + path;
        return this._request(method, serviceUrl, headers, params, body);
    }

    _request(method, serviceUrl, headers, params, body) {
        method = method.toUpperCase()
        let authorization = hash(this.ak, this.sk, this.expiration, method, serviceUrl, params, body);
        let rHeaders = { 'Authorization': authorization };
        if (headers) {
            for (let k in headers) {
                rHeaders[k] = headers[k]
            }
        }else{
            rHeaders['Content-Type'] = 'application/json'
        }
        let url = this.url + serviceUrl;
        if (params) {
            let queryStr = queryString(params);
            url = url + "?" + queryStr;
        }
        return fetch(url, {
            method: method,
            body: body,
            headers: rHeaders
        });
    }

    _parseMethod(data) {
        let method = data['method'];
        if (!method) {
            if (data['body']) {
                method = 'POST';
            } else {
                method = 'GET';
            }
        }
        method = method.toUpperCase()
        return method;
    }
    _getBoundary() {
        let boundary=''
        for (var i = 0; i < 24; i++) {
            boundary += Math.floor(Math.random() * 10).toString(16);
        }
        return boundary
    }

    uploadFile(serviceUrl, data) {
        let method = this._parseMethod(data)
        let file = data['file']
        let headers = data['headers']
        let params = data['params']

        let boundary = this._getBoundary()

        const fileContent = fs.readFileSync(file);
        let contentType = mime.getType(file);
        if (!contentType) {
            contentType = "application/octet-stream";
        }
        let body = ''
        body=body.concat("\r\n").concat("--").concat(boundary).concat("\r\n");
        body=body.concat(`Content-Disposition: form-data; name="file"; filename="${file}" \r\n`);
        body=body.concat(`Content-Type: ${contentType} \r\n\r\n`);
        body=body.concat(fileContent);
        body=body.concat("\r\n--" + boundary + "--\r\n");


        let authorization = hash(this.ak, this.sk, this.expiration, method, serviceUrl, params, body);
        let rHeaders = {
            'Authorization': authorization,
            "Content-Type": "multipart/form-data; boundary=" + boundary
        };

        if (headers) {
            for (let k in headers) {
                rHeaders[k] = headers[k]
            }
        }
        let url = this.url + serviceUrl;
        if (params) {
            let queryStr = queryString(params);
            url = url + "?" + queryStr;
        }
        return fetch(url, {
            method: method,
            body: body,
            headers: rHeaders
        });

    }

    analysisBase(path, data) {
        return this._requestService('analysisBase', this._parseMethod(data), path, data['headers'], data['params'], data['body']);
    }
    dataFinder(path, data) {
        return this._requestService('dataFinder', this._parseMethod(data), path, data['headers'], data['params'], data['body']);
    }

    dataTracer(path, data) {
        return this._requestService('dataTracer', this._parseMethod(data), path, data['headers'], data['params'], data['body']);
    }

    dataTester(path, data) {
        return this._requestService('dataTester', this._parseMethod(data), path, data['headers'], data['params'], data['body']);
    }

    dataAnalyzer(path, data) {
        return this._requestService('dataAnalyzer', this._parseMethod(data), path, data['headers'], data['params'], data['body']);
    }

    dataRangers(path, data) {
        return this._requestService('dataRangers', this._parseMethod(data), path, data['headers'], data['params'], data['body']);
    }

    dataProfile(path, data) {
        return this._requestService('dataProfile', this._parseMethod(data), path, data['headers'], data['params'], data['body']);
    }

    request(serviceUrl, data) {
        return this._request(this._parseMethod(data), serviceUrl, data['headers'], data['params'], data['body']);
    }
}

module.exports = { RangersClient };