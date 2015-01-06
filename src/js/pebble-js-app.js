var http = function() {
    return {
        get: get,
        post: post
    };
    function get(url, query, callback) {
        var req = new XMLHttpRequest();
        url += "?" + serialize(query);
        req.open("GET", url, true);
        req.setRequestHeader("X-Pebble-ID", Pebble.getAccountToken());
        req.onload = function() {
            if (req.readyState === 4 && req.status === 200) {
                if (req.status === 200) {
                    try {
                        var response = JSON.parse(req.responseText);
                        return callback(null, response);
                    } catch (ex) {
                        return callback(ex);
                    }
                }
            } else {
                return callback(new Error(req.status));
            }
        };
        req.onerror = function() {
            switch (req.status) {
              case 0:
                return callback(new Error("NOT_CONNECTED"));

              case 404:
                return callback(new Error("NOT_FOUND"));

              default:
                return callback(new Error("UNKNOWN_ERROR_" + req.status));
            }
        };
        req.send();
        function serialize(obj) {
            var str = [];
            for (var p in obj) {
                if (obj.hasOwnProperty(p)) {
                    str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
                }
            }
            return str.join("&");
        }
    }
    function post(url, body, callback) {
        var req = new XMLHttpRequest();
        req.open("POST", url, true);
        req.setRequestHeader("Content-Type", "application/json");
        req.setRequestHeader("X-Pebble-ID", Pebble.getAccountToken());
        req.onload = function() {
            if ([ 200, 201 ].indexOf(req.status) !== -1) {
                var response = JSON.parse(req.responseText);
                return callback(null, response);
            } else {
                return callback(new Error(req.status), req.responseText);
            }
        };
        req.onerror = function() {
            switch (req.status) {
              case 0:
                return callback(new Error("NOT_CONNECTED"));

              case 404:
                return callback(new Error("NOT_FOUND"));

              default:
                return callback(new Error("UNKNOWN_ERROR_" + req.status));
            }
        };
        req.send(body);
    }
}();

var Keen = function() {
    var _http = null;
    var _pebble = null;
    var _config = null;
    var _appinfo = null;
    return {
        init: init,
        sendEvent: sendEvent
    };
    function init(http, Pebble, config, appinfo, debug) {
        _http = http;
        _pebble = Pebble;
        _config = config;
        _appinfo = appinfo;
        _debug = debug;
    }
    function sendEvent(name, data) {
        if (!data) {
            data = {};
        }
        data.app = {
            name: _appinfo.shortName,
            version: _appinfo.versionLabel,
            uuid: _appinfo.uuid
        };
        data.user = {
            accountToken: _pebble.getAccountToken()
        };
        var url = "https://api.keen.io/3.0/projects/" + _config.projectId + "/events/" + name + "?api_key=" + _config.writeKey;
        if (_debug) {
            log(url);
            log(JSON.stringify(data));
            return;
        }
        _http.post(url, JSON.stringify(data), function(err, response) {
            if (err) {}
            if (!response.created) {}
        });
    }
    function log() {
        var pieces = [ "UK Transport", this.version, "Keen" ];
        pieces = pieces.concat(Array.prototype.slice.call(arguments));
        console.log(pieces.join(" // "));
    }
}();

var MessageQueue = function() {
    var RETRY_MAX = 5;
    var queue = [];
    var sending = false;
    var timer = null;
    return {
        reset: reset,
        sendAppMessage: sendAppMessage,
        size: size
    };
    function reset() {
        queue = [];
        sending = false;
    }
    function sendAppMessage(message, ack, nack) {
        if (!isValidMessage(message)) {
            return false;
        }
        queue.push({
            message: message,
            ack: ack || null,
            nack: nack || null,
            attempts: 0
        });
        setTimeout(function() {
            sendNextMessage();
        }, 1);
        return true;
    }
    function size() {
        return queue.length;
    }
    function isValidMessage(message) {
        if (message !== Object(message)) {
            return false;
        }
        var keys = Object.keys(message);
        if (!keys.length) {
            return false;
        }
        for (var k = 0; k < keys.length; k += 1) {
            var validKey = /^[0-9a-zA-Z-_]*$/.test(keys[k]);
            if (!validKey) {
                return false;
            }
            var value = message[keys[k]];
            if (!validValue(value)) {
                return false;
            }
        }
        return true;
        function validValue(value) {
            switch (typeof value) {
              case "string":
                return true;

              case "number":
                return true;

              case "object":
                if (toString.call(value) == "[object Array]") {
                    return true;
                }
            }
            return false;
        }
    }
    function sendNextMessage() {
        if (sending) {
            return;
        }
        var message = queue.shift();
        if (!message) {
            return;
        }
        message.attempts += 1;
        sending = true;
        Pebble.sendAppMessage(message.message, ack, nack);
        timer = setTimeout(function() {
            timeout();
        }, 1e3);
        function ack() {
            clearTimeout(timer);
            setTimeout(function() {
                sending = false;
                sendNextMessage();
            }, 200);
            if (message.ack) {
                message.ack.apply(null, arguments);
            }
        }
        function nack() {
            clearTimeout(timer);
            if (message.attempts < RETRY_MAX) {
                queue.unshift(message);
                setTimeout(function() {
                    sending = false;
                    sendNextMessage();
                }, 200 * message.attempts);
            } else {
                if (message.nack) {
                    message.nack.apply(null, arguments);
                }
            }
        }
        function timeout() {
            setTimeout(function() {
                sending = false;
                sendNextMessage();
            }, 1e3);
            if (message.ack) {
                message.ack.apply(null, arguments);
            }
        }
    }
}();

