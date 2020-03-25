type EventHandler = {
  <T>(args: T): void;
};

type EventsType = { [key: string]: EventHandler[] };

type actionType = keyof EventEmitterHandlers;

interface EventEmitterHandlers {
  on: (this: EventEmitter, type: string, handler: EventHandler) => void;
  off: (this: EventEmitter, type: string, handler: EventHandler) => void;
  _offAll: (this: EventEmitter) => void;
  _offByType: (this: EventEmitter, type: string) => void;
  _offByHandler: (
    this: EventEmitter,
    type: string,
    handler: EventHandler
  ) => void;
  trigger: (this: EventEmitter, event: EventType, args: [unknown]) => void;
  _dispatch: (this: EventEmitter, event: EventType, args: [unknown]) => void;
}

interface EventEmitter extends EventEmitterHandlers {
  new (): EventEmitter;
  events: EventsType;
  Event: EventType;
  mixin: (obj: EventEmitter, arr: actionType[]) => void;
}

interface EventType {
  new (type: string): EventType;
  type: string;
  timeStamp: Date;
}

var emitter: EventEmitter = {} as EventEmitter;

const Emitter: EventEmitter = (function() {
  var e = Object.create(emitter);
  e.events = {};
  return e;
} as Function) as EventEmitter;

interface EventConstructor {
  new (type: string): EventType;
  type: string;
  timeStamp: Date;
}

const Event: EventType = (function(this: EventType, type: string) {
  this.type = type;
  this.timeStamp = new Date();
} as Function) as EventType;

emitter.on = function(type: string, handler: EventHandler): EventEmitter {
  if (!this.events) {
    this.events = {};
    this.events[type] = [handler];
  }
  if (this.events.hasOwnProperty(type)) {
    this.events[type].push(handler);
  } else {
    this.events[type] = [handler];
  }
  return this;
};

emitter.off = function(type, handler) {
  if (arguments.length === 0) {
    return this._offAll();
  }
  if (handler === undefined) {
    return this._offByType(type);
  }
  return this._offByHandler(type, handler);
};

emitter.trigger = function(event, args) {
  let eventToDispatch: EventType;
  if (typeof event === "string") {
    eventToDispatch = new Event(event);
  } else {
    eventToDispatch = event;
  }
  return this._dispatch(eventToDispatch, args);
};

emitter._dispatch = function(event, args) {
  if (!this.events || !this.events.hasOwnProperty(event.type)) return;
  args = args || [];
  args.unshift(event);

  var handlers = this.events[event.type] || [];
  handlers.forEach(handler => handler.apply(null, args));
  return this;
};

emitter._offByHandler = function(type, handler) {
  if (!this.events.hasOwnProperty(type)) return;
  var i = this.events[type].indexOf(handler);
  if (i > -1) {
    this.events[type].splice(i, 1);
  }
  return this;
};

emitter._offByType = function(type) {
  if (this.events.hasOwnProperty(type)) {
    delete this.events[type];
  }
  return this;
};

emitter._offAll = function() {
  this.events = {};
  return this;
};

Emitter.Event = Event;

Emitter.mixin = function(obj: EventEmitter, arr: actionType[]) {
  var emitter: EventEmitter = new Emitter();
  arr.map(function(name: actionType) {
    obj[name] = function() {
      return (emitter[name] as any).apply(emitter, arguments);
    };
  });
};
