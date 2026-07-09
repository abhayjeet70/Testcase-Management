import mammoth from 'mammoth';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { 
  Document, Packer, Paragraph, Table, TableCell, TableRow, 
  WidthType, TextRun, AlignmentType, BorderStyle, HeadingLevel,
  ImageRun
} from 'docx';
import { TestCase, Project, TestCaseStatus } from '../types';
import { generateId } from './storage';

// Helper to convert base64 image strings to Uint8Array for docx embedding
function base64ToUint8Array(base64String: string): Uint8Array {
  // If it's a data URL, extract the raw base64 part
  const base64Index = base64String.indexOf(';base64,');
  const base64 = base64Index !== -1 ? base64String.substring(base64Index + 8) : base64String;
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function readImageAsUint8Array(imageValue: string): Promise<Uint8Array | null> {
  const value = imageValue?.trim();
  if (!value) return null;

  try {
    if (value.startsWith('data:')) {
      return base64ToUint8Array(value);
    }

    const response = await fetch(value, { cache: 'no-store' });
    if (!response.ok) throw new Error('Image fetch failed');
    const arrayBuffer = await response.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  } catch {
    try {
      const absoluteUrl = new URL(value, window.location.href).toString();
      const fallbackResponse = await fetch(absoluteUrl, { cache: 'no-store' });
      if (!fallbackResponse.ok) return null;
      const arrayBuffer = await fallbackResponse.arrayBuffer();
      return new Uint8Array(arrayBuffer);
    } catch {
      return null;
    }
  }
}

function inferImageType(imageValue: string): 'png' | 'jpeg' | 'gif' | 'webp' | 'bmp' | 'tiff' {
  const lower = imageValue.toLowerCase();
  if (lower.includes('image/png')) return 'png';
  if (lower.includes('image/jpeg') || lower.includes('image/jpg')) return 'jpeg';
  if (lower.includes('image/gif')) return 'gif';
  if (lower.includes('image/webp')) return 'webp';
  if (lower.includes('image/bmp')) return 'bmp';
  if (lower.includes('image/tiff')) return 'tiff';
  if (lower.endsWith('.png')) return 'png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'jpeg';
  if (lower.endsWith('.gif')) return 'gif';
  if (lower.endsWith('.webp')) return 'webp';
  if (lower.endsWith('.bmp')) return 'bmp';
  if (lower.endsWith('.tiff') || lower.endsWith('.tif')) return 'tiff';
  return 'png';
}

// --- WORD IMPORT (.docx) ---
export async function parseDocxFile(file: File): Promise<Partial<TestCase>[]> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    // Convert to html
    const { value: html } = await mammoth.convertToHtml({ arrayBuffer });
    
    // We parse the HTML to find any tables and extract test cases
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const tables = doc.querySelectorAll('table');

    if (tables.length === 0) {
      throw new Error('No test case table detected in the Word document.');
    }

    const testCases: Partial<TestCase>[] = [];
    
    // Process the first table detected
    const table = tables[0];
    const rows = Array.from(table.querySelectorAll('tr'));
    
    if (rows.length < 2) {
      throw new Error('Table does not contain enough rows.');
    }

    // Identify header indices
    const headers = Array.from(rows[0].querySelectorAll('td, th')).map(cell => 
      cell.textContent?.trim().toLowerCase() || ''
    );

    const tcNoIdx = headers.findIndex(h => h.includes('no') || h.includes('id') || h.includes('tc'));
    const nameIdx = headers.findIndex(h => h.includes('name') || h.includes('title'));
    const objIdx = headers.findIndex(h => h.includes('objective') || h.includes('goal'));
    const stepsIdx = headers.findIndex(h => h.includes('step') || h.includes('procedure'));
    const issuesIdx = headers.findIndex(h => h.includes('issue') || h.includes('bug') || h.includes('block'));
    const statusIdx = headers.findIndex(h => h.includes('status') || h.includes('result'));

    // Safe fallbacks if indices not matched
    const mapIndex = (val: number, def: number) => val !== -1 ? val : def;
    const finalTcNoIdx = mapIndex(tcNoIdx, 0);
    const finalNameIdx = mapIndex(nameIdx, 1);
    const finalObjIdx = mapIndex(objIdx, 2);
    const finalStepsIdx = mapIndex(stepsIdx, 3);
    const finalIssuesIdx = mapIndex(issuesIdx, 4);
    const finalStatusIdx = mapIndex(statusIdx, 5);

    // Parse data rows
    for (let i = 1; i < rows.length; i++) {
      const cells = Array.from(rows[i].querySelectorAll('td'));
      if (cells.length === 0) continue;

      const tcNo = cells[finalTcNoIdx]?.textContent?.trim() || `TC-${String(i).padStart(3, '0')}`;
      const name = cells[finalNameIdx]?.textContent?.trim() || `Test Case #${i}`;
      const obj = cells[finalObjIdx]?.textContent?.trim() || '';
      
      // Preserve innerHTML of test steps cell to retain rich bullet formatting!
      const stepsHtml = cells[finalStepsIdx]?.innerHTML || '<ol><li>Execute action.</li></ol>';
      const issues = cells[finalIssuesIdx]?.textContent?.trim() || '';
      
      // Normalize imported status
      let rawStatus = cells[finalStatusIdx]?.textContent?.trim() || 'Not Tested';
      let status: TestCaseStatus = 'Not Tested';
      if (rawStatus.match(/fix/i)) status = 'Fixed';
      else if (rawStatus.match(/progress/i)) status = 'In Progress';
      else if (rawStatus.match(/block/i)) status = 'Blocked';
      else if (rawStatus.match(/fail|not.*fix/i)) status = 'Not Fixed';

      testCases.push({
        id: '', // filled by caller
        test_case_no: tcNo,
        name,
        test_objective: obj,
        test_steps: stepsHtml,
        issues,
        status,
        screenshots: []
      });
    }

    return testCases;
  } catch (error: any) {
    console.error('Word parsing failed', error);
    throw new Error(error.message || 'Corrupted docx structure or missing tables.');
  }
}

