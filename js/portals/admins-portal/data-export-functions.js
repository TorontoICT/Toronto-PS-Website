// js/portals/admins-portal/data-export-functions.js

/**
 * Extracts data from an HTML table.
 * @param {string} tableId - The ID of the table to extract data from.
 * @returns {Array<Array<string>>} An array of arrays representing rows and cells.
 */
function getTableData(tableId) {
    const table = document.getElementById(tableId);
    if (!table) return [];

    const data = [];
    const headers = [];
    // Get headers, skipping any checkbox or action columns
    table.querySelectorAll('thead th').forEach(th => {
        if (th.innerText && th.innerText.toLowerCase() !== 'action' && !th.querySelector('input[type="checkbox"]')) {
            headers.push(th.innerText);
        }
    });
    data.push(headers);

    // Get rows, skipping any checkbox or action columns
    table.querySelectorAll('tbody tr').forEach(tr => {
        const rowData = [];
        tr.querySelectorAll('td').forEach((td, index) => {
            // Check corresponding header to see if we should skip this column
            const headerText = table.querySelector(`thead th:nth-child(${index + 1})`)?.innerText || '';
            if (headerText && headerText.toLowerCase() !== 'action' && !table.querySelector(`thead th:nth-child(${index + 1}) input[type="checkbox"]`)) {
                rowData.push(td.innerText);
            }
        });
        if (rowData.length > 0) {
            data.push(rowData);
        }
    });

    return data;
}

/**
 * Exports data to an Excel file using the SheetJS library.
 * @param {Array<Array<string>>} data - The data to export.
 * @param {string} fileName - The desired name for the output file.
 */
function exportToExcel(data, fileName) {
    if (typeof XLSX === 'undefined') {
        alert('Excel export library (SheetJS) is not loaded.');
        return;
    }
    if (data.length <= 1) {
        alert('No data available in the table to export.');
        return;
    }

    const worksheet = XLSX.utils.aoa_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Learners');

    // Generate a file name with a timestamp
    const finalFileName = `${fileName}_${new Date().toISOString().split('T')[0]}.xlsx`;

    XLSX.writeFile(workbook, finalFileName);
}

/**
 * Prepares data and triggers the browser's print dialog to save as PDF.
 * @param {Array<Array<string>>} data - The data to print.
 * @param {string} title - The title to display on the print page.
 */
function exportToPdf(data, title) {
    if (data.length <= 1) {
        alert('No data available in the table to export.');
        return;
    }

    const printContainer = document.getElementById('print-container');
    if (!printContainer) {
        alert('Print container not found.');
        return;
    }

    const headers = data[0];
    const rows = data.slice(1);

    let tableHTML = `<h1 class="print-header">${title}</h1>`;
    tableHTML += '<table class="print-table"><thead><tr>';
    headers.forEach(header => tableHTML += `<th>${header}</th>`);
    tableHTML += '</tr></thead><tbody>';

    rows.forEach(row => {
        tableHTML += '<tr>';
        row.forEach(cell => tableHTML += `<td>${cell}</td>`);
        tableHTML += '</tr>';
    });

    tableHTML += '</tbody></table>';
    printContainer.innerHTML = tableHTML;

    window.print();
}