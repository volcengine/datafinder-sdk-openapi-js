const dslsdk = require("./index.js");
const RangersClient = dslsdk.RangersClient;
const DSL = dslsdk.DSL;
const intExpr = dslsdk.intExpr;
const stringExpr = dslsdk.stringExpr;
const emptyExpr = dslsdk.emptyExpr;
const show = dslsdk.show;
const blend = dslsdk.blend;

// analysis base 地址
let ak = 'xxx';
let sk = 'xxx';
const bc = new RangersClient(ak, sk);

function request(dsl, queryType) {
    bc.dataFinder('/openapi/v1/analysis', { body: JSON.stringify(dsl) })
        .then(res => res.json())
        .then(response => {
            if (200 !== response['code']) {
                throw queryType + " result is not ok, code: " + response['code'] + ", message: " + response['message'];
            }
            result = response['data']
            result.forEach(item => {
                if ('SUCCESS' !== item['result_status']) {
                    throw queryType + " result item is not ok, status: " + item['result_status'] + ", error message: " + item['error_message'];
                }
            })

            console.log(queryType + ' success.')
        })
        .catch(error => console.error(queryType + ' error:', error));
}

function testGet() {
    bc.analysisBase('get', '/bear/api/msg', { params: { 'code': 'welcome' } })
        .then(res => res.json())
        .then(response => {
            console.log('testGet result:' + response)
        })
        .catch(error => console.error('testGet error: ', error));
}


function testEvent() {
    dsl = DSL.eventBuilder()  // 构造事件，每种类型的dsl有对应的builder                                             
        .appId(161757)  // 支持数组，这里可以是 .appid([1,2])                                                     
        .rangePeriod('day', 1562688000, 1563206400)  // 查询时间，支持多个时间。range表示区间，有开始和结束时间，last_period 表示最近时间                      
        .rangePeriod('hour', 1562688000, 1563206400)
        .group('app_channel') // 分组，支持数组，这里也可以是 .group([1,2])                                                                  
        .skipCache(false) //是否跳过缓存                                                  
        .tag({
            'contains_today': 0, 'show_yesterday': 0,
            "series_type": "line", "show_map": {}
        }) // 设置的标记，不参与查询条件构建，会添加到返回结果字段中                       
        .andProfileFilter(intExpr('user_is_new', '=', [0])  // 用户filter，支持and和or两种逻辑判断‘            
            .show(1, '老用户'))
        .andProfileFilter(stringExpr('language', '=', ['zj_CN', 'zh_cn']) // int_exp,string_exp,empty_exp, 分别表示表达式值的内容的值类型
            .stringExpr('age', '!=', ['20'])
            .show(2, 'zh_CN, zh_cn; not(20)'))
        .query(show('A', '查询A')  // 查询指标名称, 每个query表示的是并列关系，query()方法里面的表示顺序关系                                          
            .group('app_name') // 分组，支持数组 groups([])                                           
            .event('origin', 'predefine_pageview', 'pv') // 事件描述信息                
            .measureInfo('pct', 'event_index', 100) // measure_info 信息                     
            .andFilter(stringExpr('os_name', '=', ['windows'])  // filter         
                .stringExpr('network_type', '!=', ['wifi'])
                .show('referer_label', 'referrer')))
        .query(show('B', '查询B')
            .group(['app_name'])
            .event('origin', 'page_open', 'pv')
            .andFilter(emptyExpr()
                .show('app_id_label', 'app_id')))
        .build();

    // console.log(JSON.stringify(dsl, null, 2));
    request(dsl, 'event');
}

function testFunnel() {
    dsl = DSL.funnelBuilder()
        .appId(0)
        .rangePeriod('day', 1560268800, 1562774400)
        .group('os_name')
        .limit(1000)
        .offset(0)
        .window('day', 10)
        .skipCache(false)
        .andProfileFilter(intExpr('user_is_new', '=', [0])
            .stringExpr('network_type', '!=', ['4g,3g'])
            .show(1, '老用户; not(4g, 3g)'))
        .query(show('1', '查询1')
            .sample(100)
            .event('origin', 'play_time', 'pv')
            .andFilter(stringExpr('os_name', '=', ['windows'])
                .stringExpr('network_type', '!=', ['wifi'])
                .show('referer_label', 'referrer')),
            show('2', '查询2')
                .sample(100)
                .event('origin', 'app_launch', 'pv')
        )
        .build();

    // console.log(JSON.stringify(dsl, null, 2));
    request(dsl, 'funnel');
}