(function(window, undefined) {
    var TraceKit = {};
    var _oldTraceKit = window.TraceKit;
    var _slice = [].slice;
    var UNKNOWN_FUNCTION = "?";
    function _has(object, key) {
        return Object.prototype.hasOwnProperty.call(object, key);
    }
    function _isUndefined(what) {
        return typeof what === "undefined";
    }
    TraceKit.noConflict = function noConflict() {
        window.TraceKit = _oldTraceKit;
        return TraceKit;
    };
    TraceKit.wrap = function traceKitWrapper(func) {
        function wrapped() {
            try {
                return func.apply(this, arguments);
            } catch (e) {
                TraceKit.report(e);
                throw e;
            }
        }
        return wrapped;
    };
    TraceKit.report = function reportModuleWrapper() {
        var handlers = [], lastException = null, lastExceptionStack = null;
        function subscribe(handler) {
            installGlobalHandler();
            handlers.push(handler);
        }
        function unsubscribe(handler) {
            for (var i = handlers.length - 1; i >= 0; --i) {
                if (handlers[i] === handler) {
                    handlers.splice(i, 1);
                }
            }
        }
        function notifyHandlers(stack, windowError) {
            var exception = null;
            if (windowError && !TraceKit.collectWindowErrors) {
                return;
            }
            for (var i in handlers) {
                if (_has(handlers, i)) {
                    try {
                        handlers[i].apply(null, [ stack ].concat(_slice.call(arguments, 2)));
                    } catch (inner) {
                        exception = inner;
                    }
                }
            }
            if (exception) {
                throw exception;
            }
        }
        var _oldOnerrorHandler, _onErrorHandlerInstalled;
        function traceKitWindowOnError(message, url, lineNo, columnNo, errorObj) {
            var stack = null;
            if (errorObj) {
                stack = TraceKit.computeStackTrace(errorObj);
            } else {
                if (lastExceptionStack) {
                    TraceKit.computeStackTrace.augmentStackTraceWithInitialElement(lastExceptionStack, url, lineNo, message);
                    stack = lastExceptionStack;
                    lastExceptionStack = null;
                    lastException = null;
                } else {
                    var location = {
                        url: url,
                        line: lineNo,
                        column: columnNo
                    };
                    location.func = TraceKit.computeStackTrace.guessFunctionName(location.url, location.line);
                    location.context = TraceKit.computeStackTrace.gatherContext(location.url, location.line);
                    stack = {
                        mode: "onerror",
                        message: message,
                        url: document.location.href,
                        stack: [ location ],
                        useragent: navigator.userAgent
                    };
                }
            }
            notifyHandlers(stack, "from window.onerror");
            if (_oldOnerrorHandler) {
                return _oldOnerrorHandler.apply(this, arguments);
            }
            return false;
        }
        function installGlobalHandler() {
            if (_onErrorHandlerInstalled === true) {
                return;
            }
            _oldOnerrorHandler = window.onerror;
            window.onerror = traceKitWindowOnError;
            _onErrorHandlerInstalled = true;
        }
        function report(ex) {
            var args = _slice.call(arguments, 1);
            if (lastExceptionStack) {
                if (lastException === ex) {
                    return;
                } else {
                    var s = lastExceptionStack;
                    lastExceptionStack = null;
                    lastException = null;
                    notifyHandlers.apply(null, [ s, null ].concat(args));
                }
            }
            var stack = TraceKit.computeStackTrace(ex);
            lastExceptionStack = stack;
            lastException = ex;
            window.setTimeout(function() {
                if (lastException === ex) {
                    lastExceptionStack = null;
                    lastException = null;
                    notifyHandlers.apply(null, [ stack, null ].concat(args));
                }
            }, stack.incomplete ? 2e3 : 0);
            throw ex;
        }
        report.subscribe = subscribe;
        report.unsubscribe = unsubscribe;
        return report;
    }();
    TraceKit.computeStackTrace = function computeStackTraceWrapper() {
        var debug = false, sourceCache = {};
        function loadSource(url) {
            if (!TraceKit.remoteFetching) {
                return "";
            }
            try {
                var getXHR = function() {
                    try {
                        return new window.XMLHttpRequest();
                    } catch (e) {
                        return new window.ActiveXObject("Microsoft.XMLHTTP");
                    }
                };
                var request = getXHR();
                request.open("GET", url, false);
                request.send("");
                return request.responseText;
            } catch (e) {
                return "";
            }
        }
        function getSource(url) {
            if (!_has(sourceCache, url)) {
                var source = "";
                url = url || "";
                if (url.indexOf && url.indexOf(document.domain) !== -1) {
                    source = loadSource(url);
                }
                sourceCache[url] = source ? source.split("\n") : [];
            }
            return sourceCache[url];
        }
        function guessFunctionName(url, lineNo) {
            var reFunctionArgNames = /function ([^(]*)\(([^)]*)\)/, reGuessFunction = /['"]?([0-9A-Za-z$_]+)['"]?\s*[:=]\s*(function|eval|new Function)/, line = "", maxLines = 10, source = getSource(url), m;
            if (!source.length) {
                return UNKNOWN_FUNCTION;
            }
            for (var i = 0; i < maxLines; ++i) {
                line = source[lineNo - i] + line;
                if (!_isUndefined(line)) {
                    if (m = reGuessFunction.exec(line)) {
                        return m[1];
                    } else if (m = reFunctionArgNames.exec(line)) {
                        return m[1];
                    }
                }
            }
            return UNKNOWN_FUNCTION;
        }
        function gatherContext(url, line) {
            var source = getSource(url);
            if (!source.length) {
                return null;
            }
            var context = [], linesBefore = Math.floor(TraceKit.linesOfContext / 2), linesAfter = linesBefore + TraceKit.linesOfContext % 2, start = Math.max(0, line - linesBefore - 1), end = Math.min(source.length, line + linesAfter - 1);
            line -= 1;
            for (var i = start; i < end; ++i) {
                if (!_isUndefined(source[i])) {
                    context.push(source[i]);
                }
            }
            return context.length > 0 ? context : null;
        }
        function escapeRegExp(text) {
            return text.replace(/[\-\[\]{}()*+?.,\\\^$|#]/g, "\\$&");
        }
        function escapeCodeAsRegExpForMatchingInsideHTML(body) {
            return escapeRegExp(body).replace("<", "(?:<|&lt;)").replace(">", "(?:>|&gt;)").replace("&", "(?:&|&amp;)").replace('"', '(?:"|&quot;)').replace(/\s+/g, "\\s+");
        }
        function findSourceInUrls(re, urls) {
            var source, m;
            for (var i = 0, j = urls.length; i < j; ++i) {
                if ((source = getSource(urls[i])).length) {
                    source = source.join("\n");
                    if (m = re.exec(source)) {
                        return {
                            url: urls[i],
                            line: source.substring(0, m.index).split("\n").length,
                            column: m.index - source.lastIndexOf("\n", m.index) - 1
                        };
                    }
                }
            }
            return null;
        }
        function findSourceInLine(fragment, url, line) {
            var source = getSource(url), re = new RegExp("\\b" + escapeRegExp(fragment) + "\\b"), m;
            line -= 1;
            if (source && source.length > line && (m = re.exec(source[line]))) {
                return m.index;
            }
            return null;
        }
        function findSourceByFunctionBody(func) {
            var urls = [ window.location.href ], scripts = document.getElementsByTagName("script"), body, code = "" + func, codeRE = /^function(?:\s+([\w$]+))?\s*\(([\w\s,]*)\)\s*\{\s*(\S[\s\S]*\S)\s*\}\s*$/, eventRE = /^function on([\w$]+)\s*\(event\)\s*\{\s*(\S[\s\S]*\S)\s*\}\s*$/, re, parts, result;
            for (var i = 0; i < scripts.length; ++i) {
                var script = scripts[i];
                if (script.src) {
                    urls.push(script.src);
                }
            }
            if (!(parts = codeRE.exec(code))) {
                re = new RegExp(escapeRegExp(code).replace(/\s+/g, "\\s+"));
            } else {
                var name = parts[1] ? "\\s+" + parts[1] : "", args = parts[2].split(",").join("\\s*,\\s*");
                body = escapeRegExp(parts[3]).replace(/;$/, ";?");
                re = new RegExp("function" + name + "\\s*\\(\\s*" + args + "\\s*\\)\\s*{\\s*" + body + "\\s*}");
            }
            if (result = findSourceInUrls(re, urls)) {
                return result;
            }
            if (parts = eventRE.exec(code)) {
                var event = parts[1];
                body = escapeCodeAsRegExpForMatchingInsideHTML(parts[2]);
                re = new RegExp("on" + event + "=[\\'\"]\\s*" + body + "\\s*[\\'\"]", "i");
                if (result = findSourceInUrls(re, urls[0])) {
                    return result;
                }
                re = new RegExp(body);
                if (result = findSourceInUrls(re, urls)) {
                    return result;
                }
            }
            return null;
        }
        function computeStackTraceFromStackProp(ex) {
            if (!ex.stack) {
                return null;
            }
            var chrome = /^\s*at (?:((?:\[object object\])?\S+(?: \[as \S+\])?) )?\(?((?:file|http|https|chrome-extension):.*?):(\d+)(?::(\d+))?\)?\s*$/i, gecko = /^\s*(\S*)(?:\((.*?)\))?@?((?:file|http|https):.*?):(\d+)(?::(\d+))?\s*$/i, winjs = /^\s*at (?:((?:\[object object\])?.+) )?\(?((?:ms-appx|http|https):.*?):(\d+)(?::(\d+))?\)?\s*$/i, lines = ex.stack.split("\n"), stack = [], parts, element, reference = /^(.*) is undefined$/.exec(ex.message);
            for (var i = 0, j = lines.length; i < j; ++i) {
                if (parts = gecko.exec(lines[i])) {
                    element = {
                        url: parts[3],
                        func: parts[1] || UNKNOWN_FUNCTION,
                        args: parts[2] ? parts[2].split(",") : "",
                        line: +parts[4],
                        column: parts[5] ? +parts[5] : null
                    };
                } else if (parts = chrome.exec(lines[i])) {
                    element = {
                        url: parts[2],
                        func: parts[1] || UNKNOWN_FUNCTION,
                        line: +parts[3],
                        column: parts[4] ? +parts[4] : null
                    };
                } else if (parts = winjs.exec(lines[i])) {
                    element = {
                        url: parts[2],
                        func: parts[1] || UNKNOWN_FUNCTION,
                        line: +parts[3],
                        column: parts[4] ? +parts[4] : null
                    };
                } else {
                    continue;
                }
                if (!element.func && element.line) {
                    element.func = guessFunctionName(element.url, element.line);
                }
                if (element.line) {
                    element.context = gatherContext(element.url, element.line);
                }
                stack.push(element);
            }
            if (stack[0] && stack[0].line && !stack[0].column && reference) {
                stack[0].column = findSourceInLine(reference[1], stack[0].url, stack[0].line);
            }
            if (!stack.length) {
                return null;
            }
            return {
                mode: "stack",
                name: ex.name,
                message: ex.message,
                url: document.location.href,
                stack: stack,
                useragent: navigator.userAgent
            };
        }
        function computeStackTraceFromStacktraceProp(ex) {
            var stacktrace = ex.stacktrace;
            var testRE = / line (\d+), column (\d+) in (?:<anonymous function: ([^>]+)>|([^\)]+))\((.*)\) in (.*):\s*$/i, lines = stacktrace.split("\n"), stack = [], parts;
            for (var i = 0, j = lines.length; i < j; i += 2) {
                if (parts = testRE.exec(lines[i])) {
                    var element = {
                        line: +parts[1],
                        column: +parts[2],
                        func: parts[3] || parts[4],
                        args: parts[5] ? parts[5].split(",") : [],
                        url: parts[6]
                    };
                    if (!element.func && element.line) {
                        element.func = guessFunctionName(element.url, element.line);
                    }
                    if (element.line) {
                        try {
                            element.context = gatherContext(element.url, element.line);
                        } catch (exc) {}
                    }
                    if (!element.context) {
                        element.context = [ lines[i + 1] ];
                    }
                    stack.push(element);
                }
            }
            if (!stack.length) {
                return null;
            }
            return {
                mode: "stacktrace",
                name: ex.name,
                message: ex.message,
                url: document.location.href,
                stack: stack,
                useragent: navigator.userAgent
            };
        }
        function computeStackTraceFromOperaMultiLineMessage(ex) {
            var lines = ex.message.split("\n");
            if (lines.length < 4) {
                return null;
            }
            var lineRE1 = /^\s*Line (\d+) of linked script ((?:file|http|https)\S+)(?:: in function (\S+))?\s*$/i, lineRE2 = /^\s*Line (\d+) of inline#(\d+) script in ((?:file|http|https)\S+)(?:: in function (\S+))?\s*$/i, lineRE3 = /^\s*Line (\d+) of function script\s*$/i, stack = [], scripts = document.getElementsByTagName("script"), inlineScriptBlocks = [], parts, i, len, source;
            for (i in scripts) {
                if (_has(scripts, i) && !scripts[i].src) {
                    inlineScriptBlocks.push(scripts[i]);
                }
            }
            for (i = 2, len = lines.length; i < len; i += 2) {
                var item = null;
                if (parts = lineRE1.exec(lines[i])) {
                    item = {
                        url: parts[2],
                        func: parts[3],
                        line: +parts[1]
                    };
                } else if (parts = lineRE2.exec(lines[i])) {
                    item = {
                        url: parts[3],
                        func: parts[4]
                    };
                    var relativeLine = +parts[1];
                    var script = inlineScriptBlocks[parts[2] - 1];
                    if (script) {
                        source = getSource(item.url);
                        if (source) {
                            source = source.join("\n");
                            var pos = source.indexOf(script.innerText);
                            if (pos >= 0) {
                                item.line = relativeLine + source.substring(0, pos).split("\n").length;
                            }
                        }
                    }
                } else if (parts = lineRE3.exec(lines[i])) {
                    var url = window.location.href.replace(/#.*$/, ""), line = parts[1];
                    var re = new RegExp(escapeCodeAsRegExpForMatchingInsideHTML(lines[i + 1]));
                    source = findSourceInUrls(re, [ url ]);
                    item = {
                        url: url,
                        line: source ? source.line : line,
                        func: ""
                    };
                }
                if (item) {
                    if (!item.func) {
                        item.func = guessFunctionName(item.url, item.line);
                    }
                    var context = gatherContext(item.url, item.line);
                    var midline = context ? context[Math.floor(context.length / 2)] : null;
                    if (context && midline.replace(/^\s*/, "") === lines[i + 1].replace(/^\s*/, "")) {
                        item.context = context;
                    } else {
                        item.context = [ lines[i + 1] ];
                    }
                    stack.push(item);
                }
            }
            if (!stack.length) {
                return null;
            }
            return {
                mode: "multiline",
                name: ex.name,
                message: lines[0],
                url: document.location.href,
                stack: stack,
                useragent: navigator.userAgent
            };
        }
        function augmentStackTraceWithInitialElement(stackInfo, url, lineNo, message) {
            var initial = {
                url: url,
                line: lineNo
            };
            if (initial.url && initial.line) {
                stackInfo.incomplete = false;
                if (!initial.func) {
                    initial.func = guessFunctionName(initial.url, initial.line);
                }
                if (!initial.context) {
                    initial.context = gatherContext(initial.url, initial.line);
                }
                var reference = / '([^']+)' /.exec(message);
                if (reference) {
                    initial.column = findSourceInLine(reference[1], initial.url, initial.line);
                }
                if (stackInfo.stack.length > 0) {
                    if (stackInfo.stack[0].url === initial.url) {
                        if (stackInfo.stack[0].line === initial.line) {
                            return false;
                        } else if (!stackInfo.stack[0].line && stackInfo.stack[0].func === initial.func) {
                            stackInfo.stack[0].line = initial.line;
                            stackInfo.stack[0].context = initial.context;
                            return false;
                        }
                    }
                }
                stackInfo.stack.unshift(initial);
                stackInfo.partial = true;
                return true;
            } else {
                stackInfo.incomplete = true;
            }
            return false;
        }
        function computeStackTraceByWalkingCallerChain(ex, depth) {
            var functionName = /function\s+([_$a-zA-Z\xA0-\uFFFF][_$a-zA-Z0-9\xA0-\uFFFF]*)?\s*\(/i, stack = [], funcs = {}, recursion = false, parts, item, source;
            for (var curr = computeStackTraceByWalkingCallerChain.caller; curr && !recursion; curr = curr.caller) {
                if (curr === computeStackTrace || curr === TraceKit.report) {
                    continue;
                }
                item = {
                    url: null,
                    func: UNKNOWN_FUNCTION,
                    line: null,
                    column: null
                };
                if (curr.name) {
                    item.func = curr.name;
                } else if (parts = functionName.exec(curr.toString())) {
                    item.func = parts[1];
                }
                if (source = findSourceByFunctionBody(curr)) {
                    item.url = source.url;
                    item.line = source.line;
                    if (item.func === UNKNOWN_FUNCTION) {
                        item.func = guessFunctionName(item.url, item.line);
                    }
                    var reference = / '([^']+)' /.exec(ex.message || ex.description);
                    if (reference) {
                        item.column = findSourceInLine(reference[1], source.url, source.line);
                    }
                }
                if (funcs["" + curr]) {
                    recursion = true;
                } else {
                    funcs["" + curr] = true;
                }
                stack.push(item);
            }
            if (depth) {
                stack.splice(0, depth);
            }
            var result = {
                mode: "callers",
                name: ex.name,
                message: ex.message,
                url: document.location.href,
                stack: stack,
                useragent: navigator.userAgent
            };
            augmentStackTraceWithInitialElement(result, ex.sourceURL || ex.fileName, ex.line || ex.lineNumber, ex.message || ex.description);
            return result;
        }
        function computeStackTrace(ex, depth) {
            var stack = null;
            depth = depth == null ? 0 : +depth;
            try {
                stack = computeStackTraceFromStacktraceProp(ex);
                if (stack) {
                    return stack;
                }
            } catch (e) {
                if (debug) {
                    throw e;
                }
            }
            try {
                stack = computeStackTraceFromStackProp(ex);
                if (stack) {
                    return stack;
                }
            } catch (e) {
                if (debug) {
                    throw e;
                }
            }
            try {
                stack = computeStackTraceFromOperaMultiLineMessage(ex);
                if (stack) {
                    return stack;
                }
            } catch (e) {
                if (debug) {
                    throw e;
                }
            }
            try {
                stack = computeStackTraceByWalkingCallerChain(ex, depth + 1);
                if (stack) {
                    return stack;
                }
            } catch (e) {
                if (debug) {
                    throw e;
                }
            }
            return {
                mode: "failed"
            };
        }
        function computeStackTraceOfCaller(depth) {
            depth = (depth == null ? 0 : +depth) + 1;
            try {
                throw new Error();
            } catch (ex) {
                return computeStackTrace(ex, depth + 1);
            }
        }
        computeStackTrace.augmentStackTraceWithInitialElement = augmentStackTraceWithInitialElement;
        computeStackTrace.guessFunctionName = guessFunctionName;
        computeStackTrace.gatherContext = gatherContext;
        computeStackTrace.ofCaller = computeStackTraceOfCaller;
        return computeStackTrace;
    }();
    TraceKit.extendToAsynchronousCallbacks = function() {
        var _helper = function _helper(fnName) {
            var originalFn = window[fnName];
            window[fnName] = function traceKitAsyncExtension() {
                var args = _slice.call(arguments);
                var originalCallback = args[0];
                if (typeof originalCallback === "function") {
                    args[0] = TraceKit.wrap(originalCallback);
                }
                if (originalFn.apply) {
                    return originalFn.apply(this, args);
                } else {
                    return originalFn(args[0], args[1]);
                }
            };
        };
        _helper("setTimeout");
        _helper("setInterval");
    };
    if (!TraceKit.remoteFetching) {
        TraceKit.remoteFetching = true;
    }
    if (!TraceKit.collectWindowErrors) {
        TraceKit.collectWindowErrors = true;
    }
    if (!TraceKit.linesOfContext || TraceKit.linesOfContext < 1) {
        TraceKit.linesOfContext = 11;
    }
    window.TraceKit = TraceKit;
})(window);