// --- CSV IMPORT (.csv) ---
export function parseCsvContent(text: string): Partial<TestCase>[] {
  const lines: string[][] = [];
  let currentLine: string[] = [];
  let insideQuote = false;
  let currentToken = '';

  // Clean raw char parser to respect quotes and newlines in textareas!
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuote && nextChar === '"') {
        currentToken += '"';
        i++; // skip next quote
      } else {
        insideQuote = !insideQuote;
      }
    } else if (char === ',' && !insideQuote) {
      currentLine.push(currentToken.trim());
      currentToken = '';
    } else if ((char === '\r' || char === '\n') && !insideQuote) {
      if (char === '\r' && nextChar === '\n') i++; // handle windows crlf
      currentLine.push(currentToken.trim());
      lines.push(currentLine);
      currentLine = [];
      currentToken = '';
    } else {
      currentToken += char;
    }
  }
  if (currentToken || currentLine.length > 0) {
    currentLine.push(currentToken.trim());
    lines.push(currentLine);
  }

  if (lines.length < 2) {
    throw new Error('CSV is empty or lacks headers.');
  }

  const headers = lines[0].map(h => h.toLowerCase());
  const tcNoIdx = headers.findIndex(h => h.includes('no') || h.includes('id') || h.includes('tc'));
  const nameIdx = headers.findIndex(h => h.includes('name') || h.includes('title'));
  const objIdx = headers.findIndex(h => h.includes('objective') || h.includes('goal'));
  const stepsIdx = headers.findIndex(h => h.includes('steps') || h.includes('procedure'));
  const issuesIdx = headers.findIndex(h => h.includes('issues') || h.includes('bugs') || h.includes('block'));
  const statusIdx = headers.findIndex(h => h.includes('status') || h.includes('result'));
  const screenshotIdx = headers.findIndex(h => {
    const normalized = h.replace(/[^a-z0-9]+/g, ' ').trim();
    return ['screenshot', 'image', 'attachment', 'image url', 'screenshot url', 'photo', 'picture', 'media'].some(alias => normalized === alias || normalized.includes(alias));
  });

  const testCases: Partial<TestCase>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i];
    if (row.length < 2 || !row.join('').trim()) continue; // Skip empty lines

    const tcNo = row[tcNoIdx !== -1 ? tcNoIdx : 0] || `TC-${String(i).padStart(3, '0')}`;
    const name = row[nameIdx !== -1 ? nameIdx : 1] || `Test Case #${i}`;
    const obj = row[objIdx !== -1 ? objIdx : 2] || '';
    
    // Steps (format lists if plain text imported)
    let stepsVal = row[stepsIdx !== -1 ? stepsIdx : 3] || '';
    if (stepsVal && !stepsVal.includes('<')) {
      // split by numbers or lines to convert into HTML lists
      const listItems = stepsVal.split(/\n+/).map(step => `<li>${step.replace(/^\d+[\.\-\s]+/, '')}</li>`).join('');
      stepsVal = `<ol>${listItems}</ol>`;
    }

    const issues = row[issuesIdx !== -1 ? issuesIdx : 4] || '';
    let rawStatus = row[statusIdx !== -1 ? statusIdx : 5] || 'Not Tested';

    let status: TestCaseStatus = 'Not Tested';
    if (rawStatus.match(/fix/i)) status = 'Fixed';
    else if (rawStatus.match(/progress/i)) status = 'In Progress';
    else if (rawStatus.match(/block/i)) status = 'Blocked';
    else if (rawStatus.match(/fail|not.*fix/i)) status = 'Not Fixed';

    const screenshotValue = screenshotIdx !== -1 ? row[screenshotIdx] || '' : '';

    testCases.push({
      id: '',
      test_case_no: tcNo,
      name,
      test_objective: obj,
      test_steps: stepsVal,
      issues,
      status,
      screenshots: screenshotValue
        ? [{
            id: `screenshot-${generateId()}`,
            test_case_id: '',
            image_url: screenshotValue.trim(),
            created_at: new Date().toISOString()
          }]
        : []
    });
  }

  return testCases;
}