function testLifecycle() {
    dsl = DSL.lifecycleBuilder()
        .appId(162251)
        .rangePeriod('day', 1561910400, 1562428800)
        .limit(1000)
        .offset(0)
        .window('day', 1)
        .skipCache(false)
        .tag({
            "series_type": "line", "contains_today": 0,
            "metrics_type": "number", "disabled_in_dashboard": true
        })
        .andProfileFilter(stringExpr('custom_mp_platform', '=', ['2'])
            .stringExpr('app_channel', 'in', ['alibaba', 'baidu'])
            .show(1, '全体用户'))
        .query(show('active_user', 'active_user')
            .sample(100)
            .event('origin', 'app_launch', 'pv'))
        .build()
    // console.log(JSON.stringify(dsl, null, 2));
    request(dsl, 'life_cycle');
}

function testPathFind() {
    dsl = DSL.pathfindBuilder()
        .appId(0)
        .rangePeriod('day', 1563120000, 1563638400)
        .limit(1000)
        .offset(0)
        .window('minute', 10)
        .skipCache(false)
        .isStack(false)
        .andProfileFilter(stringExpr('os_name', 'in', ['android', 'ios'])
            .stringExpr('network_type', 'in', ['wifi', '4g'])
            .show(1, 'android, ios; wifi, 4g'))
        .query(show('1', '查询1')
            .sample(100)
            .event('origin', 'app_launch')
            .andFilter(emptyExpr().show('1', '全体用户')),
            show('2', '查询2')
                .sample(100)
                .event('origin', 'register')
                .andFilter(emptyExpr().show('1', '全体用户')),
            show('3', '查询3')
                .sample(100)
                .event('origin', 'register')
                .andFilter(emptyExpr().show('1', '全体用户')))
        .build()

    // console.log(JSON.stringify(dsl, null, 2));
    request(dsl, 'path_find');
}

function testRetention() {
    dsl = DSL.retentionBuilder()
        .appId(161757)
        .rangePeriod('day', 1561910400, 1563033600)
        .limit(1000)
        .offset(0)
        .group('network_type')
        .window('day', 30)
        .skipCache(false)
        .isStack(false)
        .tag({ "retention_from": "custom", "series_type": 'table' })
        .andProfileFilter(intExpr('user_is_new', '=', [0])
            .show(1, '老用户'))
        .query(show('first', '起始事件')
            .event('origin', 'page_open', 'pv')
            .andFilter(stringExpr('os_name', '=', ['windows', 'mac', 'ios'])
                .stringExpr('network_type', '!=', ['4g'])
                .show('os_name_label', 'os_name,network_type')),
            show('return', '回访事件')
                .event('origin', 'any_event')
                .andFilter(stringExpr('os_name', '=', ['windows', 'mac'])
                    .stringExpr('browser', '=', ['Chrome', 'Internet Explorer'])
                    .show('1', '全体用户'))
        )
        .build();
    // console.log(JSON.stringify(dsl, null, 2));
    request(dsl, 'retention');
}

function testWeb() {
    dsl = DSL.webBuilder()
        .appId(161757)
        .rangePeriod('day', 1562774400, 1563292800)
        .limit(1000)
        .offset(0)
        .group('browser')
        .web('first', 1200)
        .skipCache(false)
        .isStack(false)
        .tag({ "contains_today": 0, "series_type": 'line' })
        .andProfileFilter(stringExpr('os_name', '=', ['windows', 'android'])
            .show(1, '操作系统'))
        .query(show('session_count', '会话数')
            .sample(100)
            .event('origin', 'predefine_pageview', 'session_count')
            .andFilter(emptyExpr()
                .show('1', 'source')),
            show('average_session_duration', '平均会话时长')
                .event('origin', 'predefine_pageview', 'average_session_duration')
                .andFilter(emptyExpr()
                    .show('1', 'source')),
            show('bounce_rate', '跳出率')
                .event('origin', 'predefine_pageview', 'bounce_rate')
                .andFilter(emptyExpr()
                    .show('1', 'source')),
            show('average_session_depth', '平均会话深度')
                .event('origin', 'predefine_pageview', 'average_session_depth')
                .andFilter(emptyExpr()
                    .show('1', 'source')))
        .build()
    // console.log(JSON.stringify(dsl, null, 2));
    request(dsl, 'web session');
}

