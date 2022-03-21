class DSL {
    constructor() {
        this.version = 3.0
        this.useAppCloudId = true
        this.appIds = []
        this.periods = []
        this.content = undefined;
        this.contents = undefined;
        this.option = undefined;
    }

    static builder(queryType = undefined) {
        return new DSLBuilder(new DSL(), queryType);
    }

    static eventBuilder() {
        return DSL.builder('event');
    }

    static funnelBuilder() {
        return DSL.builder('funnel');
    }

    static lifecycleBuilder() {
        return DSL.builder('life_cycle');
    }

    static pathfindBuilder() {
        return DSL.builder('path_find');
    }

    static retentionBuilder() {
        return DSL.builder('retention');
    }

    static webBuilder() {
        return DSL.builder('web_session');
    }

    static confidenceBuilder() {
        return DSL.builder('confidence');
    }

    static topkBuilder() {
        return DSL.builder('event_topk');
    }

    static advertiseBuilder() {
        return DSL.builder('advertise');
    }

}

function stringExpr(name, operation, values, type = 'profile') {
    return _expr('string', name, operation, values, type);
}

function emptyExpr(name, operation, values, type = 'profile') {
    return Filter.builder();
}

function intExpr(name, operation, values, type = 'profile') {
    return _expr('int', name, operation, values, type);
}

function _expr(valueType, name, operation, values, type = 'profile') {
    return Filter.builder().conditions(new Condition(valueType, name, operation, values, type));
}

function show(label, name) {
    return Query.builder().showLabel(label).showName(name);
}

function merge(params, ...dsls) {
    let mergeDSL = undefined;
    dsls.forEach(dsl => {
        if (!mergeDSL) {
            mergeDSL = JSON.parse(JSON.stringify(dsl));
            mergeDSL.contents = []
            mergeDSL.contents.push(mergeDSL.content)
            mergeDSL.content = undefined
        } else {
            mergeDSL.contents.push(dsl.content)
        }
    })
    if (params) {
        mergeDSL.option = {}
        for (const key of Object.keys(params)) {
            mergeDSL.option[key] = params[key];
        }
    }
    return mergeDSL;
}

function blend(base, ...dsls) {
    mergeDSL = merge({ 'blend': { 'base': base, 'status': true } }, ...dsls);
    return mergeDSL;
}

class DSLBuilder {
    constructor(dsl, queryType = undefined) {
        this.dsl = dsl;
        this._queryType = queryType;
        this.contentBuilder = Content.builder();

        this.contentBuilder.queryType(queryType);
        // 留存的optmized 是true
        this.queryType(queryType);
    }

    queryType(queryType) {
        this.contentBuilder.queryType(queryType);
        // 留存的optmized 是true
        if ('funnel' === queryType) {
            this.contentBuilder.option('optmized', true);
        } else if ('path_find' === queryType) {
            this.contentBuilder.option('optmized', false);
        }
    }

    appId(...appIds) {
        appIds.forEach(appId => {
            this.dsl.appIds.push(appId);
        })
        return this;
    }

    rangePeriod(granularity, start, end, realTime = false) {
        let period = { 'type': 'range', 'granularity': granularity, 'range': [start, end] };
        if (realTime) {
            period['realTime'] = true;
        }
        this.dsl.periods.push(period);
        return this;
    }

    lastPeriod(granularity, amount, unit, realTime = false) {
        let period = { 'type': 'last', 'granularity': granularity, 'last': { 'amount': amount, 'unit': unit } };
        if (realTime) {
            period['realTime'] = true;
        }
        this.dsl.periods.push(period);
        return this;
    }

    todayPeriod(granularity, realTime = false) {
        let period = { 'type': 'today', 'granularity': granularity };
        if (realTime) {
            period['realTime'] = true;
        }
        this.dsl.periods.push(period);
        return this;
    }

    group(...groups) {
        groups.forEach(group => {
            this.contentBuilder.profileGroups(group);
        })
        return this;
    }

    order(order, direction = 'asc') {
        if (order instanceof Array) {
            this.contentBuilder.orders(order)
        } else {
            this.contentBuilder.orders({ 'field': order, 'direction': direction });
        }
        return this;
    }

    page(limit, offset) {
        this.contentBuilder.page(limit, offset);
        return this;
    }

    limit(limit){
        this.contentBuilder.limit(limit);
        return this;
    }

