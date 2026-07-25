const fs = require('fs');

function parseCSV(text) {
  const rows = [];
  let currentRow = [];
  let token = '';
  let insideQuote = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuote && nextChar === '"') {
        token += '"';
        i++;
      } else {
        insideQuote = !insideQuote;
      }
    } else if (char === ',' && !insideQuote) {
      currentRow.push(token.trim());
      token = '';
    } else if ((char === '\r' || char === '\n') && !insideQuote) {
      if (char === '\r' && nextChar === '\n') i++;
      currentRow.push(token.trim());
      rows.push(currentRow);
      currentRow = [];
      token = '';
    } else {
      token += char;
    }
  }
  if (token || currentRow.length > 0) {
    currentRow.push(token.trim());
    rows.push(currentRow);
  }
  return rows;
}

const input = `TC No.,Test Case Name,Test Objective,Test Steps,Issues,Status (Fixed or Not),Screenshot
TC-01,Verify Payment & Due Amount Visibility,"To check if the dashboard clearly shows how much the client has paid and how much they are supposed to pay","1. Log in to SalesNxt Sales Cloud
2. Navigate to the client dashboard for ""Sav Zaman Properties""
3. Check the ""TOTALS"" section
4. Verify if ""Total Revenue (CLV)"", ""Payment Due"", and ""Payment Invoices"" fields are present and populated
5. Check if any field indicates the actual billed amount or expected payment","The dashboard shows Total Revenue (CLV) = ₹51,094 and Payment Due = ₹0, but does not clearly mention how much the client was actually billed/invoiced for the current period or what they should pay. The amount the client ""should pay"" is missing.",Not Fixed,Attach screenshot (image.png - Sav Zaman Properties dashboard)`;

console.log(parseCSV(input));