function testTopk() {
    dsl = DSL.topkBuilder()
        .appId(0)
        .rangePeriod('day', 1563379200, 1563897600)
        .order('app_version')
        .limit(1000)
        .offset(0)
        .skipCache(true)
        .tag({ "contains_today": 0, "show_yesterday": 0, "series_type": 'line', "show_map": {} })
        .andProfileFilter(intExpr('ab_version', '=', [1])
            .intExpr('user_is_new', '=', [0])
            .show('B', '新用户'))
        .query(show('A', '查询A')
            .sample(100)
            .event('origin', 'predefine_pageview', 'pv')
            .measureInfo('pct', 'event_index', 100)
            .andFilter(stringExpr('referrer', '=',
                ['http://www.baidu.com', 'http://www.datadance.com'],
                'event_param')
                .show('referer_label', 'referer')))
        .build()

    // console.log(JSON.stringify(dsl, null, 2));
    request(dsl, 'topk');
}

function testTracerTable() {
    dslAdv = DSL.advertiseBuilder()
        .advertise(1000, false, 'date')
        .product('bytetracer')
        .appId(0)
        .lastPeriod('day', 7, 'day')
        .todayPeriod('day', true)
        .limit(1000)
        .offset(0)
        .andProfileFilter(emptyExpr()
            .show(1, 'channel_1, traceing_1, group_id_1'))
        .query(show('impression_count', 'impression_count')
            .event('customed', 'impression', 'impression_count'))
        .query(show('click_count', 'click_count')
            .event('customed', 'click', 'click_count'))
        .query(show('promotion_activation_count', 'promotion_activation_count')
            .event('customed', 'activation', 'promotion_activation_count'))
        .build();

    dslRtnt = DSL.builder("retention")
        .product('bytefinder')
        .appId(0)
        .lastPeriod('day', 7, 'day')
        .todayPeriod('day', true)
        .limit(1000)
        .offset(0)
        .andProfileFilter(emptyExpr()
            .show(1, 'channel_1, traceing_1, group_id_1'))
        .query(show('1', '查询1')
            .sample(100)
            .event('origin', 'app_launch')
            .andFilter(intExpr('user_is_new', '=', [1], 'profile')
                .show('new_user', 'new_user')),
            show('2', '查询2')
                .sample(100)
                .event('origin', 'app_launch'))
        .build();

    mergeDsl = blend(undefined, dslAdv, dslRtnt);
    // console.log(JSON.stringify(mergeDsl, null, 2));
    let lak = 'xxx';
    let lsk = 'xxx';
    let lbc = new RangersClient(lak, lsk);
    let queryType = 'tracerQuery'
    lbc.dataTracer('/openapi/v1/0/query/table', { body: JSON.stringify(mergeDsl) })
        .then(res => res.json())
        .then(response => {
            if (200 !== response['code']) {
                throw queryType + " result is not ok, code: " + response['code'] + ", message: " + response['message'];
            }
            result = response['data']['result']

            if ('SUCCESS' !== result['result_status']) {
                throw queryType + " result item is not ok, status: " + result['result_status'];
            }
            console.log(queryType + ' success.')
        })
        .catch(error => console.error(queryType + ' error:', error));
}

function testQuery() {
    ak = "xxx"
    sk = "xxx"
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

// testEvent();
// testFunnel();
// testLifecycle();
// testPathFind();
// testRetention();
// testWeb();
// testTopk();
// testGet()
// testTracerTable();
testQuery()