(function traceKitAsyncForjQuery($, TraceKit) {
    "use strict";
    if (!$) {
        return;
    }
    var _oldEventAdd = $.event.add;
    $.event.add = function traceKitEventAdd(elem, types, handler, data, selector) {
        var _handler;
        if (handler.handler) {
            _handler = handler.handler;
            handler.handler = TraceKit.wrap(handler.handler);
        } else {
            _handler = handler;
            handler = TraceKit.wrap(handler);
        }
        if (_handler.guid) {
            handler.guid = _handler.guid;
        } else {
            handler.guid = _handler.guid = $.guid++;
        }
        return _oldEventAdd.call(this, elem, types, handler, data, selector);
    };
    var _oldReady = $.fn.ready;
    $.fn.ready = function traceKitjQueryReadyWrapper(fn) {
        return _oldReady.call(this, TraceKit.wrap(fn));
    };
    var _oldAjax = $.ajax;
    $.ajax = function traceKitAjaxWrapper(url, options) {
        if (typeof url === "object") {
            options = url;
            url = undefined;
        }
        options = options || {};
        var keys = [ "complete", "error", "success" ], key;
        while (key = keys.pop()) {
            if ($.isFunction(options[key])) {
                options[key] = TraceKit.wrap(options[key]);
            }
        }
        try {
            return url ? _oldAjax.call(this, url, options) : _oldAjax.call(this, options);
        } catch (e) {
            TraceKit.report(e);
            throw e;
        }
    };
})(window.jQuery, window.TraceKit);