// --- CSV EXPORT ---
export function downloadCsvFile(project: Project, testCases: TestCase[]) {
  const headers = ['Test Case No.', 'Name', 'Test Objective', 'Test Steps', 'Issues / Blockers', 'Status (Fixed or Not)', 'Screenshot'];
  const rows = testCases.map(tc => [
    tc.test_case_no,
    tc.name,
    tc.test_objective,
    // strip HTML for raw CSV presentation
    tc.test_steps.replace(/<[^>]+>/g, '\n').replace(/\n+/g, '\n').trim(),
    tc.issues,
    tc.status,
    tc.screenshots?.[0]?.image_url || ''
  ]);

  const escapeField = (field: any) => {
    const str = String(field);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvContent = [
    headers.map(escapeField).join(','),
    ...rows.map(row => row.map(escapeField).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${project.project_name.replace(/\s+/g, '_')}_testcases.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// --- WORD EXPORT (.docx) ---
export async function downloadDocxFile(project: Project, testCases: TestCase[], exportedBy: string = 'QA Lead', documentName?: string) {
  const rows: TableRow[] = [];

  for (const tc of testCases) {
    const stepsText = tc.test_steps
      .replace(/<li>/g, '• ')
      .replace(/<\/li>/g, '\n')
      .replace(/<[^>]+>/g, '')
      .trim();

    const screenshotValue = tc.screenshots?.[0]?.image_url?.trim();
    let screenshotCell: TableCell;

    if (screenshotValue) {
      const bytes = await readImageAsUint8Array(screenshotValue);
      if (bytes) {
        screenshotCell = new TableCell({
          margins: { top: 100, bottom: 100, left: 100, right: 100 },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 4, color: 'E7D6C4' },
            bottom: { style: BorderStyle.SINGLE, size: 4, color: 'E7D6C4' },
            left: { style: BorderStyle.SINGLE, size: 4, color: 'E7D6C4' },
            right: { style: BorderStyle.SINGLE, size: 4, color: 'E7D6C4' },
          },
          children: [
            new Paragraph({
              children: [
                new ImageRun({
                  data: bytes,
                  transformation: {
                    width: 140,
                    height: 90
                  },
                  type: inferImageType(screenshotValue)
                } as any)
              ],
              alignment: AlignmentType.CENTER
            })
          ]
        });
      } else {
        screenshotCell = createCell('No Screenshot', false, true);
      }
    } else {
      screenshotCell = createCell('No Screenshot', false, true);
    }

    rows.push(new TableRow({
      children: [
        createCell(tc.test_case_no, true, true),
        createCell(tc.name, true),
        createCell(tc.test_objective),
        createCell(stepsText),
        createCell(tc.issues || 'None logged', false, false, tc.issues ? 'FF4D4F' : undefined),
        createCell(tc.status, true, true, getStatusHexColor(tc.status)),
        screenshotCell
      ]
    }));
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720,
              right: 720,
              bottom: 720,
              left: 720,
            },
            size: {
              width: 15840,
              height: 12240,
            }
          }
        },
        children: [
          new Paragraph({
            children: [
              new TextRun({ text: "========================================================================\n", color: "8B5A2B", bold: true }),
              new TextRun({ text: "   [ COMPANY LOGO PLACEHOLDER ]   \n", color: "8B5A2B", bold: true, size: 24, font: 'Inter' }),
              new TextRun({ text: "========================================================================\n", color: "8B5A2B", bold: true }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 120 }
          }),
          new Paragraph({
            text: `TESTCASE SUITE AUDIT LEDGER`,
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { after: 120 }
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: `Project: `, bold: true }),
              new TextRun({ text: `${project.project_name}   |   ` }),
              ...(documentName ? [
                new TextRun({ text: `Document: `, bold: true }),
                new TextRun({ text: `${documentName}   |   ` })
              ] : []),
              new TextRun({ text: `Exported By: `, bold: true }),
              new TextRun({ text: `${exportedBy}   |   ` }),
              new TextRun({ text: `Generated Date: `, bold: true }),
              new TextRun({ text: `${new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}   |   ` }),
              new TextRun({ text: `Scope: `, bold: true }),
              new TextRun({ text: `${testCases.length} Test cases compiled` })
            ],
            spacing: { after: 360 }
          }),
          new Table({
            width: {
              size: 100,
              type: WidthType.PERCENTAGE
            },
            rows: [
              new TableRow({
                tableHeader: true,
                children: [
                  createHeaderCell('TC No.', 8),
                  createHeaderCell('Test Case Title', 18),
                  createHeaderCell('Test Objective', 20),
                  createHeaderCell('Execution Steps', 20),
                  createHeaderCell('Issues / Blockers', 14),
                  createHeaderCell('Status (Fixed or Not)', 10),
                  createHeaderCell('Screenshot', 10)
                ]
              }),
              ...rows
            ]
          })
        ]
      }
    ]
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const cleanDocName = documentName ? `_${documentName.replace(/\.docx$/i, '').replace(/\s+/g, '_')}` : '';
  link.setAttribute('download', `${project.project_name.replace(/\s+/g, '_')}${cleanDocName}_Testcase_Report.docx`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function downloadDocxFileLegacy(project: Project, testCases: TestCase[], exportedBy: string = 'QA Lead', documentName?: string) {
  // Create professional Landscape Document using docx package
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720, // 0.5 inch margins for landscape layout
              right: 720,
              bottom: 720,
              left: 720,
            },
            size: {
              width: 15840, // Letter size, rotated landscape
              height: 12240,
            }
          }
        },
        children: [
          // STYLIZED COMPANY LOGO PLACEHOLDER & META CARD
          new Paragraph({
            children: [
              new TextRun({ text: "=========================================================================\n", color: "8B5A2B", bold: true }),
              new TextRun({ text: "   [ COMPANY LOGO PLACEHOLDER ]   \n", color: "8B5A2B", bold: true, size: 24, font: 'Inter' }),
              new TextRun({ text: "=========================================================================\n", color: "8B5A2B", bold: true }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 120 }
          }),
          new Paragraph({
            text: `TESTCASE SUITE AUDIT LEDGER`,
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { after: 120 }
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: `Project: `, bold: true }),
              new TextRun({ text: `${project.project_name}   |   ` }),
              ...(documentName ? [
                new TextRun({ text: `Document: `, bold: true }),
                new TextRun({ text: `${documentName}   |   ` })
              ] : []),
              new TextRun({ text: `Exported By: `, bold: true }),
              new TextRun({ text: `${exportedBy}   |   ` }),
              new TextRun({ text: `Generated Date: `, bold: true }),
              new TextRun({ text: `${new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}   |   ` }),
              new TextRun({ text: `Scope: `, bold: true }),
              new TextRun({ text: `${testCases.length} Test cases compiled` })
            ],
            spacing: { after: 360 }
          }),

          // MAIN LANDSCAPE TABLE
          new Table({
            width: {
              size: 100,
              type: WidthType.PERCENTAGE
            },
            rows: [
              // HEADER ROW (repeats on every page)
              new TableRow({
                tableHeader: true,
                children: [
                  createHeaderCell('TC No.', 8),
                  createHeaderCell('Test Case Title', 18),
                  createHeaderCell('Test Objective', 20),
                  createHeaderCell('Execution Steps', 20),
                  createHeaderCell('Issues / Blockers', 14),
                  createHeaderCell('Status', 10),
                  createHeaderCell('Screenshot Media', 10)
                ]
              }),

              // DATA ROWS
              ...testCases.map(tc => {
                const stepsText = tc.test_steps
                  .replace(/<li>/g, '• ')
                  .replace(/<\/li>/g, '\n')
                  .replace(/<[^>]+>/g, '')
                  .trim();

                // Create the screenshot cell dynamically with embedded Base64 image or text fallback
                let screenshotCell: TableCell;
                if (tc.screenshots && tc.screenshots.length > 0) {
                  try {
                    const rawBase64 = tc.screenshots[0].image_url;
                    const bytes = base64ToUint8Array(rawBase64);
                    screenshotCell = new TableCell({
                      margins: { top: 100, bottom: 100, left: 100, right: 100 },
                      borders: {
                        top: { style: BorderStyle.SINGLE, size: 4, color: 'E7D6C4' },
                        bottom: { style: BorderStyle.SINGLE, size: 4, color: 'E7D6C4' },
                        left: { style: BorderStyle.SINGLE, size: 4, color: 'E7D6C4' },
                        right: { style: BorderStyle.SINGLE, size: 4, color: 'E7D6C4' },
                      },
                      children: [
                        new Paragraph({
                          children: [
                            new ImageRun({
                              data: bytes,
                              transformation: {
                                width: 250,
                                height: 150
                              },
                              type: 'png'
                            } as any)
                          ],
                          alignment: AlignmentType.CENTER
                        })
                      ]
                    });
                  } catch (err) {
                    console.error('Image embedding failed, falling back to text.', err);
                    screenshotCell = createCell('Attached (Embedded Error)', false, true);
                  }
                } else {
                  screenshotCell = createCell('None', false, true);
                }

                return new TableRow({
                  children: [
                    createCell(tc.test_case_no, true, true),
                    createCell(tc.name, true),
                    createCell(tc.test_objective),
                    createCell(stepsText),
                    createCell(tc.issues || 'None logged', false, false, tc.issues ? 'FF4D4F' : undefined),
                    createCell(tc.status, true, true, getStatusHexColor(tc.status)),
                    screenshotCell
                  ]
                });
              })
            ]
          })
        ]
      }
    ]
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const cleanDocName = documentName ? `_${documentName.replace(/\.docx$/i, '').replace(/\s+/g, '_')}` : '';
  link.setAttribute('download', `${project.project_name.replace(/\s+/g, '_')}${cleanDocName}_Testcase_Report.docx`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Docx helper functions
function createHeaderCell(text: string, pctWidth: number) {
  return new TableCell({
    width: {
      size: pctWidth,
      type: WidthType.PERCENTAGE
    },
    shading: {
      fill: '8B5A2B' // Primary brown
    },
    margins: {
      top: 140,
      bottom: 140,
      left: 100,
      right: 100
    },
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text: text,
            color: 'FFFFFF',
            bold: true,
            font: 'Inter',
            size: 18
          })
        ],
        alignment: AlignmentType.CENTER
      })
    ]
  });
}

