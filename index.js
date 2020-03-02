"use strict";
exports.__esModule = true;
var defaults = {
    symbol: '$',
    separator: ',',
    decimal: '.',
    formatWithSymbol: false,
    errorOnInvalid: false,
    precision: 2,
    pattern: '!#',
    negativePattern: '-!#'
};
var round = function (v) { return Math.round(v); };
var pow = function (p) { return Math.pow(10, p); };
var rounding = function (value, increment) { return round(value / increment) * increment; };
var groupRegex = /(\d)(?=(\d{3})+\b)/g;
var vedicRegex = /(\d)(?=(\d\d)+\d\b)/g;
var currency = function (value, opts) {
    var that = this;
    if (!(that instanceof currency)) {
        return new currency(value, opts);
    }
    var settings = Object.assign({}, defaults, opts), precision = pow(settings.precision), v = parse(value, settings);
    that.intValue = v;
    that.value = v / precision;
    // Set default incremental value
    settings.increment = settings.increment || (1 / precision);
    // Support vedic numbering systems
    // see: https://en.wikipedia.org/wiki/Indian_numbering_system
    if (settings.useVedic) {
        settings.groups = vedicRegex;
    }
    else {
        settings.groups = groupRegex;
    }
    // Intended for internal usage only - subject to change
    this._settings = settings;
    this._precision = precision;
};
function parse(value, opts, useRounding) {
    if (useRounding === void 0) { useRounding = true; }
    var v = 0, decimal = opts.decimal, errorOnInvalid = opts.errorOnInvalid, decimals = opts.precision, precision = pow(decimals);
    if (value instanceof currency) {
        v = value.value * precision;
    }
    else if (typeof value === 'number') {
        v = value;
    }
    else if (typeof value === 'string') {
        var regex = new RegExp('[^-\\d' + decimal + ']', 'g'), decimalString = new RegExp('\\' + decimal, 'g');
        v = Number(value
            .replace(/\((.*)\)/, '-$1') // allow negative e.g. (1.99)
            .replace(regex, '') // replace any non numeric values
            .replace(decimalString, '.')) // convert any decimal values
            * precision; // scale number to integer value
        v = v || 0;
    }
    else {
        if (errorOnInvalid) {
            throw Error('Invalid Input');
        }
        v = 0;
    }
    // Handle additional decimal for proper rounding.
    v = Number(v.toFixed(4));
    return useRounding ? round(v) : v;
}
currency.prototype = {
    /**
     * Adds values together.
     * @param {number} number
     * @returns {currency}
     */
    add: function (number) {
        var _a = this, intValue = _a.intValue, _settings = _a._settings, _precision = _a._precision;
        return currency((intValue += parse(number, _settings)) / _precision, _settings);
    },
    /**
     * Subtracts value.
     * @param {number} number
     * @returns {currency}
     */
    subtract: function (number) {
        var _a = this, intValue = _a.intValue, _settings = _a._settings, _precision = _a._precision;
        return currency((intValue -= parse(number, _settings)) / _precision, _settings);
    },
    /**
     * Multiplies values.
     * @param {number} number
     * @returns {currency}
     */
    multiply: function (number) {
        var _a = this, intValue = _a.intValue, _settings = _a._settings;
        return currency((intValue *= number) / pow(_settings.precision), _settings);
    },
    /**
     * Divides value.
     * @param {number} number
     * @returns {currency}
     */
    divide: function (number) {
        var _a = this, intValue = _a.intValue, _settings = _a._settings;
        return currency(intValue /= parse(number, _settings, false), _settings);
    },
    /**
     * Takes the currency amount and distributes the values evenly. Any extra pennies
     * left over from the distribution will be stacked onto the first set of entries.
     * @param {number} count
     * @returns {array}
     */
    distribute: function (count) {
        var _a = this, intValue = _a.intValue, _precision = _a._precision, _settings = _a._settings;
        var distribution = [];
        var split = Math[intValue >= 0 ? 'floor' : 'ceil'](intValue / count);
        var pennies = Math.abs(intValue - (split * count));
        for (; count !== 0; count--) {
            var item = currency(split / _precision, _settings);
            // Add any left over pennies
            pennies-- > 0 && (item = intValue >= 0 ? item.add(1 / _precision) : item.subtract(1 / _precision));
            distribution.push(item);
        }
        return distribution;
    },
    /**
     * Returns the dollar value.
     * @returns {number}
     */
    dollars: function () {
        return ~~this.value;
    },
    /**
     * Returns the cent value.
     * @returns {number}
     */
    cents: function () {
        var _a = this, intValue = _a.intValue, _precision = _a._precision;
        return ~~(intValue % _precision);
    },
    /**
     * Formats the value as a string according to the formatting settings.
     * @param {boolean} useSymbol - format with currency symbol
     * @returns {string}
     */
    format: function (useSymbol) {
        var _a = this._settings, pattern = _a.pattern, negativePattern = _a.negativePattern, formatWithSymbol = _a.formatWithSymbol, symbol = _a.symbol, separator = _a.separator, decimal = _a.decimal, groups = _a.groups, values = (this + '').replace(/^-/, '').split('.'), dollars = values[0], cents = values[1];
        // set symbol formatting
        typeof (useSymbol) === 'undefined' && (useSymbol = formatWithSymbol);
        return (this.value >= 0 ? pattern : negativePattern)
            .replace('!', useSymbol ? symbol : '')
            .replace('#', "" + dollars.replace(groups, '$1' + separator) + (cents ? decimal + cents : ''));
    },
    /**
     * Formats the value as a string according to the formatting settings.
     * @returns {string}
     */
    toString: function () {
        var _a = this, intValue = _a.intValue, _precision = _a._precision, _settings = _a._settings;
        return rounding(intValue / _precision, _settings.increment).toFixed(_settings.precision);
    },
    /**
     * Value for JSON serialization.
     * @returns {float}
     */
    toJSON: function () {
        return this.value;
    }
};
exports["default"] = currency;
