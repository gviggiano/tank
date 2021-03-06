window.Tank = function () {

    var typeOf = function (something) {
        return Object.prototype.toString.call(something);
    };

    var uuid = function () {
        var x = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
        return x;
    };

    var element = function (selector, node) {
        node = node || document;
        return node.querySelectorAll(selector);
    };

    var createElement = function (name, attrs) {
        return Tank.merge(document.createElement(name), attrs);
    };

    var createFragment = function (html) {
        var frag = document.createDocumentFragment();
        var div = document.createElement('div');
        div.innerHTML = html;
        while (div.firstChild) frag.appendChild(div.firstChild);
        return frag;
    };

    var copy = function (Object) {
        var copy = {};
        for (var prop in Object) {
            copy[prop] = Object[prop];
        }
        return copy;
    };

    var merge = function () {
        var target = arguments[0], sources = Array.prototype.slice.call(arguments, [1]);
        Tank.forEach(sources, function (source) {
            for (var property in source) {
                if (!target[property])
                    target[property] = source[property];
            }
        });
        return target;
    };

    var toArray = function (obj) {
        var t = Tank.typeOf(obj);
        return !obj ? [] : (t == Tank.TYPE_ARRAY) || (t != Tank.TYPE_STRING
        && Tank.typeOf(obj.length) == Tank.TYPE_NUMBER) ? obj : new Array(obj);
    };

    var format = function () {
        if (arguments.length <= 1) return arguments;
        var str = arguments[0], args = Array.prototype.slice.call(arguments, [1]);
        return str.replace(/{(\d+)}/g, function (match, number) {
            return typeof args[number] != 'undefined' ? args[number] : match;
        });
    };

    var forEach = function (array, fn) {
        [].forEach.call(Tank.toArray(array), fn);
    };

    var model = function (expression, handler) {
        return new Function(['handler'], 'return handler.$m.' + expression + ';')(handler);
    };

    var expand = function (str, handler, expr) {
        var expr = expr || "$1";
        return new Function("obj", "var p=[],print=function(){p.push.apply(p,arguments);}; with(obj){p.push('"
        + str.replace(/[\r\t\n]/g, " ").split("{{").join("\t").replace(/\t=(.*?)}}/g, "'," + expr + ",'")
            .split("\t").join("');").split("}}").join("p.push('").split("\r").join("\\'") + "');} return p.join('');")(handler.$m)
    };

    var _info = function (handler) {
        return handler.name + '(' + _argPairs(handler).join(',') + ')';
    };

    var _printStacktrace = function (msg, handler) {
        var parent = handler, stacktrace = msg;
        while (parent != null && parent.$f[parent.name]) {
            stacktrace = stacktrace.concat("\n at " + _info(parent));
            parent = parent.parent;
        }
        console.error(stacktrace);
    };

    var _argPairs = function (handler) {
        var argPair = [], argNames = _argNames(handler), args = _args(handler, argNames);
        for (var idx in argNames) {
            argPair[idx] = argNames[idx] + '=' + args[idx];
        }
        return argPair;
    };

    var _argNames = function (handler) {
        var fnStr = Function.toString.call(handler.$f[handler.name]);
        var fnParams = fnStr.slice(fnStr.indexOf("(") + 1, fnStr.indexOf(")")).trim();
        return fnParams ? fnParams.split(',').map(function (el) {
            return el ? el.trim() : null;
        }) : [];
    };

    var _args = function (handler, argNames) {
        var copy = Tank.merge(Tank.copy(handler.flow), handler.parent.flow, handler.$f, handler.$m);
        return argNames.map(function (c) {
            return copy[c];
        });
    };

    var _tryExecute = function (handler) {
        if (Tank.typeOf(handler.flow) != Tank.TYPE_FUNCTION) {
            try {
                //console.info(_info(handler));
                return handler.$f[handler.name].apply(handler, _args(handler, _argNames(handler)));
            } catch (e) {
                _printStacktrace(e.message, handler);
            }
        }
    };

    var _process = function (handler) {
        for (var prop in handler.$f) {
            if (handler.flow[prop] && Tank.typeOf(handler.$f[prop]) == Tank.TYPE_FUNCTION) {
                Tank.forEach(handler.flow[prop], function (el) {
                    var child = new Tank.Handler(prop, el, handler);
                    var x = _tryExecute(child);
                    if (!(x instanceof Tank.Event)) handler.childs.push(child);
                    if (Tank.typeOf(x) == Tank.TYPE_OBJECT) Tank.merge(child.flow, x);
                });
            }
        }
        Tank.forEach(handler.childs, function (child) {
            child.init();
        });
    };

    var _extend = function (Global, Local, Handler) {
        for (var gprop in Global) {
            if (Tank.$f[gprop]) console.warn("Tank already contains property" + gprop);
            Tank.typeOf(Global[gprop]) == Tank.TYPE_FUNCTION ? Tank.$f[gprop] = Global[gprop] : Tank.$m[gprop] = Global[gprop];
            Tank.typeOf(Global[gprop]) == Tank.TYPE_FUNCTION ? Handler.parent.$f[gprop] = Global[gprop] : Handler.parent.$m[gprop] = Global[gprop];
        }
        for (var lprop in Local) {
            Tank.typeOf(Local[lprop]) == Tank.TYPE_FUNCTION ? Handler.parent.$f[lprop] = Local[lprop] : Handler.parent.$m[lprop] = Local[lprop];
        }
    };
    var noop = function () {
    };

    var Event = function (Target, EventType, Handler, TriggerEachOne) {
        var evtCounter = Tank.toArray(Target).length;
        Tank.forEach(Target, function (target) {
            target.addEventListener(EventType, function (evt) {
                if (evt.target.tankTriggerEvent) evt.target.tankTriggerEvent();
                evtCounter = evtCounter > 0 ? evtCounter - 1 : 0;
                if (TriggerEachOne || evtCounter == 0) {
                    Handler.$m.Event = evt;
                    new Tank.Handler("Event_detached", Handler.flow, Handler).init();
                }
            }, false);
            if (target.tankStartEvent) target.tankStartEvent();
        });
        return this;
    };

    var Handler = function (name, flow, parent) {
        if (flow.extend) {
            var copy = Tank.copy(flow);
            delete copy.extend;
            flow = {extend: flow.extend, exec: copy};
        }
        Tank.merge(this, {name: name, uuid: Tank.uuid(), parent: parent, flow: flow, childs: []}, parent);
        this.$m.Handler = this;
        this.init = function () {
            _process(this);
        };
    };

    var define = function (prop) {
        if (!prop) return;
        var start = function () {
            var handler = new Tank.Handler('_root', prop, Tank);
            Tank.merge(handler, Tank);
            Tank.handlers.push(handler);
            handler.init();
        };

        Tank.ready ? start() : function () {
            document.addEventListener('DOMContentLoaded', function () {
                Tank.ready = true;
                start();
            });
        }();
    };

    var createScript = function (scriptNode) {
        if (!scriptNode.src) {
            return Tank.createElement('script', {
                src: Tank.format('data:{0};base64,{1}', scriptNode.type, window.btoa(scriptNode.innerHTML)),
                type: scriptNode.type,
                async: false
            });
        } else {
            return scriptNode;
        }
    };

    return {
        ready: false, handlers: [],
        $f: {extend: _extend, exec: noop},
        $m: {},
        TYPE_FUNCTION: typeOf(Object),
        TYPE_OBJECT: typeOf({}),
        TYPE_STRING: typeOf(''),
        TYPE_NUMBER: typeOf(0),
        TYPE_ARRAY: typeOf([]),
        typeOf: typeOf,
        uuid: uuid, element: element,
        createElement: createElement,
        createFragment: createFragment,
        createScript: createScript,
        copy: copy,
        merge: merge,
        expand: expand,
        toArray: toArray,
        format: format,
        forEach: forEach,
        model: model,
        define: define,
        Handler: Handler,
        Event: Event
    }
}();

