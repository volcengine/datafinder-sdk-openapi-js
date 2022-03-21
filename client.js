const crypto = require('crypto');
const fetch = require("node-fetch");

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
    if (!body){
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
    constructor(ak, sk, expiration = undefined, url = undefined) {
        this.org = '';
        if (url) {
            this.url = url;
        } else {
            this.url = "https://analytics.volcengineapi.com";
        }
        this.ak = ak;
        this.sk = sk;
        if(expiration){
            this.expiration = expiration;
        }else{
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

    request(service, method, path, headers, params, body) {
        method = method.toUpperCase()
        if ('POST' == method) {
            if (!body) {
                throw 'post must have body';
            }
        }
        let servicePath = this.services[service];
        if (!servicePath) {
            throw 'service: ' + service + 'not exist.';
        }
        let serviceUrl = servicePath + path;
        let authorization = hash(this.ak, this.sk, this.expiration, method, serviceUrl, params, body);
        let rHeaders = { 'Authorization': authorization };
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

    _parseMethod(data) {
        let method = data['method'];
        if (!method) {
            if (data['body']) {
                method = 'POST';
            } else {
                method = 'GET';
            }
        }
        return method;
    }

    analysisBase(path, data) {
        return this.request('analysisBase', this._parseMethod(data), path, data['headers'], data['params'], data['body']);
    }
    dataFinder(path, data) {
        return this.request('dataFinder', this._parseMethod(data), path, data['headers'], data['params'], data['body']);
    }

    dataTracer(path, data) {
        return this.request('dataTracer', this._parseMethod(data), path, data['headers'], data['params'], data['body']);
    }

    dataTester(path, data) {
        return this.request('dataTester', this._parseMethod(data), path, data['headers'], data['params'], data['body']);
    }

    dataAnalyzer(path, data) {
        return this.request('dataAnalyzer', this._parseMethod(data), path, data['headers'], data['params'], data['body']);
    }

    dataRangers(path,data){
        return this.request('dataRangers', this._parseMethod(data), path, data['headers'], data['params'], data['body']); 
    }

    dataProfile(path, data) {
        return this.request('dataProfile', this._parseMethod(data), path, data['headers'], data['params'], data['body']);
    }
}

module.exports = { RangersClient };