    offset(offset){
        this.contentBuilder.offset(offset);
        return this;
    }

    skipCache(skpCache) {
        this.contentBuilder.option('skipCache', skpCache);
        return this;
    }

    isStack(isStack) {
        this.contentBuilder.option('isStack', isStack);
        return this;
    }

    optmized(optmized) {
        this.contentBuilder.option('optmized', optmized);
        return this;
    }

    window(granularity, interval) {
        if ('life_cycle' === this._queryType) {
            this._lifecycle(granularity, interval);
        } else if ('retention' === this._queryType) {
            this._retention(granularity, interval);
        } else {
            this.contentBuilder.option('windowPeriodType', granularity);
            this.contentBuilder.option('windowPeriod', interval);
        }
        return this;
    }

    _lifecycle(granularity, interval, type = 'stickiness') {
        this.contentBuilder.option('lifecycleQueryTpe', type);
        this.contentBuilder.option('lifecyclePeriod', { 'granularity': granularity, 'period': interval });
        return this;
    }

    _retention(granularity, interval) {
        this.contentBuilder.option('retentionType', granularity);
        this.contentBuilder.option('retentionNDays', interval);
        return this;
    }

    web(type, timeout) {
        this.contentBuilder.option('webSessionParams', { 'sessionParamsType': type, 'sessionTimeout': timeout });
        return this;
    }

    product(product) {
        this.contentBuilder.option('product', product);
        return this;
    }

    advertise(timeout, aliasConvert, groupBy) {
        this.contentBuilder.option('timeout', timeout);
        this.contentBuilder.option('aliasConvert', aliasConvert);
        this.contentBuilder.option('blendParams', { 'groupBy': groupBy });
        return this;
    }

    option(option) {
        for (const key of Object.keys(option)) {
            this.contentBuilder.showOption(key, option[key]);
        }
        return this;
    }

    tag(tag) {
        for (const key of Object.keys(tag)) {
            this.contentBuilder.showOption(key, tag[key]);
        }
        return this;
    }

    andProfileFilter(expBuilder) {
        this.contentBuilder.profileFilter(expBuilder.logic('and').build());
        return this;
    }

    orProfileFilter(expBuilder) {
        this.contentBuilder.profileFilter(expBuilder.logic('or').build());
        return this;
    }

    query(...queryBuilders) {
        let query = [];
        queryBuilders.forEach(qb => {
            query.push(qb.build())
        })
        this.contentBuilder.query(query);
        return this;
    }

    periods(periods) {
        this.dsl.periods = periods;
        return this;
    }

    build() {
        this.dsl.content = this.contentBuilder.build()
        return keysToSnake(this.dsl);
    }
}

function isObject(o) {
    return o === Object(o) && !(o instanceof Array) && typeof o !== 'function';
};

function keysToSnake(o) {
    if (isObject(o)) {
        const n = {};

        Object.keys(o)
            .forEach((k) => {
                n[camelToSake(k)] = keysToSnake(o[k]);
            });

        return n;
    } else if (o instanceof Array) {
        return o.map((i) => {
            return keysToSnake(i);
        });
    }

    return o;
};

