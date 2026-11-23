// CONFIG FILE: weekly U.S. EIA gas-price snapshot used by Trip Cost. Update the numbers, `week` and `released` each time you refresh them.
// Source: https://www.eia.gov/petroleum/gasdiesel/ . Loaded BEFORE tripcost.js. Exposes window.GasData.
window.GasData = { src: "https://www.eia.gov/petroleum/gasdiesel/", srcName: "U.S. EIA Gasoline and Diesel Fuel Update", week: "2026-11-02", released: "2026-11-03",
  padd: { "1A": ["New England (PADD 1A)", 4.145], "1B": ["Central Atlantic (PADD 1B)", 4.232], "1C": ["Lower Atlantic (PADD 1C)", 3.695], "2": ["Midwest (PADD 2)", 4.102], "3": ["Gulf Coast (PADD 3)", 3.636], "4": ["Rocky Mountain (PADD 4)", 4.213], "5": ["West Coast less California", 4.771] },
  state: { CA: 5.748, CO: 4.068, FL: 3.791, MA: 4.104, MN: 4.017, NY: 4.217, OH: 4.090, TX: 3.578, WA: 5.095 }, us: 4.153 };
