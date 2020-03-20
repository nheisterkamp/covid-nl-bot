const dotenv = require('dotenv');
dotenv.config();

const fs = require('fs');
const TelegramBot = require('node-telegram-bot-api');
const massive = require('massive');
const cheerio = require('cheerio');
const request = require('request');
const csvParse = require('csv-parse');

const RIVM_BASE_URL = 'https://www.volksgezondheidenzorg.info';
const RIVM_INFO_URL = '/onderwerp/infectieziekten/regionaal-internationaal/coronavirus-covid-19';

const API_TOKEN = process.env.API_TOKEN;
const POSTGRES_URL = process.env.POSTGRES_URL;

if (!API_TOKEN) {
  throw new Error('missing API_TOKEN');
}

const main = async () => {
  const db = await massive({
    connectionString: POSTGRES_URL,
    enhancedFunctions: true,
    poolSize: 50,
  });

  if (!db.gemeenten) {
    await db._init_schema();
    await db.reload();
  }

  const gemeenten = await db.gemeenten.find({ stop_date: null });

  request(RIVM_BASE_URL + RIVM_INFO_URL, async (err, response, html) => {
    if (err) {
      throw err;
    }

    const $ = cheerio.load(html);
    const csvEl = $('#csvData');
    const data = `${csvEl.text().trim()}\n`;

    const now = new Date();
    fs.writeFileSync(`./data/${now.toISOString()}.csv`, data);
    
    const gemeentenMap = new Map(gemeenten.map(gemeente => ([gemeente.nummer, gemeente])));

    csvParse(data, {
      columns: true,
      skip_empty_lines: true,
      delimiter: ';',
    }, async (csvErr, records) => {
      if (csvErr) {
        throw csvErr;
      }

      let updated = 1;

      for (const record of records) {
        const gemeente = {
          nummer: +record.Gemnr,
          naam: record.Gemeente,
          gevallen: +record.Aantal || 0,
          bevolking: +record.BevAant,
          start_date: now,
          stop_date: null,
        };

        const existingGemeente = gemeentenMap.get(gemeente.nummer);

        if (existingGemeente) {
          if (existingGemeente.gevallen !== gemeente.gevallen) {
            await db.gemeenten.update({
              id: existingGemeente.id,
            }, {
              stop_date: now,
            });
            await db.gemeenten.insert(gemeente);
            updated++;
          }
        } else {
          await db.gemeenten.insert(gemeente);
        }
      }
      
      console.log(`Updated ${updated} gemeenten`);

      if (updated) {
        const bot = new TelegramBot(API_TOKEN);
        const [{ aantal }] = await db.query(`
          select sum(gevallen) as aantal
          from gemeenten
          where stop_date is null
        `)
        await bot.sendMessage('@covid_nl', `Er zijn op dit moment in totaal ${aantal} COVID-19 positief geteste personen in Nederland.`);
      }

      process.exit(0);
    });
  });
};

main();