(function(window, $, undefined) {
    var _traceKit = TraceKit.noConflict(), _raygun = window.Raygun, _raygunApiKey, _debugMode = false, _allowInsecureSubmissions = false, _ignoreAjaxAbort = false, _enableOfflineSave = false, _ignore3rdPartyErrors = false, _disableAnonymousUserTracking = false, _wrapAsynchronousCallbacks = true, _customData = {}, _tags = [], _user, _version, _filteredKeys, _whitelistedScriptDomains = [], _beforeSendCallback, _raygunApiUrl = "https://api.raygun.io", $document;
    if ($) {
        $document = $(document);
    }
    var Raygun = {
        noConflict: function() {
            window.Raygun = _raygun;
            return Raygun;
        },
        init: function(key, options, customdata) {
            _raygunApiKey = key;
            _traceKit.remoteFetching = false;
            _customData = customdata;
            if (options) {
                _allowInsecureSubmissions = options.allowInsecureSubmissions || false;
                _ignoreAjaxAbort = options.ignoreAjaxAbort || false;
                _disableAnonymousUserTracking = options.disableAnonymousUserTracking || false;
                if (typeof options.wrapAsynchronousCallbacks !== "undefined") {
                    _wrapAsynchronousCallbacks = options.wrapAsynchronousCallbacks;
                }
                if (options.debugMode) {
                    _debugMode = options.debugMode;
                }
                if (options.ignore3rdPartyErrors) {
                    _ignore3rdPartyErrors = true;
                }
            }
            sendSavedErrors();
            return Raygun;
        },
        withCustomData: function(customdata) {
            _customData = customdata;
            return Raygun;
        },
        withTags: function(tags) {
            _tags = tags;
            return Raygun;
        },
        attach: function() {
            if (!isApiKeyConfigured()) {
                return Raygun;
            }
            _traceKit.report.subscribe(processUnhandledException);
            if (_wrapAsynchronousCallbacks) {
                _traceKit.extendToAsynchronousCallbacks();
            }
            if ($document) {
                $document.ajaxError(processJQueryAjaxError);
            }
            return Raygun;
        },
        detach: function() {
            _traceKit.report.unsubscribe(processUnhandledException);
            if ($document) {
                $document.unbind("ajaxError", processJQueryAjaxError);
            }
            return Raygun;
        },
        send: function(ex, customData, tags) {
            try {
                processUnhandledException(_traceKit.computeStackTrace(ex), {
                    customData: typeof _customData === "function" ? merge(_customData(), customData) : merge(_customData, customData),
                    tags: mergeArray(_tags, tags)
                });
            } catch (traceKitException) {
                if (ex !== traceKitException) {
                    throw traceKitException;
                }
            }
            return Raygun;
        },
        setUser: function(user, isAnonymous, email, fullName, firstName, uuid) {
            _user = {
                Identifier: user
            };
            if (isAnonymous) {
                _user["IsAnonymous"] = isAnonymous;
            }
            if (email) {
                _user["Email"] = email;
            }
            if (fullName) {
                _user["FullName"] = fullName;
            }
            if (firstName) {
                _user["FirstName"] = firstName;
            }
            if (uuid) {
                _user["UUID"] = uuid;
            }
            return Raygun;
        },
        resetAnonymousUser: function() {
            _private.clearCookie("raygun4js-userid");
        },
        setVersion: function(version) {
            _version = version;
            return Raygun;
        },
        saveIfOffline: function(enableOffline) {
            if (typeof enableOffline !== "undefined" && typeof enableOffline === "boolean") {
                _enableOfflineSave = enableOffline;
            }
            return Raygun;
        },
        filterSensitiveData: function(filteredKeys) {
            _filteredKeys = filteredKeys;
            return Raygun;
        },
        whitelistCrossOriginDomains: function(whitelist) {
            _whitelistedScriptDomains = whitelist;
            return Raygun;
        },
        onBeforeSend: function(callback) {
            _beforeSendCallback = callback;
            return Raygun;
        }
    };
    var _private = Raygun._private = Raygun._private || {}, _seal = Raygun._seal = Raygun._seal || function() {
        delete Raygun._private;
        delete Raygun._seal;
        delete Raygun._unseal;
    }, _unseal = Raygun._unseal = Raygun._unseal || function() {
        Raygun._private = _private;
        Raygun._seal = _seal;
        Raygun._unseal = _unseal;
    };
    _private.getUuid = function() {
        function _p8(s) {
            var p = (Math.random().toString(16) + "000000000").substr(2, 8);
            return s ? "-" + p.substr(0, 4) + "-" + p.substr(4, 4) : p;
        }
        return _p8() + _p8(true) + _p8(true) + _p8();
    };
    _private.createCookie = function(name, value, hours) {
        var expires;
        if (hours) {
            var date = new Date();
            date.setTime(date.getTime() + hours * 60 * 60 * 1e3);
            expires = "; expires=" + date.toGMTString();
        } else {
            expires = "";
        }
        document.cookie = name + "=" + value + expires + "; path=/";
    };
    _private.readCookie = function(name) {
        var nameEQ = name + "=";
        var ca = document.cookie.split(";");
        for (var i = 0; i < ca.length; i++) {
            var c = ca[i];
            while (c.charAt(0) === " ") {
                c = c.substring(1, c.length);
            }
            if (c.indexOf(nameEQ) === 0) {
                return c.substring(nameEQ.length, c.length);
            }
        }
        return null;
    };
    _private.clearCookie = function(key) {
        _private.createCookie(key, "", -1);
    };
    _private.log = function(message, data) {
        if (window.console && window.console.log && _debugMode) {
            window.console.log(message);
            if (data) {
                window.console.log(data);
            }
        }
    };
    function truncateURL(url) {
        var truncated = url;
        var path = url.split("//")[1];
        if (path) {
            var queryStart = path.indexOf("?");
            var sanitizedPath = path.toString().substring(0, queryStart);
            var truncated_parts = sanitizedPath.split("/").slice(0, 4).join("/");
            var truncated_length = sanitizedPath.substring(0, 48);
            truncated = truncated_parts.length < truncated_length.length ? truncated_parts : truncated_length;
            if (truncated !== sanitizedPath) {
                truncated += "..";
            }
        }
        return truncated;
    }
    function processJQueryAjaxError(event, jqXHR, ajaxSettings, thrownError) {
        var message = "AJAX Error: " + (jqXHR.statusText || "unknown") + " " + (ajaxSettings.type || "unknown") + " " + (truncateURL(ajaxSettings.url) || "unknown");
        if (_ignoreAjaxAbort) {
            if (!jqXHR.getAllResponseHeaders()) {
                return;
            }
        }
        Raygun.send(thrownError || event.type, {
            status: jqXHR.status,
            statusText: jqXHR.statusText,
            type: ajaxSettings.type,
            url: ajaxSettings.url,
            ajaxErrorMessage: message,
            contentType: ajaxSettings.contentType,
            requestData: ajaxSettings.data && ajaxSettings.data.slice ? ajaxSettings.data.slice(0, 10240) : undefined,
            responseData: jqXHR.responseText && jqXHR.responseText.slice ? jqXHR.responseText.slice(0, 10240) : undefined
        });
    }
    function isApiKeyConfigured() {
        if (_raygunApiKey && _raygunApiKey !== "") {
            return true;
        }
        _private.log("Raygun API key has not been configured, make sure you call Raygun.init(yourApiKey)");
        return false;
    }
    function merge(o1, o2) {
        var a, o3 = {};
        for (a in o1) {
            o3[a] = o1[a];
        }
        for (a in o2) {
            o3[a] = o2[a];
        }
        return o3;
    }
    function mergeArray(t0, t1) {
        if (t1 != null) {
            return t0.concat(t1);
        }
        return t0;
    }
    function forEach(set, func) {
        for (var i = 0; i < set.length; i++) {
            func.call(null, i, set[i]);
        }
    }
    function isEmpty(o) {
        for (var p in o) {
            if (o.hasOwnProperty(p)) {
                return false;
            }
        }
        return true;
    }
    function getRandomInt() {
        return Math.floor(Math.random() * 9007199254740992);
    }
    function getViewPort() {
        var e = document.documentElement, g = document.getElementsByTagName("body")[0], x = window.innerWidth || e.clientWidth || g.clientWidth, y = window.innerHeight || e.clientHeight || g.clientHeight;
        return {
            width: x,
            height: y
        };
    }
    function offlineSave(data) {
        var dateTime = new Date().toJSON();
        try {
            var key = "raygunjs=" + dateTime + "=" + getRandomInt();
            if (typeof localStorage[key] === "undefined") {
                localStorage[key] = data;
            }
        } catch (e) {
            _private.log("Raygun4JS: LocalStorage full, cannot save exception");
        }
    }
    function localStorageAvailable() {
        try {
            return "localStorage" in window && window["localStorage"] !== null;
        } catch (e) {
            return false;
        }
    }
    function sendSavedErrors() {
        if (localStorageAvailable() && localStorage && localStorage.length > 0) {
            for (var key in localStorage) {
                if (key.substring(0, 9) === "raygunjs=") {
                    sendToRaygun(JSON.parse(localStorage[key]));
                    localStorage.removeItem(key);
                }
            }
        }
    }
    function ensureUser() {
        if (!_user && !_disableAnonymousUserTracking) {
            var userKey = "raygun4js-userid";
            var rgUserId = _private.readCookie(userKey);
            var anonymousUuid;
            if (!rgUserId) {
                anonymousUuid = _private.getUuid();
                _private.createCookie(userKey, anonymousUuid, 24 * 31);
            } else {
                anonymousUuid = rgUserId;
            }
            Raygun.setUser(anonymousUuid, true, null, null, null, anonymousUuid);
        }
    }
    function filterValue(key, value) {
        if (_filteredKeys) {
            if (Array.prototype.indexOf && _filteredKeys.indexOf === Array.prototype.indexOf) {
                if (_filteredKeys.indexOf(key) !== -1) {
                    return "[removed by filter]";
                }
            } else {
                for (var i = 0; i < _filteredKeys.length; i++) {
                    if (_filteredKeys[i] === key) {
                        return "[removed by filter]";
                    }
                }
            }
        }
        return value;
    }
    function filterObject(reference) {
        if (reference == null) {
            return reference;
        }
        if (Object.prototype.toString.call(reference) !== "[object Object]") {
            return reference;
        }
        for (var propertyName in reference) {
            var propertyValue = reference[propertyName];
            if (propertyValue == null) {
                continue;
            }
            if (Object.prototype.toString.call(propertyValue) === "[object Object]") {
                reference[propertyName] = filterObject(propertyValue);
            } else {
                reference[propertyName] = filterValue(propertyName, propertyValue);
            }
        }
        return reference;
    }
    function processUnhandledException(stackTrace, options) {
        var stack = [], qs = {};
        if (_ignore3rdPartyErrors) {
            if (!stackTrace.stack || !stackTrace.stack.length) {
                _private.log("Raygun4JS: Cancelling send due to null stacktrace");
                return;
            }
            var domain = _private.parseUrl("domain");
            var scriptError = "Script error";
            var msg = stackTrace.message || options.status || scriptError;
            if (msg.substring(0, scriptError.length) === scriptError && stackTrace.stack[0].url !== null && stackTrace.stack[0].url.indexOf(domain) === -1 && (stackTrace.stack[0].line === 0 || stackTrace.stack[0].func === "?")) {
                _private.log("Raygun4JS: cancelling send due to third-party script error with no stacktrace and message");
                return;
            }
            if (stackTrace.stack[0].url !== null && stackTrace.stack[0].url.indexOf(domain) === -1) {
                var allowedDomainFound = false;
                for (var i in _whitelistedScriptDomains) {
                    if (stackTrace.stack[0].url.indexOf(_whitelistedScriptDomains[i]) > -1) {
                        allowedDomainFound = true;
                    }
                }
                if (!allowedDomainFound) {
                    _private.log("Raygun4JS: cancelling send due to error on non-origin, non-whitelisted domain");
                    return;
                }
            }
        }
        if (stackTrace.stack && stackTrace.stack.length) {
            forEach(stackTrace.stack, function(i, frame) {
                stack.push({
                    LineNumber: frame.line,
                    ColumnNumber: frame.column,
                    ClassName: "line " + frame.line + ", column " + frame.column,
                    FileName: frame.url,
                    MethodName: frame.func || "[anonymous]"
                });
            });
        }
        var queryString = _private.parseUrl("?");
        if (queryString.length > 0) {
            forEach(queryString.split("&"), function(i, segment) {
                var parts = segment.split("=");
                if (parts && parts.length === 2) {
                    var key = decodeURIComponent(parts[0]);
                    var value = filterValue(key, parts[1]);
                    qs[key] = value;
                }
            });
        }
        if (options === undefined) {
            options = {};
        }
        if (isEmpty(options.customData)) {
            if (typeof _customData === "function") {
                options.customData = _customData();
            } else {
                options.customData = _customData;
            }
        }
        if (isEmpty(options.tags)) {
            if (typeof _tags === "function") {
                options.tags = _tags();
            } else {
                options.tags = _tags;
            }
        }
        var screen = window.screen || {
            width: getViewPort().width,
            height: getViewPort().height,
            colorDepth: 8
        };
        var custom_message = options.customData && options.customData.ajaxErrorMessage;
        var finalCustomData = filterObject(options.customData);
        try {
            JSON.stringify(finalCustomData);
        } catch (e) {
            var msg = "Cannot add custom data; may contain circular reference";
            finalCustomData = {
                error: msg
            };
            _private.log("Raygun4JS: " + msg);
        }
        var payload = {
            OccurredOn: new Date(),
            Details: {
                Error: {
                    ClassName: stackTrace.name,
                    Message: custom_message || stackTrace.message || options.status || "Script error",
                    StackTrace: stack
                },
                Environment: {
                    UtcOffset: new Date().getTimezoneOffset() / -60,
                    "User-Language": navigator.userLanguage,
                    "Document-Mode": document.documentMode,
                    "Browser-Width": getViewPort().width,
                    "Browser-Height": getViewPort().height,
                    "Screen-Width": screen.width,
                    "Screen-Height": screen.height,
                    "Color-Depth": screen.colorDepth,
                    Browser: navigator.appCodeName,
                    "Browser-Name": navigator.appName,
                    "Browser-Version": navigator.appVersion,
                    Platform: navigator.platform
                },
                Client: {
                    Name: "raygun-js",
                    Version: "1.14.0"
                },
                UserCustomData: finalCustomData,
                Tags: options.tags,
                Request: {
                    Url: [ location.protocol, "//", location.host, location.pathname ].join(""),
                    QueryString: qs,
                    Headers: {
                        "User-Agent": navigator.userAgent,
                        Referer: document.referrer,
                        Host: document.domain
                    }
                },
                Version: _version || "Not supplied"
            }
        };
        ensureUser();
        payload.Details.User = _user;
        if (typeof _beforeSendCallback === "function") {
            var mutatedPayload = _beforeSendCallback(payload);
            if (mutatedPayload) {
                sendToRaygun(mutatedPayload);
            }
        } else {
            sendToRaygun(payload);
        }
    }
    function sendToRaygun(data) {
        if (!isApiKeyConfigured()) {
            return;
        }
        _private.log("Sending exception data to Raygun:", data);
        var url = _raygunApiUrl + "/entries?apikey=" + encodeURIComponent(_raygunApiKey);
        makePostCorsRequest(url, JSON.stringify(data));
    }
    function createCORSRequest(method, url) {
        var xhr;
        xhr = new window.XMLHttpRequest();
        if ("withCredentials" in xhr) {
            xhr.open(method, url, true);
        } else if (window.XDomainRequest) {
            if (_allowInsecureSubmissions) {
                url = url.slice(6);
            }
            xhr = new window.XDomainRequest();
            xhr.open(method, url);
        }
        xhr.timeout = 1e4;
        return xhr;
    }
    function makePostCorsRequest(url, data) {
        var xhr = createCORSRequest("POST", url, data);
        if ("withCredentials" in xhr) {
            xhr.onreadystatechange = function() {
                if (xhr.readyState !== 4) {
                    return;
                }
                if (xhr.status === 202) {
                    sendSavedErrors();
                } else if (_enableOfflineSave && xhr.status !== 403 && xhr.status !== 400) {
                    offlineSave(data);
                }
            };
            xhr.onload = function() {
                _private.log("logged error to Raygun");
            };
        } else if (window.XDomainRequest) {
            xhr.ontimeout = function() {
                if (_enableOfflineSave) {
                    _private.log("Raygun: saved error locally");
                    offlineSave(data);
                }
            };
            xhr.onload = function() {
                _private.log("logged error to Raygun");
                sendSavedErrors();
            };
        }
        xhr.onerror = function() {
            _private.log("failed to log error to Raygun");
        };
        if (!xhr) {
            _private.log("CORS not supported");
            return;
        }
        xhr.send(data);
    }
    window.Raygun = Raygun;
})(window, window.jQuery);