function camelToSake(string) {
    // return string.replace(/[\w]([A-Z])/g, function (m) {
    //     return m[0] + "_" + m[1];
    // }).toLowerCase();
    return string.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

class Content {
    constructor() {
        this.queryType = undefined;
        this.profileFilters = [];
        this.profileGroups = [];
        this.orders = [];
        this.page = undefined;
        this.page = undefined;
        this.option = undefined;
        this.showOption = undefined;
        this.queries = [];
    }

    static builder() {
        return new ContentBuilder(new Content());
    }
}

class ContentBuilder {
    constructor(content) {
        this.content = content;
    }

    queryType(queryType) {
        this.content.queryType = queryType;
        return this;
    }

    profileFilter(profileFilter) {
        this.content.profileFilters.push(profileFilter);
        return this;
    }

    profileGroups(profileGroups) {
        if (profileGroups instanceof Array) {
            this.content.profileGroups.push(...profileGroups);
        } else {
            this.content.profileGroups.push(profileGroups);
        }
        return this;
    }

    orders(orders) {
        if (orders instanceof Array) {
            orders.forEach(order => {
                if (typeof order === 'object') {
                    this.content.orders.push(order);
                } else if (typeof order === 'string') {
                    this.content.orders.push({ 'field': order, 'direction': 'asc' });
                }
            })
        } else {
            this.content.orders.push(orders);
        }
        return this;
    }

    page(limit, offset) {
        if (this.content.page === undefined) {
            this.content.page = {};
        }
        this.content.page['limit'] = limit;
        this.content.page['offset'] = offset;
        return this;
    }

    limit(limit) {
        if (this.content.page === undefined) {
            this.content.page = {};
        }
        this.content.page['limit'] = limit;
        return this;
    }

    offset(offset) {
        if (this.content.page === undefined) {
            this.content.page = {};
        }
        this.content.page['offset'] = offset;
        return this;
    }

    option(key, value) {
        if (this.content.option === undefined) {
            this.content.option = {}
        }
        this.content.option[key] = value
        return this;
    }

    showOption(key, value) {
        if (this.content.showOption === undefined) {
            this.content.showOption = {};
        }
        this.content.showOption[key] = value;
        return this;
    }

    query(query) {
        this.content.queries.push(query);
        return this;
    }

    build() {
        return this.content;
    }
}

class Query {
    constructor() {
        this.samplePercent = undefined;
        this.showName = undefined;
        this.showLabel = undefined;
        this.eventId = undefined;
        this.eventType = undefined;
        this.eventName = undefined;
        this.eventIndicator = undefined;
        this.measureInfo = undefined;
        this.filters = [];
        this.groups = [];
    }

    static builder() {
        return new QueryBuilder(new Query());
    }
}

class QueryBuilder {
    constructor(query) {
        this.query = query
    }

    sample(samplePercent = 100) {
        this.query.samplePercent = samplePercent;
        return this;
    }

    showName(showName) {
        this.query.showName = showName
        return this;
    }

    showLabel(showLabel) {
        this.query.showLabel = showLabel;
        return this;
    }

    event(eventType, eventName, eventIndicator = undefined, eventId = undefined) {
        this.query.eventType = eventType;
        this.query.eventName = eventName;
        this.query.eventIndicator = eventIndicator;
        this.query.eventId = eventId;
        return this;
    }

    measureInfo(measureType, propertyName, measureValue) {
        this.query.measureInfo = { 'measureType': measureType, 'propertyName': propertyName, 'measureValue': measureValue };
        return this;
    }

    andFilter(expBuilder) {
        this.query.filters.push(expBuilder.logic('and').build());
        return this;
    }

    orFilter(expBuilder) {
        this.query.filters.push(expBuilder.logic('or').build());
        return this;
    }

    group(group) {
        if (group instanceof Array) {
            this.query.groups.push(...group);
        } else {
            this.query.groups.push(group);
        }
        return this;
    }

    build() {
        return this.query
    }
}

class Filter {
    constructor() {
        this.showName = undefined;
        this.showLabel = undefined;
        this.expression = { 'logic': undefined, 'conditions': [] };
    }

    static builder() {
        return new FilterBuilder(new Filter());
    }
}

class FilterBuilder {
    constructor(filter) {
        this.filter = filter
    }

    showName(showName) {
        this.filter.showName = showName;
        return this;
    }

    showLabel(showLabel) {
        this.filter.showLabel = showLabel;
        return this;
    }

    show(showLabel, showName) {
        return this.showLabel(showLabel).showName(showName);
    }

    logic(logic) {
        this.filter.expression['logic'] = logic;
        return this;
    }

    conditions(conditions) {
        if (conditions instanceof Array) {
            this.filter.expression['conditions'].push(...conditions);
        } else {
            this.filter.expression['conditions'].push(conditions);
        }
        return this;
    }

    stringExpr(name, operation, values, type = 'profile') {
        return this.conditions(new Condition('string', name, operation, values, type));
    }

    intExpr(name, operation, values, type = 'profile') {
        return this.conditions(new Condition('string', name, operation, values, type));
    }

    build() {
        return this.filter;
    }
}

class Condition {
    constructor(valueType, name, operation, values, type) {
        this.propertyValueType = valueType;
        this.propertyName = name;
        this.propertyOperation = operation;
        this.propertyValues = [];
        if (values instanceof Array) {
            this.propertyValues.push(...values)
        } else {
            this.propertyValues.push(values)
        }
        this.propertyType = type;
    }
}

module.exports = { DSL, intExpr, stringExpr, emptyExpr, show, merge, blend };