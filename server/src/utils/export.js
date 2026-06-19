const ExcelJS = require('exceljs');

/**
 * Generate a CSV string from attendance data rows.
 * @param {Array} rows - Array of { reg_number, full_name, department, classes_attended, total_classes, attendance_pct }
 * @param {string} courseName
 * @returns {string} CSV content
 */
function generateCSV(rows, courseName) {
  const header = 'Registration No,Full Name,Department,Classes Attended,Total Classes,Attendance %\n';
  const csvRows = rows.map(r =>
    `${r.reg_number},"${r.full_name}",${r.department || ''},${r.classes_attended},${r.total_classes},${r.attendance_pct}%`
  ).join('\n');
  return header + csvRows;
}

/**
 * Generate an Excel workbook buffer from attendance data.
 * @param {Array} rows
 * @param {string} courseName
 * @param {string} courseCode
 * @returns {Promise<Buffer>}
 */
async function generateExcel(rows, courseName, courseCode) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'QR Attendance System';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Attendance Report');

  // Title row
  sheet.mergeCells('A1:F1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = `Attendance Report — ${courseCode}: ${courseName}`;
  titleCell.font = { bold: true, size: 14, color: { argb: 'FF1A1A2E' } };
  titleCell.alignment = { horizontal: 'center' };

  // Date row
  sheet.mergeCells('A2:F2');
  const dateCell = sheet.getCell('A2');
  dateCell.value = `Generated: ${new Date().toLocaleDateString('en-US', { dateStyle: 'full' })}`;
  dateCell.font = { italic: true, size: 10, color: { argb: 'FF888888' } };
  dateCell.alignment = { horizontal: 'center' };

  // Empty row
  sheet.addRow([]);

  // Header row
  const headerRow = sheet.addRow([
    'Reg. Number', 'Full Name', 'Department',
    'Classes Attended', 'Total Classes', 'Attendance %'
  ]);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF667EEA' } };
    cell.border = {
      bottom: { style: 'thin', color: { argb: 'FF444444' } }
    };
  });

  // Data rows
  rows.forEach(r => {
    const row = sheet.addRow([
      r.reg_number,
      r.full_name,
      r.department || '',
      r.classes_attended,
      r.total_classes,
      parseFloat(r.attendance_pct)
    ]);

    // Color-code attendance percentage
    const pctCell = row.getCell(6);
    pctCell.numFmt = '0.0"%"';
    if (parseFloat(r.attendance_pct) >= 80) {
      pctCell.font = { bold: true, color: { argb: 'FF10B981' } };
    } else if (parseFloat(r.attendance_pct) >= 60) {
      pctCell.font = { bold: true, color: { argb: 'FFF59E0B' } };
    } else {
      pctCell.font = { bold: true, color: { argb: 'FFEF4444' } };
    }
  });

  // Auto-width columns
  sheet.columns.forEach(col => {
    let maxLen = 12;
    col.eachCell({ includeEmpty: false }, cell => {
      const len = cell.value ? cell.value.toString().length : 0;
      if (len > maxLen) maxLen = len;
    });
    col.width = maxLen + 4;
  });

  return await workbook.xlsx.writeBuffer();
}

module.exports = { generateCSV, generateExcel };