(function(window, Raygun) {
    Raygun._private.parseUrl = function(arg, url) {
        function isNumeric(arg) {
            return !isNaN(parseFloat(arg)) && isFinite(arg);
        }
        return function(arg, url) {
            var _ls = url || window.location.toString();
            if (!arg) {
                return _ls;
            } else {
                arg = arg.toString();
            }
            if (_ls.substring(0, 2) === "//") {
                _ls = "http:" + _ls;
            } else if (_ls.split("://").length === 1) {
                _ls = "http://" + _ls;
            }
            url = _ls.split("/");
            var _l = {
                auth: ""
            }, host = url[2].split("@");
            if (host.length === 1) {
                host = host[0].split(":");
            } else {
                _l.auth = host[0];
                host = host[1].split(":");
            }
            _l.protocol = url[0];
            _l.hostname = host[0];
            _l.port = host[1] || (_l.protocol.split(":")[0].toLowerCase() === "https" ? "443" : "80");
            _l.pathname = (url.length > 3 ? "/" : "") + url.slice(3, url.length).join("/").split("?")[0].split("#")[0];
            var _p = _l.pathname;
            if (_p.charAt(_p.length - 1) === "/") {
                _p = _p.substring(0, _p.length - 1);
            }
            var _h = _l.hostname, _hs = _h.split("."), _ps = _p.split("/");
            if (arg === "hostname") {
                return _h;
            } else if (arg === "domain") {
                if (/^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$/.test(_h)) {
                    return _h;
                }
                return _hs.slice(-2).join(".");
            } else if (arg === "sub") {
                return _hs.slice(0, _hs.length - 2).join(".");
            } else if (arg === "port") {
                return _l.port;
            } else if (arg === "protocol") {
                return _l.protocol.split(":")[0];
            } else if (arg === "auth") {
                return _l.auth;
            } else if (arg === "user") {
                return _l.auth.split(":")[0];
            } else if (arg === "pass") {
                return _l.auth.split(":")[1] || "";
            } else if (arg === "path") {
                return _l.pathname;
            } else if (arg.charAt(0) === ".") {
                arg = arg.substring(1);
                if (isNumeric(arg)) {
                    arg = parseInt(arg, 10);
                    return _hs[arg < 0 ? _hs.length + arg : arg - 1] || "";
                }
            } else if (isNumeric(arg)) {
                arg = parseInt(arg, 10);
                return _ps[arg < 0 ? _ps.length + arg : arg] || "";
            } else if (arg === "file") {
                return _ps.slice(-1)[0];
            } else if (arg === "filename") {
                return _ps.slice(-1)[0].split(".")[0];
            } else if (arg === "fileext") {
                return _ps.slice(-1)[0].split(".")[1] || "";
            } else if (arg.charAt(0) === "?" || arg.charAt(0) === "#") {
                var params = _ls, param = null;
                if (arg.charAt(0) === "?") {
                    params = (params.split("?")[1] || "").split("#")[0];
                } else if (arg.charAt(0) === "#") {
                    params = params.split("#")[1] || "";
                }
                if (!arg.charAt(1)) {
                    return params;
                }
                arg = arg.substring(1);
                params = params.split("&");
                for (var i = 0, ii = params.length; i < ii; i++) {
                    param = params[i].split("=");
                    if (param[0] === arg) {
                        return param[1] || "";
                    }
                }
                return null;
            }
            return "";
        }(arg, url);
    };
    window.Raygun._seal();
})(window, window.Raygun);

