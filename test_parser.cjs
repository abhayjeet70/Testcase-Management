const input = `TC No.	Test Case Name	Test Objective	Test Steps	Issues	Status (Fixed or Not)	Screenshot
TC-01	Verify Payment & Due Amount Visibility	To check if the dashboard clearly shows how much the client has paid and how much they are supposed to pay	1. Log in to SalesNxt Sales Cloud
2. Navigate to the client dashboard for "Sav Zaman Properties"
3. Check the "TOTALS" section
4. Verify if "Total Revenue (CLV)", "Payment Due", and "Payment Invoices" fields are present and populated
5. Check if any field indicates the actual billed amount or expected payment	The dashboard shows Total Revenue (CLV) = ₹51,094 and Payment Due = ₹0, but does not clearly mention how much the client was actually billed/invoiced for the current period or what they should pay. The amount the client "should pay" is missing.	Not Fixed	Attach screenshot (image.png - Sav Zaman Properties dashboard)
TC-02	Display Total Outstanding & Monthly Revenue on Dashboard	To verify that the dashboard clearly shows total outstanding (payment due) and monthly revenue for the client	1. Log in to SalesNxt Sales Cloud
2. Navigate to the client dashboard for "Sav Zaman Properties"
3. Check the "TOTALS" section
4. Verify if "Total Outstanding" (current pending amount) is displayed clearly
5. Verify if "Monthly Revenue" (revenue earned this month) is shown separately from CLV
6. Check if both values are accurate and updated in real-time	1. Total Outstanding is shown as "Payment Due: ₹0" — but this may not reflect the actual billed amount if invoices are generated
7. Monthly Revenue is not displayed anywhere — only "Total Revenue (CLV)" of ₹51,094 is shown, which is lifetime value, not monthly
8. No clear breakdown of revenue by month	Not Fixed	Attach screenshot (image.png - Sav Zaman Properties dashboard)`;

function parseCsvContent(text) {
  const lines = [];
  const firstLineEnd = text.indexOf('\n');
  const firstLine = text.substring(0, firstLineEnd !== -1 ? firstLineEnd : text.length);
  const isTsv = firstLine.split('\t').length > firstLine.split(',').length;

  if (isTsv) {
    const rawLines = text.split(/\r?\n/);
    const expectedCols = firstLine.split('\t').length;
    let currentRow = [];
    
    for (const line of rawLines) {
      if (!line.trim() && currentRow.length === 0) continue;
      const parts = line.split('\t');
      
      if (currentRow.length === 0) {
        currentRow = [...parts];
      } else {
        const lastIndex = currentRow.length - 1;
        currentRow[lastIndex] += '\n' + parts[0];
        for (let i = 1; i < parts.length; i++) {
          currentRow.push(parts[i]);
        }
      }
      
      if (currentRow.length >= expectedCols) {
        lines.push(currentRow.map(c => c.trim().replace(/^"|"$/g, '').trim()));
        currentRow = [];
      }
    }
    if (currentRow.length > 0) {
      lines.push(currentRow.map(c => c.trim().replace(/^"|"$/g, '').trim()));
    }
  }

  const headers = lines[0].map(h => h.toLowerCase());
  const tcNoIdx = headers.findIndex(h => h.includes('no') || h.includes('id') || h.includes('tc'));
  const nameIdx = headers.findIndex(h => h.includes('name') || h.includes('title'));
  const objIdx = headers.findIndex(h => h.includes('objective') || h.includes('goal'));
  const stepsIdx = headers.findIndex(h => h.includes('steps') || h.includes('procedure'));
  const issuesIdx = headers.findIndex(h => h.includes('issues') || h.includes('bugs') || h.includes('block'));
  const statusIdx = headers.findIndex(h => h.includes('status') || h.includes('result'));
  
  return { headers, indices: { tcNoIdx, nameIdx, objIdx, stepsIdx, issuesIdx, statusIdx }, firstRow: lines[1] };
}

console.log(JSON.stringify(parseCsvContent(input), null, 2));
