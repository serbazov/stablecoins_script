const { GoogleSpreadsheet } = require("google-spreadsheet");
const doc = new GoogleSpreadsheet(
  "1wBlZOu2lN7E68RIK1UwjGIgobYjX6ZcIXKD1VEr2DLQ"
);
const spreadsheetId = "1wBlZOu2lN7E68RIK1UwjGIgobYjX6ZcIXKD1VEr2DLQ";
const creds = require("./credentials.json");
const { google } = require("googleapis");
const { run } = require("googleapis/build/src/apis/run");

async function tests() {
  await doc.useServiceAccountAuth(creds);
  // const sheet = await doc.addSheet({
  //   headerValues: ["Time", "UnixTime"],
  // });
  await doc.loadInfo();
  const sheet1 = doc.sheetsByIndex[2];

  // await sheet.addRow({
  //   Time: Date(Date.now),
  //   UnixTime: Date.now(),
  // });
  await sheet1.addRow([Date(Date.now), Date.now(), Date.now()]);
}

tests();