var AppInfo = {
    uuid: "00e9deeb-16b4-4752-ae35-2cc088fc6ca9",
    shortName: "UK Transport",
    longName: "UK Transport",
    companyName: "Matthew Tole",
    versionCode: 1,
    versionLabel: "1.3",
    watchapp: {
        watchface: false
    },
    appKeys: {
        group: 0,
        operation: 1,
        data: 2
    },
    capabilities: [ "location" ],
    resources: {
        media: [ {
            menuIcon: true,
            type: "png",
            name: "MENU_ICON",
            file: "images/menu.png"
        }, {
            type: "png",
            name: "MENU_RAIL",
            file: "images/menu_rail.png"
        }, {
            type: "png",
            name: "MENU_TFL",
            file: "images/menu_tfl.png"
        }, {
            type: "png",
            name: "MENU_BUS",
            file: "images/menu_bus.png"
        }, {
            type: "png",
            name: "MENU_REFRESH",
            file: "images/menu_refresh.png"
        }, {
            type: "png",
            name: "MENU_SETTINGS",
            file: "images/menu_settings.png"
        }, {
            type: "png",
            name: "MENU_ABOUT",
            file: "images/menu_about.png"
        }, {
            type: "png",
            name: "ICON_FAVOURITE",
            file: "images/icon_favourite.png"
        }, {
            type: "font",
            name: "FONT_ICON_8",
            file: "fonts/icomoon.ttf",
            characterRegex: "ab"
        } ]
    }
};

