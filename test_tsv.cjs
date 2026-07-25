const fs = require('fs');

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
8. No clear breakdown of revenue by month	Not Fixed	Attach screenshot (image.png - Sav Zaman Properties dashboard)
TC-03	Edit Functionality for Created To-do Items	To verify that once a To-do is created, the user is able to edit it (update title, description, due date, status, etc.)	1. Log in to SalesNxt Sales Cloud
2. Navigate to the client dashboard for "Sav Zaman Properties"
3. Locate the "To-do" or "Follow-ups" section
4. Create a new To-do item with title, description, due date, and status
5. Save the To-do
6. Try to edit the same To-do by clicking on it or using an edit icon
7. Change a field (e.g., due date or status) and save again	1. No edit option/icon is available for existing To-do items
8. Clicking on the To-do either opens a view-only mode or does nothing
9. User cannot update status (e.g., from "Pending" to "Completed")
10. No right-click or inline edit functionality exists
11. Workaround: User has to delete and recreate the To-do, which is inefficient	Not Fixed	Attach screenshot showing the To-do section with no edit option`;

  const firstLineEnd = input.indexOf('\n');
  const firstLine = input.substring(0, firstLineEnd !== -1 ? firstLineEnd : input.length);
  const isTsv = firstLine.split('\t').length > firstLine.split(',').length;

console.log("firstLine:", JSON.stringify(firstLine));
console.log("isTsv:", isTsv);
console.log("tabs:", firstLine.split('\t').length);
console.log("commas:", firstLine.split(',').length);
