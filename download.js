const cheerio = require('cheerio');
const request = require('request');

const RIVM_BASE_URL = 'https://www.volksgezondheidenzorg.info';
const RIVM_INFO_URL = '/onderwerp/infectieziekten/regionaal-internationaal/coronavirus-covid-19';

request(RIVM_BASE_URL + RIVM_INFO_URL, (err, response, html) => {
  if (err) {
    throw err;
  }

  const $ = cheerio.load(html);
  const csvEl = $('#csvData');

  process.stdout.write(`${csvEl.text().trim()}\n`);
});