function createCell(text: string, bold: boolean = false, center: boolean = false, textHexColor?: string) {
  return new TableCell({
    margins: {
      top: 100,
      bottom: 100,
      left: 100,
      right: 100
    },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: 'E7D6C4' },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: 'E7D6C4' },
      left: { style: BorderStyle.SINGLE, size: 4, color: 'E7D6C4' },
      right: { style: BorderStyle.SINGLE, size: 4, color: 'E7D6C4' },
    },
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text: text,
            bold,
            font: 'Inter',
            size: 16,
            color: textHexColor
          })
        ],
        alignment: center ? AlignmentType.CENTER : AlignmentType.LEFT
      })
    ]
  });
}

function getStatusHexColor(status: TestCaseStatus): string {
  switch (status) {
    case 'Fixed': return '34C759'; // Green
    case 'Not Fixed': return 'FF4D4F'; // Red
    case 'In Progress': return 'F5A623'; // Orange
    case 'Blocked': return '7C4DFF'; // Purple
    case 'Not Tested': return 'A0A0A0'; // Gray
    default: return '3B2A1D';
  }
}

// -----------------------------------------------------------------------------
// PDF EXPORT
// -----------------------------------------------------------------------------

export async function downloadPdfFile(
  testCases: TestCase[],
  project: Project,
  options?: { companyName?: string }
) {
  const doc = new jsPDF('landscape');
  const title = options?.companyName ? `${options.companyName} - Test Ledger` : 'Test Ledger';

  doc.setFontSize(18);
  doc.text(title, 14, 22);

  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(`Project: ${project.project_name} | Generated: ${new Date().toLocaleDateString()}`, 14, 30);

  const tableBody = testCases.map(tc => {
    // Strip HTML from steps
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = tc.test_steps;
    const stepsText = tempDiv.textContent || tempDiv.innerText || '';

    // Status format
    const statusText = tc.status.toUpperCase();
    
    // We can't easily embed images directly in autotable cells yet without significant custom drawing, 
    // but we can list if it has screenshots.
    const hasScreenshots = tc.screenshots && tc.screenshots.length > 0 ? 'Yes' : 'No';

    return [
      tc.test_case_no,
      tc.name,
      tc.test_objective,
      stepsText,
      tc.issues || '-',
      statusText,
      hasScreenshots
    ];
  });

  // @ts-ignore - jspdf-autotable adds autoTable to jsPDF instance
  doc.autoTable({
    startY: 36,
    head: [['TC ID', 'Name', 'Objective', 'Test Steps', 'Issues', 'Status', 'Screenshots']],
    body: tableBody,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [139, 90, 43] }, // #8B5A2B
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 35 },
      2: { cellWidth: 50 },
      3: { cellWidth: 'auto' },
      4: { cellWidth: 40 },
      5: { cellWidth: 25 },
      6: { cellWidth: 20 }
    },
    didDrawCell: function (data: any) {
      // Custom status coloring
      if (data.section === 'body' && data.column.index === 5) {
        const text = data.cell.text[0];
        let color = [59, 42, 29]; // default
        if (text === 'FIXED') color = [52, 199, 89];
        else if (text === 'NOT FIXED') color = [255, 77, 79];
        else if (text === 'IN PROGRESS') color = [245, 166, 35];
        else if (text === 'BLOCKED') color = [124, 77, 255];
        
        doc.setTextColor(color[0], color[1], color[2]);
        // Note: setting textColor here affects the next drawn cell, 
        // to properly color just the text inside, autotable requires more complex hooks.
        // For now, simple text color change is okay.
      }
    }
  });

  doc.save(`TestLedger_${project.project_name.replace(/\s+/g, '_')}_${new Date().getTime()}.pdf`);
}
