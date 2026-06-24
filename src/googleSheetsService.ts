import { getAccessToken } from "./googleAuth";

const SHEET_NAME = "Cotizaciones";

export async function createSpreadsheet(accessToken: string): Promise<string> {
  const response = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      properties: {
        title: "Cotizaciones App - Reportes",
      },
      sheets: [
        {
          properties: {
            title: SHEET_NAME,
          },
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || "Failed to create spreadsheet");
  }

  const data = await response.json();
  const spreadsheetId = data.spreadsheetId;

  // Set the header row
  await appendRow(spreadsheetId, accessToken, [
    "ID",
    "Fecha",
    "Cliente",
    "RUC",
    "Proyecto",
    "Subtotal",
    "IGV",
    "Total",
    "Moneda",
    "Estado"
  ]);

  return spreadsheetId;
}

export async function appendRow(spreadsheetId: string, accessToken: string, values: any[]) {
  const range = `${SHEET_NAME}!A:Z`;
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        values: [values],
      }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || "Failed to append row");
  }

  return response.json();
}