var Config = {
    keen: {
        projectId: "53a48cb6bcb79c3f5e000000",
        writeKey: "bcfbf33780ecb04cf8c1f8285688dd0d10018f4041908d209b812326e07f5c3a4e4004452cbbfe051d98d589829f48cf1c1d5e81839d2ac7f40f5c8354ef0617b7b15e85a341c7f424e2b5aac844ba86f3ff22287231120699a428c4db7b149d0376577e5260ad7e54aefd9ec026ff7b"
    },
    api: {
        tube: {
            status: "http://pebble.matthewtole.com/uk-transport/tube/status.json",
            details: "http://pebble.matthewtole.com/uk-transport/tube/details.json"
        },
        train: {
            stations: "http://pebble.matthewtole.com/uk-transport/2/train/stations.json",
            departures: "http://pebble.matthewtole.com/uk-transport/train/departures.json"
        },
        bus: {
            stops: "http://pebble.matthewtole.com/uk-transport/bus/stops.json",
            departures: "http://pebble.matthewtole.com/uk-transport/bus/departures.json"
        }
    },
    debug: true,
    raygun: {
        key: "kYH5z48etctoVL2wlO8sJA=="
    }
};

var Bus = function(options) {
    this.pebble = options.pebble || Pebble;
    this.messageQueue = options.messageQueue || MessageQueue;
    this.http = options.http || http;
    this.location = options.location || navigator.geolocation;
    this.debug = options.debug;
    this.keen = options.keen;
    this.version = options.version;
    this.api = options.api;
    this.pebbleAppMessage = function(event) {
        var payload = event.payload;
        var group = payload.group.toLowerCase();
        if (group !== "bus") {
            return;
        }
        this.log("Payload", JSON.stringify(payload));
        var operation = payload.operation.toLowerCase();
        switch (operation) {
          case "stops":
            opBusStops.call(this, payload.data);
            break;

          case "departures":
            opBusDepartures.call(this, payload.data);
            break;
        }
    };
    function opBusStops() {
        var timeLocation = new Date();
        var timeLookup = null;
        this.location.getCurrentPosition(locationCallback.bind(this), locationError.bind(this));
        function locationCallback(position) {
            trackTimeTaken.call(this, timeLocation, "bus.location");
            logTimeElapsed.call(this, timeLocation, "Getting location took %TIME%.");
            var requestData = {
                lon: position.coords.longitude,
                lat: position.coords.latitude
            };
            timeLookup = new Date();
            this.http.get(this.api.stops, requestData, requestCallback.bind(this));
        }
        function locationError(err) {
            Raygun.send(err);
            trackTimeTaken.call(this, timeLocation, "bus.location.error");
            logTimeElapsed.call(this, timeLocation, "Failing to get location took %TIME%.");
        }
        function requestCallback(err, data) {
            if (err) {
                Raygun.send(err);
            }
            trackTimeTaken.call(this, timeLookup, "bus.stops");
            logTimeElapsed.call(this, timeLookup, "Finding nearest stops took %TIME%.");
            if (err) {
                return console.log(err);
            }
            if (!data) {
                return console.log(new Error("Lack of data!"));
            }
            var stops = data.stops;
            var responseData = [];
            responseData.push(stops.length);
            stops.forEach(function(stop) {
                responseData.push(stop.atcocode);
                responseData.push(stop.name);
                responseData.push(stop.indicator);
            });
            this.messageQueue.sendAppMessage({
                group: "BUS",
                operation: "STOPS",
                data: responseData.join("|")
            });
        }
    }
    function opBusDepartures(data) {
        var code = data;
        var requestData = {
            stop: code
        };
        this.http.get(this.api.departures, requestData, requestCallback.bind(this));
        function requestCallback(err, data) {
            if (err) {
                Raygun.send(err);
                return console.log(err);
            }
            if (!data) {
                return console.log(new Error("Lack of data!"));
            }
            var departures = data.departures.all;
            var responseData = [];
            responseData.push(departures.length);
            departures.forEach(function(departure) {
                responseData.push(departure.line);
                responseData.push(departure.direction);
                var hasEstimate = departure.best_departure_estimate && departure.best_departure_estimate.length;
                responseData.push(hasEstimate ? departure.best_departure_estimate : departure.aimed_departure_time);
            });
            this.messageQueue.sendAppMessage({
                group: "BUS",
                operation: "DEPARTURES",
                data: responseData.join("|")
            });
        }
    }
    function logTimeElapsed(start, message) {
        var now = new Date();
        var totalMs = now.getTime() - start.getTime();
        this.log(message.replace("%TIME%", totalMs + "ms"));
    }
    function trackTimeTaken(start, event) {
        var now = new Date();
        if (this.keen) {
            this.keen.sendEvent("time.taken", {
                event: event,
                msTaken: now.getTime() - start.getTime()
            });
        }
    }
};

Bus.prototype.log = function() {
    if (!this.debug) {
        return;
    }
    var pieces = [ "UK Transport", this.version, "Bus" ];
    pieces = pieces.concat(Array.prototype.slice.call(arguments));
    console.log(pieces.join(" // "));
};

Bus.prototype.init = function() {
    this.pebble.addEventListener("appmessage", this.pebbleAppMessage.bind(this));
    this.log("Ready");
};

var Tube = function(options) {
    this.pebble = options.pebble || Pebble;
    this.messageQueue = options.messageQueue || MessageQueue;
    this.http = options.http || http;
    this.debug = options.debug;
    this.version = options.version;
};

Tube.prototype._onPebbleAppMessage = function(event) {
    var payload = event.payload;
    var group = payload.group.toLowerCase();
    if (group !== "tube") {
        return;
    }
    if (this.debug) {
        this.log("Payload", JSON.stringify(payload));
    }
    var operation = payload.operation.toLowerCase();
    switch (operation) {
      case "update":
        opLineStatus.call(this, payload.data);
        break;

      case "details":
        opLineDetails.call(this, payload.data);
        break;
    }
    function opLineStatus(data) {
        this.http.get(Config.api.tube.status, data, function(err, data) {
            if (err) {
                Raygun.send(err);
                if (err.message && err.message === "NOT_CONNECTED") {
                    this.messageQueue.sendAppMessage({
                        group: "TUBE",
                        operation: "ERROR",
                        data: "OFFLINE"
                    });
                } else {
                    this.messageQueue.sendAppMessage({
                        group: "TUBE",
                        operation: "ERROR",
                        data: "HTTP_UNKNOWN"
                    });
                }
                return;
            }
            if (!data || !data.response || !data.response.lines) {
                if (this.debug) {
                    this.log("Response from tube update API was invalid.");
                }
                this.messageQueue.sendAppMessage({
                    group: "TUBE",
                    operation: "ERROR",
                    data: "API_INVALID"
                });
                return;
            }
            var lines = data.response.lines;
            lines = lines.map(function(line) {
                var betterLine = {
                    name: line.name.replace("&amp;", "&"),
                    statuses: line.status.split(",")
                };
                betterLine.ok = betterLine.statuses[0] === "good service";
                betterLine.statuses = betterLine.statuses.map(function(str) {
                    return titleize(str.trim());
                });
                betterLine.statuses.sort(function(statusA, statusB) {
                    var orderA = Tube.StatusOrdering.indexOf(statusA);
                    var orderB = Tube.StatusOrdering.indexOf(statusB);
                    return orderA < orderB ? -1 : orderA > orderB ? 1 : 0;
                });
                return betterLine;
            });
            lines.sort(function(lineA, lineB) {
                var weightA = statusWeight(lineA);
                var weightB = statusWeight(lineB);
                return weightA < weightB ? 1 : weightA > weightB ? -1 : lineA.name.localeCompare(lineB.name);
            });
            lines = dedupeLines(lines);
            var updateData = [ lines.length ];
            lines.forEach(function(line) {
                updateData.push(line.name);
                updateData.push(line.statuses.join(", "));
            });
            this.messageQueue.sendAppMessage({
                group: "TUBE",
                operation: "UPDATE",
                data: updateData.join("|")
            });
        }.bind(this));
    }
    function opLineDetails(data) {
        this.http.get(Config.api.tube.details, {
            line: data
        }, function(err, data) {
            if (err) {
                Raygun.send(err);
                switch (err.message) {
                  case "NOT_CONNECTED":
                    this.messageQueue.sendAppMessage({
                        group: "TUBE",
                        operation: "ERROR",
                        data: "OFFLINE"
                    });
                    return;

                  default:
                    this.messageQueue.sendAppMessage({
                        group: "TUBE",
                        operation: "ERROR",
                        data: "HTTP_UNKNOWN"
                    });
                    return;
                }
            }
            if (!data || !data.response) {
                if (this.debug) {
                    this.log("Response from tube update API was invalid.");
                }
                this.messageQueue.sendAppMessage({
                    group: "TUBE",
                    operation: "ERROR",
                    data: "API_INVALID"
                });
                return;
            }
            this.messageQueue.sendAppMessage({
                group: "TUBE",
                operation: "DETAILS",
                data: data.response
            });
        }.bind(this));
    }
    function statusWeight(line) {
        return line.statuses.reduce(function(weight, status) {
            return weight + Math.pow(2, -1 * Tube.StatusOrdering.indexOf(status));
        }, 0);
    }
    function dedupeLines(lines) {
        var dedupedLines = [];
        lines.forEach(function(line) {
            var existingLine = find(dedupedLines, function(innerLine) {
                return line.name === innerLine.name;
            });
            if (!existingLine) {
                dedupedLines.push(line);
            }
        });
        return dedupedLines;
    }
    function titleize(str) {
        if (str === null) {
            return "";
        }
        str = String(str).toLowerCase();
        return str.replace(/(?:^|\s|-)\S/g, function(c) {
            return c.toUpperCase();
        });
    }
    function find(array, callback) {
        for (var i = 0; i < array.length; i += 1) {
            if (callback(array[i])) {
                return array[i];
            }
        }
        return undefined;
    }
};

