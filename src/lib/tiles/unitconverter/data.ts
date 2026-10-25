export interface UnitDef {
  id: string;
  name: string;
  toBase: number;
}

export interface UnitCategory {
  name: string;
  base: string;
  units: UnitDef[];
}

export const categories: UnitCategory[] = [
  {
    name: "Length",
    base: "meter",
    units: [
      { id: "nm", name: "nanometer", toBase: 1e-9 },
      { id: "um", name: "micrometer", toBase: 1e-6 },
      { id: "mm", name: "millimeter", toBase: 0.001 },
      { id: "cm", name: "centimeter", toBase: 0.01 },
      { id: "m", name: "meter", toBase: 1 },
      { id: "km", name: "kilometer", toBase: 1000 },
      { id: "in", name: "inch", toBase: 0.0254 },
      { id: "ft", name: "foot", toBase: 0.3048 },
      { id: "yd", name: "yard", toBase: 0.9144 },
      { id: "mi", name: "mile", toBase: 1609.344 },
      { id: "nmi", name: "nautical mile", toBase: 1852 },
      { id: "ly", name: "light-year", toBase: 9.4607e15 },
    ],
  },
  {
    name: "Mass",
    base: "kilogram",
    units: [
      { id: "mg", name: "milligram", toBase: 1e-6 },
      { id: "g", name: "gram", toBase: 0.001 },
      { id: "kg", name: "kilogram", toBase: 1 },
      { id: "t", name: "metric ton", toBase: 1000 },
      { id: "oz", name: "ounce", toBase: 0.028349523125 },
      { id: "lb", name: "pound", toBase: 0.45359237 },
      { id: "slug", name: "slug", toBase: 14.5939 },
      { id: "u", name: "atomic mass unit", toBase: 1.66053906660e-27 },
    ],
  },
  {
    name: "Time",
    base: "second",
    units: [
      { id: "ns", name: "nanosecond", toBase: 1e-9 },
      { id: "us", name: "microsecond", toBase: 1e-6 },
      { id: "ms", name: "millisecond", toBase: 0.001 },
      { id: "s", name: "second", toBase: 1 },
      { id: "min", name: "minute", toBase: 60 },
      { id: "hr", name: "hour", toBase: 3600 },
      { id: "day", name: "day", toBase: 86400 },
      { id: "wk", name: "week", toBase: 604800 },
      { id: "yr", name: "year (365d)", toBase: 31536000 },
    ],
  },
  {
    name: "Energy",
    base: "joule",
    units: [
      { id: "J", name: "joule", toBase: 1 },
      { id: "kJ", name: "kilojoule", toBase: 1000 },
      { id: "cal", name: "calorie", toBase: 4.184 },
      { id: "kcal", name: "kilocalorie", toBase: 4184 },
      { id: "Wh", name: "watt-hour", toBase: 3600 },
      { id: "kWh", name: "kilowatt-hour", toBase: 3.6e6 },
      { id: "eV", name: "electronvolt", toBase: 1.602176634e-19 },
      { id: "BTU", name: "British thermal unit", toBase: 1055.05585 },
    ],
  },
  {
    name: "Pressure",
    base: "pascal",
    units: [
      { id: "Pa", name: "pascal", toBase: 1 },
      { id: "kPa", name: "kilopascal", toBase: 1000 },
      { id: "bar", name: "bar", toBase: 100000 },
      { id: "atm", name: "atmosphere", toBase: 101325 },
      { id: "psi", name: "pounds/sq.in", toBase: 6894.757293168 },
      { id: "torr", name: "torr", toBase: 133.322368421 },
      { id: "mmHg", name: "mm of mercury", toBase: 133.322387415 },
    ],
  },
  {
    name: "Speed",
    base: "meter/second",
    units: [
      { id: "mps", name: "meter/second", toBase: 1 },
      { id: "kph", name: "kilometer/hour", toBase: 1 / 3.6 },
      { id: "mph", name: "mile/hour", toBase: 0.44704 },
      { id: "fps", name: "foot/second", toBase: 0.3048 },
      { id: "knot", name: "knot", toBase: 0.514444 },
      { id: "c", name: "speed of light", toBase: 299792458 },
    ],
  },
  {
    name: "Area",
    base: "square meter",
    units: [
      { id: "mm2", name: "mm²", toBase: 1e-6 },
      { id: "cm2", name: "cm²", toBase: 1e-4 },
      { id: "m2", name: "m²", toBase: 1 },
      { id: "ha", name: "hectare", toBase: 10000 },
      { id: "km2", name: "km²", toBase: 1e6 },
      { id: "in2", name: "in²", toBase: 0.00064516 },
      { id: "ft2", name: "ft²", toBase: 0.09290304 },
      { id: "acre", name: "acre", toBase: 4046.8564224 },
    ],
  },
  {
    name: "Volume",
    base: "liter",
    units: [
      { id: "mL", name: "milliliter", toBase: 0.001 },
      { id: "L", name: "liter", toBase: 1 },
      { id: "m3", name: "m³", toBase: 1000 },
      { id: "tsp", name: "teaspoon (US)", toBase: 0.00492892159375 },
      { id: "tbsp", name: "tablespoon (US)", toBase: 0.01478676478 },
      { id: "cup", name: "cup (US)", toBase: 0.2365882365 },
      { id: "pt", name: "pint (US)", toBase: 0.473176473 },
      { id: "qt", name: "quart (US)", toBase: 0.946352946 },
      { id: "gal", name: "gallon (US)", toBase: 3.785411784 },
      { id: "ft3", name: "ft³", toBase: 28.316846592 },
    ],
  },
  {
    name: "Force",
    base: "newton",
    units: [
      { id: "N", name: "newton", toBase: 1 },
      { id: "kN", name: "kilonewton", toBase: 1000 },
      { id: "dyn", name: "dyne", toBase: 1e-5 },
      { id: "lbf", name: "pound-force", toBase: 4.4482216152605 },
      { id: "kgf", name: "kilogram-force", toBase: 9.80665 },
    ],
  },
  {
    name: "Power",
    base: "watt",
    units: [
      { id: "W", name: "watt", toBase: 1 },
      { id: "kW", name: "kilowatt", toBase: 1000 },
      { id: "MW", name: "megawatt", toBase: 1e6 },
      { id: "hp", name: "horsepower", toBase: 745.69987158227 },
      { id: "BTUh", name: "BTU/hour", toBase: 0.29307107 },
    ],
  },
  {
    name: "Data",
    base: "byte",
    units: [
      { id: "bit", name: "bit", toBase: 0.125 },
      { id: "B", name: "byte", toBase: 1 },
      { id: "KB", name: "kilobyte (1024B)", toBase: 1024 },
      { id: "MB", name: "megabyte", toBase: 1024 ** 2 },
      { id: "GB", name: "gigabyte", toBase: 1024 ** 3 },
      { id: "TB", name: "terabyte", toBase: 1024 ** 4 },
    ],
  },
  {
    name: "Angle",
    base: "radian",
    units: [
      { id: "rad", name: "radian", toBase: 1 },
      { id: "deg", name: "degree", toBase: Math.PI / 180 },
      { id: "grad", name: "gradian", toBase: Math.PI / 200 },
      { id: "arcmin", name: "arcminute", toBase: Math.PI / 10800 },
      { id: "arcsec", name: "arcsecond", toBase: Math.PI / 648000 },
      { id: "rev", name: "revolution", toBase: 2 * Math.PI },
    ],
  },
];

/** Temperature isn't a pure scale factor (there's an offset), so it's handled separately. */
export function convertTemperature(value: number, from: string, to: string): number {
  const toKelvin: Record<string, (v: number) => number> = {
    K: (v) => v,
    C: (v) => v + 273.15,
    F: (v) => ((v - 32) * 5) / 9 + 273.15,
  };
  const fromKelvin: Record<string, (v: number) => number> = {
    K: (v) => v,
    C: (v) => v - 273.15,
    F: (v) => ((v - 273.15) * 9) / 5 + 32,
  };
  return fromKelvin[to](toKelvin[from](value));
}

export const temperatureUnits = [
  { id: "C", name: "celsius" },
  { id: "F", name: "fahrenheit" },
  { id: "K", name: "kelvin" },
];
