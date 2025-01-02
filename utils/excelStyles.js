const createHeaderStyle = () => ({
    font: { 
        bold: true,
        sz: 12,
        name: 'Arial'
    },
    alignment: { 
        horizontal: 'center',
        vertical: 'center',
        wrapText: true 
    },
    border: {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' }
    }
});

const createCellStyle = () => ({
    font: {
        sz: 11,
        name: 'Arial'
    },
    alignment: {
        horizontal: 'center',
        vertical: 'center'
    },
    border: {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' }
    }
});

module.exports = {
    createHeaderStyle,
    createCellStyle
};