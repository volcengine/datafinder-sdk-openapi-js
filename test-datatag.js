const dslsdk = require("./index.js");
const fs = require('fs');

const RangersClient = dslsdk.RangersClient;

// analysis base 地址
let ak = 'xxx';
let sk = 'xxx';
let url = "xxx"
const bc = new RangersClient(ak, sk, url = url);

function testUploadFile() {
    let method = 'post'
    let serviceUrl = '/datatag/openapi/v1/app/xxx/tag/file/upload'

    fileName = 'user_tag.csv'

    resp = bc.uploadFile(serviceUrl, {
        method: method,
        file: fileName
    }).then(res => res.json())
        .then(response => {
            console.log("response: " + JSON.stringify(response));
        })
        .catch(error => console.error('error:', error));
}

function testCreateTag() {
    let method = "POST"
    let serviceUrl = "/datatag/openapi/v1/app/xxx/tag"
    let body = {
        "name": "tag_test_js",
        "show_name": "测试标签js",
        "value_type": "string",
        "description": "",
        "create_type": "upload",
        "refresh_rule": "manual",
        "tag_rule": {
            "file": {
                "file_key": "tag_upload_uuid/xxx/20220531/xxxx.json",
                "detail": {
                    "name": "user_tag.csv"
                }
            }
        }
    }
    resp = bc.request(serviceUrl, {
        method: method,
        body: JSON.stringify(body)
    }).then(res => res.json())
        .then(response => {
            console.log("response: " + JSON.stringify(response));
        })
        .catch(error => console.error('error:', error));
}

function testQueryResult() {
    let method = "GET";
    let serviceUrl = "/datatag/openapi/v1/app/xxx/tag/tag_test_tag_js/result";
    resp = bc.request(serviceUrl, {
        method: method
    }).then(res => res.json())
        .then(response => {
            console.log("response: " + JSON.stringify(response));
        })
        .catch(error => console.error('error:', error));
}

function testQueryHistory() {
    let method = "POST";
    let serviceUrl = "/datatag/openapi/v1/app/xxx/tag/tag_test_tag_js/result/history"
    let body = {
        "granularity": "day",
        "type": "past_range",
        "spans": [
            {
                "type": "past",
                "past": {
                    "amount": 7,
                    "unit": "day"
                }
            },
            {
                "type": "past",
                "past": {
                    "amount": 1,
                    "unit": "day"
                }
            }
        ],
        "timezone": "Asia/Shanghai",
        "week_start": 1
    }
    resp = bc.request(serviceUrl, {
        method: method,
        body: JSON.stringify(body)
    }).then(res => res.json())
        .then(response => {
            console.log("response: " + JSON.stringify(response));
        })
        .catch(error => console.error('error:', error));
}

function testExportTag() {
    let method = "POST";
    serviceUrl = "/datatag/openapi/v1/app/xxx/tag/tag_test_js/download"
    body = {
        "type": "user",
        "condition": {
            "property_operation": "is_not_null",
            "snapshot": {
                "type": "day",
                "day": "2022-05-31"
            }
        },
        "period": {
            "timezone": "Asia/Shanghai"
        }
    }
    resp = bc.request(serviceUrl, {
        method: method,
        body: JSON.stringify(body)
    }).then(res => res.text())
        .then(response => {
            console.log("response: " + response);
        })
        .catch(error => console.error('error:', error));
}

function testQueryTagInfo() {
    let method = "GET";
    let serviceUrl = "/datatag/openapi/v1/app/xxx/tag/tag_test_js";
    resp = bc.request(serviceUrl, {
        method: method
    }).then(res => res.json())
        .then(response => {
            console.log("response: " + JSON.stringify(response));
        })
        .catch(error => console.error('error:', error));
}

function testQueryTags() {
    let method = "GET";
    let serviceUrl = "/datatag/openapi/v1/app/xxx/tag";
    resp = bc.request(serviceUrl, {
        method: method
    }).then(res => res.json())
        .then(response => {
            console.log("response: " + JSON.stringify(response));
        })
        .catch(error => console.error('error:', error));
}

function testCalTag() {
    let method = "POST";
    let serviceUrl = "/datatag/openapi/v1/app/xxx/tag/tag_test_js/calculation"
    resp = bc.request(serviceUrl, {
        method: method
    }).then(res => res.json())
        .then(response => {
            console.log("response: " + JSON.stringify(response));
        })
        .catch(error => console.error('error:', error));
}

// testUploadFile();
// testCreateTag();
testQueryResult();
testQueryHistory();
testExportTag()
testQueryTagInfo();
testQueryTags()
// testCalTag();