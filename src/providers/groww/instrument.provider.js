import { parse } from "csv-parse/sync";

export async function fetchGrowwInstruments() {
  const url = process.env.GROWW_INSTRUMENT_URL;

  if (!url) {
    throw new Error("GROWW_INSTRUMENT_URL is required");
  }

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Failed to fetch Groww instruments: ${response.status}`
    );
  }

  const csv = await response.text();

  const rows = parse(csv, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  });

  if (rows.length) {
    console.log(
      "Groww instrument columns:",
      Object.keys(rows[0])
    );
  }

  return rows;
}