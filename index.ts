interface DefaultSettings {
  symbol: string,
  separator: string,
  decimal: string,
  formatWithSymbol: boolean,
  errorOnInvalid: boolean,
  precision: number,
  pattern: string,
  negativePattern: string
}

const defaults: DefaultSettings = {
  symbol: '$',
  separator: ',',
  decimal: '.',
  formatWithSymbol: false,
  errorOnInvalid: false,
  precision: 2,
  pattern: '!#',
  negativePattern: '-!#'
};

interface Settings extends DefaultSettings {
  increment: number,
  useVedic: boolean,
  groups: RegExp

}

type OneArgumentMathFunc = (param: number) => number
type TwoArgumentsMathFunc = (a: number, b: number) => number
const round: OneArgumentMathFunc = v => Math.round(v);
const pow: OneArgumentMathFunc = p => Math.pow(10, p);
const rounding: TwoArgumentsMathFunc = (value, increment) => round(value / increment) * increment;

const groupRegex: RegExp = /(\d)(?=(\d{3})+\b)/g;
const vedicRegex: RegExp = /(\d)(?=(\d\d)+\d\b)/g;

/* Create a new instance of currency.js
* @param {number|string|currency} value
* @param {object} [opts]
*/

type Value = number | string | Currency

interface Currency {
  new(value: Value, opts: Settings): Currency,
  (value: Value, opts: Settings): Currency
  intValue: number,
  value: number,
  _settings: Settings,
  _precision: number,
  add(number: number): Currency,
  subtract(number: number): Currency,
  multiply(number: number): Currency,
  divide(number: number): Currency,
  distribute(count: number): Currency[],
  dollars(): number,
  cents(): number,
  format(useSymbol: boolean): string,
  toString(): string,
  toJSON(): number
}

const currency: Currency = (function (this: Currency, value: Value, opts: Settings):Currency|void {
  let that = this;

  if (!(that instanceof currency)) {
    return new currency(value, opts);
  }

  let settings: Settings = Object.assign({}, defaults, opts)
    , precision = pow(settings.precision)
    , v = parse(value, settings);

  that.intValue = v;
  that.value = v / precision;

  // Set default incremental value
  settings.increment = settings.increment || (1 / precision);

  // Support vedic numbering systems
  // see: https://en.wikipedia.org/wiki/Indian_numbering_system
  if (settings.useVedic) {
    settings.groups = vedicRegex;
  } else {
    settings.groups = groupRegex;
  }

  // Intended for internal usage only - subject to change
  this._settings = settings;
  this._precision = precision;
}) as Currency;

function parse(value: Value, opts: Settings, useRounding: boolean = true): number {
  let v: number = 0
    , { decimal, errorOnInvalid, precision: decimals } = opts
    , precision = pow(decimals);

  if (value instanceof currency) {
    v = value.value * precision;
  } else if (typeof value === 'number') {
    v = value
  } else if (typeof value === 'string') {
    let regex = new RegExp('[^-\\d' + decimal + ']', 'g')
      , decimalString = new RegExp('\\' + decimal, 'g');
    v = Number(value
      .replace(/\((.*)\)/, '-$1')   // allow negative e.g. (1.99)
      .replace(regex, '')           // replace any non numeric values
      .replace(decimalString, '.'))  // convert any decimal values
      * precision;                  // scale number to integer value
    v = v || 0;
  } else {
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
  add(number: number): Currency {
    let { intValue, _settings, _precision } = this;
    return currency((intValue += parse(number, _settings)) / _precision, _settings);
  },

  /**
   * Subtracts value.
   * @param {number} number
   * @returns {currency}
   */
  subtract(number: number): Currency {
    let { intValue, _settings, _precision } = this;
    return currency((intValue -= parse(number, _settings)) / _precision, _settings);
  },

  /**
   * Multiplies values.
   * @param {number} number
   * @returns {currency}
   */
  multiply(number: number): Currency {
    let { intValue, _settings } = this;
    return currency((intValue *= number) / pow(_settings.precision), _settings);
  },

  /**
   * Divides value.
   * @param {number} number
   * @returns {currency}
   */
  divide(number: number): Currency {
    let { intValue, _settings } = this;
    return currency(intValue /= parse(number, _settings, false), _settings);
  },

  /**
   * Takes the currency amount and distributes the values evenly. Any extra pennies
   * left over from the distribution will be stacked onto the first set of entries.
   * @param {number} count
   * @returns {array}
   */
  distribute(count: number): Currency[] {
    let { intValue, _precision, _settings } = this;
    let distribution: Currency[] = [];
    let split = Math[intValue >= 0 ? 'floor' : 'ceil'](intValue / count)
    let pennies = Math.abs(intValue - (split * count));

    for (; count !== 0; count--) {
      let item = currency(split / _precision, _settings);

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
  dollars(): number {
    return ~~this.value;
  },

  /**
   * Returns the cent value.
   * @returns {number}
   */
  cents(): number {
    let { intValue, _precision } = this;
    return ~~(intValue % _precision);
  },

  /**
   * Formats the value as a string according to the formatting settings.
   * @param {boolean} useSymbol - format with currency symbol
   * @returns {string}
   */
  format(useSymbol: boolean): string {
    let { pattern, negativePattern, formatWithSymbol, symbol, separator, decimal, groups } = this._settings
      , values = (this + '').replace(/^-/, '').split('.')
      , dollars = values[0]
      , cents = values[1];

    // set symbol formatting
    typeof (useSymbol) === 'undefined' && (useSymbol = formatWithSymbol);

    return (this.value >= 0 ? pattern : negativePattern)
      .replace('!', useSymbol ? symbol : '')
      .replace('#', `${dollars.replace(groups, '$1' + separator)}${cents ? decimal + cents : ''}`);
  },

  /**
   * Formats the value as a string according to the formatting settings.
   * @returns {string}
   */
  toString(): string {
    let { intValue, _precision, _settings } = this;
    return rounding(intValue / _precision, _settings.increment).toFixed(_settings.precision);
  },

  /**
   * Value for JSON serialization.
   * @returns {float}
   */
  toJSON(this: Currency): number {
    return this.value;
  }

};

export default currency;