Tube.prototype.log = function() {
    if (!this.debug) {
        return;
    }
    var pieces = [ "UK Transport", this.version, "Tube" ];
    pieces = pieces.concat(Array.prototype.slice.call(arguments));
    console.log(pieces.join(" // "));
};

Tube.prototype.init = function() {
    this.pebble.addEventListener("appmessage", this._onPebbleAppMessage.bind(this));
    this.log("Ready");
};

Tube.StatusOrdering = [ "Suspended", "Part Suspended", "Planned Closure", "Part Closure", "Severe Delays", "Reduced Service", "Bus Service", "Minor Delays", "Good Service" ];

var Train = function(options) {
    this.pebble = options.pebble || Pebble;
    this.messageQueue = options.messageQueue || MessageQueue;
    this.http = options.http || http;
    this.location = options.location || navigator.geolocation;
    this.debug = options.debug;
    this.keen = options.keen;
    this.version = options.version;
    this.api = options.api;
    this.onPebbleAppMessage = function(event) {
        var payload = event.payload;
        var group = payload.group.toLowerCase();
        if (group !== "train") {
            return;
        }
        this.log("Payload", JSON.stringify(payload));
        var operation = payload.operation.toLowerCase();
        switch (operation) {
          case "stations":
            try {
                opTrainStations.call(this, payload.data);
            } catch (ex) {
                this.log("Error", JSON.stringify(ex));
            }
            break;

          case "departures":
            try {
                opTrainDepartures.call(this, payload.data);
            } catch (ex) {
                this.log("Error", JSON.stringify(ex));
            }
            break;
        }
    };
    function opTrainStations() {
        var timeLocation = new Date();
        var timeLookup = null;
        var locationOptions = {
            enableHighAccuracy: false,
            timeout: 5 * 1e3,
            maximumAge: 60 * 1e3
        };
        this.location.getCurrentPosition(locationCallback.bind(this), locationError.bind(this), locationOptions);
        function locationCallback(position) {
            trackTimeTaken.call(this, timeLocation, "train.location");
            logTimeElapsed.call(this, timeLocation, "Getting location took %TIME%.");
            var requestData = {
                lon: position.coords.longitude,
                lat: position.coords.latitude
            };
            timeLookup = new Date();
            this.http.get(this.api.stations, requestData, requestCallback.bind(this));
        }
        function locationError(err) {
            Raygun.send(err);
            trackTimeTaken.call(this, timeLocation, "train.locationError");
            logTimeElapsed.call(this, timeLocation, "Failing to get location took %TIME%.");
            this.messageQueue.sendAppMessage({
                group: "TRAIN",
                operation: "ERROR",
                data: "Location access failed."
            });
        }
        function requestCallback(err, data) {
            if (err) {
                Raygun.send(err);
            }
            trackTimeTaken.call(this, timeLookup, "train.stations");
            logTimeElapsed.call(this, timeLookup, "Finding nearest stations took %TIME%.");
            var stations = data;
            var responseData = [];
            responseData.push(stations.length);
            stations.forEach(function(station) {
                responseData.push(station.code);
                responseData.push(station.name);
            });
            this.messageQueue.sendAppMessage({
                group: "TRAIN",
                operation: "STATIONS",
                data: responseData.join("|")
            });
        }
    }
    function opTrainDepartures(data) {
        var code = data;
        var requestData = {
            station: code
        };
        this.http.get(this.api.departures, requestData, function(err, data) {
            if (err) {
                Raygun.send(err);
                switch (err.message) {
                  case "NOT_CONNECTED":
                    this.messageQueue.sendAppMessage({
                        group: "TRAIN",
                        operation: "ERROR",
                        data: "Not online."
                    });
                    return;

                  default:
                    this.messageQueue.sendAppMessage({
                        group: "TRAIN",
                        operation: "ERROR",
                        data: "Unknown HTTP error."
                    });
                    return;
                }
            }
            var departures = data.departures.all;
            var responseData = [];
            responseData.push(departures.length);
            departures.forEach(function(departure) {
                responseData.push(departure.destination_name);
                responseData.push(departure.expected_departure_time);
                responseData.push(departure.status);
                responseData.push(departure.platform);
            });
            this.messageQueue.sendAppMessage({
                group: "TRAIN",
                operation: "DEPARTURES",
                data: responseData.join("|")
            });
        }.bind(this));
    }
    function logTimeElapsed(start, message) {
        var now = new Date();
        var totalMs = now.getTime() - start.getTime();
        this.log(message.replace("%TIME%", totalMs + "ms"));
    }
    function trackTimeTaken(start, event) {
        var now = new Date();
        if (this.keen) {
            this.keen.sendEvent("time.taken", {
                event: event,
                msTaken: now.getTime() - start.getTime()
            });
        }
    }
};

Train.prototype.log = function() {
    if (!this.debug) {
        return;
    }
    var pieces = [ "UK Transport", this.version, "Train" ];
    pieces = pieces.concat(Array.prototype.slice.call(arguments));
    console.log(pieces.join(" // "));
};

Train.prototype.init = function() {
    this.pebble.addEventListener("appmessage", this.onPebbleAppMessage.bind(this));
    this.log("Ready");
};

(function() {
    Pebble.addEventListener("ready", function() {
        try {
            Raygun.init(Config.raygun.key, {
                debugMode: Config.debug
            }).attach();
            Raygun.setUser(Pebble.getAccountToken());
            Raygun.setVersion(AppInfo.versionLabel);
            train.init();
            tube.init();
            bus.init();
            Keen.init(http, Pebble, Config.keen, AppInfo, Config.debug);
            Pebble.addEventListener("appmessage", analyticsMessageHandler);
        } catch (ex) {
            Raygun.send(ex);
        }
    });
    var tube = new Tube({
        keen: Keen,
        debug: Config.debug,
        api: Config.api.tube,
        version: AppInfo.versionLabel
    });
    var train = new Train({
        keen: Keen,
        debug: Config.debug,
        transportApi: Config.transportApi,
        api: Config.api.train,
        version: AppInfo.versionLabel
    });
    var bus = new Bus({
        keen: Keen,
        debug: Config.debug,
        transportApi: Config.transportApi,
        api: Config.api.bus,
        version: AppInfo.versionLabel
    });
    function analyticsMessageHandler(event) {
        if ("ANALYTICS" !== event.payload.group) {
            return;
        }
        var data = {};
        try {
            event.payload.data.split("|").forEach(function(sub) {
                if (!sub || !sub.length) {
                    return;
                }
                var splitSub = sub.split("`");
                if (splitSub.length !== 2) {
                    return;
                }
                data[splitSub[0]] = splitSub[1];
            });
        } catch (ex) {
            console.log(ex);
        }
        Keen.sendEvent(event.payload.operation, data);
    }
})();