(function () {


    Tank.define({
        styledef: {
            Styles: [
                {name: ".tank-hide", attrs: {position: 'absolute', left: '-100000px', top: '-1000000px', opacity: '0'}},
                {name: ".tank-fade", attrs: {transition: "opacity linear 1s", opacity: "1"}},
                {name: ".tank-fade-out", attrs: {opacity: "0"}}
            ]
        },
        extend: {
            Global: {
                /**
                 @function assign
                 @param Model { {name: string, value:string} | Array.<{name: string, value:string}> }
                 @param Handler (this)
                 */
                assign: function (Model, Handler) {
                    Tank.forEach(Model, function (m) {
                        var fn = new Function(['handler'], 'Handler.$m.' + m.name + '= Tank.model(' + m.value + ', handler);');
                        fn(Handler);
                    });
                },
                /**
                 @param Element {HtmlElement | Array.<HtmlElement>}
                 @param Selector {string}
                 */
                append: function (Element, Selector) {
                    var scriptElements = [];
                    Tank.forEach(Element, function (elem) {
                        Tank.forEach(Tank.element(Selector), function (selector) {
                            if (elem.nodeType !== 3 && elem.querySelectorAll) {
                                var scripts = Tank.element('script', elem);
                                Tank.forEach(scripts, function (script) {
                                    scriptElements.push(Tank.createScript(script.parentNode ? script.parentNode.removeChild(script) : script));
                                });
                            }
                            if (elem.tagName == 'SCRIPT' && selector.tagName != 'HEAD') {
                                scriptElements.push(Tank.createScript(elem.parentNode ? elem.parentNode.removeChild(elem) : elem));
                            } else {
                                selector.appendChild(elem);
                            }
                        })
                    });
                    scriptElements.length ? this.flow = {append: {Element: scriptElements, Selector: 'head', exec: this.copy(this.flow)}} : undefined;
                },

                /**
                 @param Request { {url: string, method:string, data: ?Object } | Array.<{url: string, method:string, data: ?Object }> }
                 @param TriggerEachRequest {?boolean}
                 @param Handler (this)
                 */
                ajax: function (Request, TriggerEachRequest, Handler) {
                    var requests = [];
                    Tank.forEach(Request, function (req) {
                        var xmlhttp = new XMLHttpRequest();
                        xmlhttp.open(req.method, req.url, true);
                        xmlhttp.tankStartEvent = function () {
                            var form = new FormData();
                            for (var prop in req.data) {
                                form.append(prop, Handler[prop]);
                            }
                            xmlhttp.send(form);
                        };
                        xmlhttp.tankTriggerEvent = function () {
                            if (req.tankDone) req.tankDone(xmlhttp);
                        };
                        requests.push(xmlhttp);
                    });
                    return new Tank.Event(requests, 'load', this, TriggerEachRequest || false);
                },

                /**
                 @param Selector {string | Array.<string>}
                 */
                click: function (Selector) {
                    this.flow = {bind: {EventName: 'click', Selector: Selector, exec: Tank.copy(this.flow)}};
                },

                /**
                 @param EventName (string)
                 @param Selector {string | Array.<string>}
                 */
                bind: function (EventName, Selector) {
                    return new Tank.Event(Tank.element(Selector), EventName, this, true);
                },

                /**
                 @param File ( {url: string} | {url: Array.<string>} )
                 */
                script: function (File) {
                    var Scripts = Tank.toArray(File).map(function (el) {
                        return Tank.createElement("script", {src: el.url, type: "text/javascript", async: false});
                    });
                    this.flow = {get: {Request: File, append: {Element: Scripts, Selector: "head", exec: this.copy(this.flow)}}};
                },


                /**
                 @param File (  string | Array.<string> )
                 */
                stylesheet: function (File) {
                    var Stylesheets = Tank.toArray(File).map(function (el) {
                        return Tank.createElement("link", {rel: "stylesheet", href: el.url, type: "text/css", async: false});
                    });
                    this.flow = {get: {Request: File, append: {Element: Stylesheets, Selector: "head", exec: this.copy(this.flow)}}};
                },


                /**
                 @param Styles (  { name: string, attrs: Object | Array.<{name: string, attrs: Object}> )
                 */
                styledef: function (Styles) {
                    this.flow = {
                        append: {
                            Element: Tank.createElement('link', {rel: "stylesheet",
                                href: Tank.format('data:text/css;base64,{0}', window.btoa(Tank.toArray(Styles).map(function (style) {
                                    return style.name.concat("{\n"+Object.keys(style.attrs).map(function (el) {
                                        return "\t".concat(el, ':', style.attrs[el], ';\n');
                                    }).join(''),"}\n");
                                }).join(''))), type: "text/css", async: false}),
                            Selector: "head", exec: this.copy(this.flow)
                        }
                    };
                },

                /**
                 @param Tile ( { url: string, Selector: string } | Array.<{ url: string, Selector: string }> )
                 @param Handler ( this )
                 */
                tile: function (Tile, Handler) {
                    var Tiles = Tank.toArray(Tile).map(function (el) {
                        el.tankDone = function (xmlHttpRequest) {
                            new Tank.Handler(Handler.name + "_tile_child",
                                {append: {Element: Tank.createFragment(xmlHttpRequest.responseText), Selector: el.Selector}}, Handler).init();
                        };
                        return Tank.merge({url: Tank.expand(el.url, Handler, "encodeURIComponent($1)")}, el);
                    });
                    this.flow = {get: {Request: Tiles, exec: this.copy(this.flow)}};
                },

                /**
                 @param Selector ( string )
                 @param CssClass ( string |Array.<string>)
                 @param Fn { function(string|Array.<string>)}
                 */
                css: function (Selector, CssClass, Fn) {
                    var elements = Tank.element(Selector);
                    Tank.forEach(elements, function (el) {
                        Tank.forEach(CssClass, function (css) {
                            Fn.apply(el.classList, [css]);
                        });
                    });
                },
                /**
                 @param Request { {url: string, data: ?Object } | Array.<{url: string, method:string, data: ?Object }> }
                 @param TriggerEachRequest {?boolean}
                 @param Handler ( this )
                 */
                get: function (Request, TriggerEachRequest, Handler) {
                    var Requests = Tank.toArray(Request).map(function (el) {
                        return Tank.merge({method: 'get', url: Tank.expand(el.url, Handler, "encodeURIComponent($1)")}, el);
                    });
                    this.flow = {ajax: {Request: Requests, TriggerEachRequest: TriggerEachRequest, exec: this.copy(this.flow)}};
                },
                /**
                 @param Request { {url: string, data: ?Object } | Array.<{url: string, data: ?Object }> }
                 @param TriggerEachRequest {?boolean}
                 @param Handler ( this )
                 */
                post: function (Request, TriggerEachRequest, Handler) {
                    var Requests = Tank.toArray(Request).map(function (el) {
                        return Tank.merge({method: 'post', url: Tank.expand(el.url, Handler, "encodeURIComponent($1)")}, el);
                    });
                    this.flow = {ajax: {Request: Requests, TriggerEachRequest: TriggerEachRequest, exec: this.copy(this.flow)}};
                },
                /**
                 @function requires
                 @param Library { {url: string} | Array.<{url: string }> }
                 */
                requires: function (Library) {
                    this.flow = {script: {File: Library, exec: this.copy(this.flow)}};
                },
                /**
                 @param Log { {string} | Array.<{string}> }
                 */
                log: function (Log) {
                    console.log(Log);
                },
                logHandler: function () {
                    return {log: {Log: this}};
                },
                /**
                 @param Selector ( string )
                 @param CssClass ( string )
                 */
                toggleCss: function (Selector, CssClass) {
                    this.flow = {css: {Selector: Selector, CssClass: CssClass, Fn: DOMTokenList.prototype.toggle, exec: this.copy(this.flow)}};
                },
                /**
                 @param Selector ( string )
                 @param CssClass ( string )
                 */
                addCss: function (Selector, CssClass) {
                    this.flow = {css: {Selector: Selector, CssClass: CssClass, Fn: DOMTokenList.prototype.add, exec: this.copy(this.flow)}};
                },
                /**
                 @param Selector ( string )
                 @param CssClass ( string )
                 */
                removeCss: function (Selector, CssClass) {
                    this.flow = {css: {Selector: Selector, CssClass: CssClass, Fn: DOMTokenList.prototype.remove, exec: this.copy(this.flow)}};
                },
                /**
                 @param Selector ( string )
                 */
                show: function (Selector) {
                    this.flow = {removeCss: {Selector: Selector, CssClass: 'tank-hide', exec: this.copy(this.flow)}};
                },
                /**
                 @param Selector ( string )
                 */
                hide: function (Selector) {
                    this.flow = {addCss: {Selector: Selector, CssClass: 'tank-hide', exec: this.copy(this.flow)}};
                },
                /**
                 @param Selector ( string )
                 */
                fadeIn: function (Selector) {
                    this.flow = {
                        addCss: {Selector: Selector, CssClass: 'tank-fade'},
                        removeCss: {
                            Selector: Selector, CssClass: 'tank-fade-out',
                            exec: this.copy(this.flow)
                        }
                    }
                },
                /**
                 @param Selector ( string )
                 */
                fadeOut: function (Selector) {
                    this.flow = {
                        addCss: [
                            {Selector: Selector, CssClass: 'tank-fade'},
                            {Selector: Selector, CssClass: 'tank-fade-out', exec: this.copy(this.flow)}
                        ]
                    };
                },
                fadeShow: function (Selector) {
                    this.flow = {fadeIn: {Selector: Selector, show: {exec: this.copy(this.flow)}}};
                },

                fadeHide: function (Selector) {
                    this.flow = {fadeOut: {Selector: Selector, hide: {exec: this.copy(this.flow)}}};
                },

                /**
                 @param Selector ( string )
                 */
                toggleFade: function (Selector) {
                    this.flow = {
                        addCss: {Selector: Selector, CssClass: 'tank-fade'},
                        toggleCss: {Selector: Selector, CssClass: 'tank-fade-out', exec: this.copy(this.flow)}
                    }
                },

                DefaultBindingSelector: "[data-tank=\"{0}\"]"

                /*
                 json: function (Json, BindingSelector, Handler) {
                 var bindingSel = BindingSelector || Handler.$m.DefaultBindingSelector;
                 var nextJson = [];
                 Tank.forEach(Json, function (json) {
                 var model = Tank.typeOf(json.model) == Tank.TYPE_STRING ? Tank.model(json.model, Handler) : json.model;
                 var parsed = Tank.typeOf(model) == Tank.TYPE_STRING ? JSON.parse(model) : model;
                 var selectors = json.Selector.split('.');
                 console.log(json.Selector);
                 var elem;
                 Tank.forEach(selectors, function (sel) {
                 console.log((Tank.format(bindingSel, sel)));
                 elem = (elem || document).querySelectorAll(Tank.format(bindingSel, sel));
                 });
                 if (Tank.typeOf(parsed) == Tank.TYPE_OBJECT) {
                 Tank.forEach(Object.keys(parsed), function (keyProp) {
                 if (Tank.typeOf(parsed[keyProp]) == Tank.TYPE_OBJECT || Tank.typeOf(parsed[keyProp]) == Tank.TYPE_ARRAY) {
                 nextJson.push({ model: parsed[keyProp], Selector: json.Selector + '.' + keyProp  });
                 //                                    Tank.$f.json({ model: parsed[keyProp], Selector: json.Selector + '.' + keyProp  }, bindingSel, Handler);
                 }
                 });
                 }
                 });
                 if (nextJson.length) this.flow = { json: {Json:nextJson, BindingSelector: BindingSelector, exec : this.copy(this.flow) }};
                 }
                 */
            }
        }
    });
})();

