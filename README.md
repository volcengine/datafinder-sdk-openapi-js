# openapi 使用说明

### 1. 语法
common js 语法

### 2、样例


* 调用服务
query.js
```js
const oepnapisdk = require("@/datafinder/openapisdk");
const RangersClient = oepnapisdk.RangersClient;

function testQuery() {
    ak = "xxxx"
    sk = "xxxx"
    rc = new RangersClient(ak, sk)
    dsl = {
        "version": 3,
        "app_ids": [0],
        "use_app_cloud_id": true,
        "periods": [
            {
                "granularity": "day",
                "type": "last",
                "last": {
                    "amount": 5,
                    "unit": "day"
                },
                "timezone": "Asia/Shanghai"
            }
        ],
        "contents": [
            {
                "query_type": "event",
                "profile_groups": [],
                "profile_filters": [],
                "queries": [
                    [
                        {
                            "event_type": "origin",
                            "show_name": "活跃用户数",
                            "event_name": "app_launch",
                            "groups": [],
                            "filters": [],
                            "show_label": "active_user",
                            "event_indicator": "event_users"
                        }
                    ]
                ],
                "option": {
                    "skip_cache": false
                }
            }
        ]
    }
    resp = rc.dataFinder("/openapi/v1/analysis", { body: JSON.stringify(dsl) })
        .then(res => res.json())
        .then(response => {
            console.log("response: " + JSON.stringify(response));
            if (200 !== response['code']) {
                throw "result is not ok, code: " + response['code'] + ", message: " + response['message'];
            }
            result = response['data']
            result.forEach(item => {
                if ('SUCCESS' !== item['result_status']) {
                    throw "result item is not ok, status: " + item['result_status'] + ", error message: " + item['error_message'];
                }
            })

            console.log('success.')
        })
        .catch(error => console.error('error:', error));
}
```

* 运行测试用例：
```shell
node query.js
```