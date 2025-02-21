const fs = require('fs');
const path = require('path');
const { marked } = require('marked');
const mammoth = require('mammoth');
const ExcelJS = require('exceljs');
const pdf = require('pdf-parse');
const axios = require('axios');
const crypto = require('crypto');

const UPLOAD_DIR = path.join(__dirname, '../../storage/uploads');
const MARKDOWN_DIR = path.join(__dirname, '../../storage/markdown');

// Ensure directories exist
[UPLOAD_DIR, MARKDOWN_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const generateUniqueId = (originalName) => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const nameWithoutExt = path.parse(originalName).name;
  const sanitizedName = nameWithoutExt.replace(/[^a-zA-Z0-9]/g, '-');
  return `${sanitizedName}-${timestamp}-${random}`;
};

const getFileType = (file, content = '') => {
  const ext = path.extname(file.originalname).toLowerCase();
  const mimeType = file.mimetype;
  
  // Helper function to check for GL patterns
  const isGeneralLedger = (text) => {
    const contentLower = text.toLowerCase();
    // Check for common GL header patterns
    const hasGLHeaders = (
      (contentLower.includes('debit') && contentLower.includes('credit')) ||
      (contentLower.includes('account') && contentLower.includes('amount')) ||
      (contentLower.includes('date') && contentLower.includes('account') && (contentLower.includes('debit') || contentLower.includes('credit')))
    );
    
    // Check for common GL transaction patterns
    const hasGLTransactions = (
      contentLower.includes('cash') ||
      contentLower.includes('revenue') ||
      contentLower.includes('expense') ||
      contentLower.includes('asset') ||
      contentLower.includes('liability') ||
      contentLower.includes('equity')
    );
    
    return hasGLHeaders && hasGLTransactions;
  };
  
  // First check common document types
  if (ext === '.docx' || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return 'Word Document';
  }
  if (ext === '.xlsx' || ext === '.xls' || mimeType.includes('spreadsheet')) {
    // Check if it's a general ledger spreadsheet
    if (isGeneralLedger(content)) {
      return 'General Ledger';
    }
    return 'Spreadsheet';
  }
  if (ext === '.csv' || mimeType === 'text/csv') {
    // Check if it's a general ledger CSV
    if (isGeneralLedger(content)) {
      return 'General Ledger';
    }
    return 'CSV Document';
  }
  if (ext === '.pdf' || mimeType === 'application/pdf') {
    return 'PDF Document';
  }
  if (ext === '.md' || mimeType === 'text/markdown') {
    return 'Markdown';
  }
  if (ext === '.txt' || mimeType === 'text/plain') {
    return 'Text Document';
  }
  
  // Check content patterns for financial documents
  const contentLower = content.toLowerCase();
  
  // Check for General Ledger first since we have the content
  if (isGeneralLedger(content)) {
    return 'General Ledger';
  }
  
  if (contentLower.includes('balance sheet') || (contentLower.includes('assets') && contentLower.includes('liabilities'))) {
    return 'Financial Statement';
  }
  if (contentLower.includes('profit and loss') || contentLower.includes('income statement')) {
    return 'Financial Report';
  }
  if (contentLower.includes('invoice') || contentLower.match(/invoice\s+#/i)) {
    return 'Invoice';
  }
  if (contentLower.includes('contract') && contentLower.includes('agreement')) {
    return 'Contract';
  }
  
  // If no specific type is detected, use the file extension or a generic type
  if (ext) {
    return ext.substring(1).toUpperCase() + ' File';
  }
  
  return 'Unknown Document';
};

const convertCsvToMarkdown = async (filePath) => {
  try {
    // First try to read as CSV
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n').map(line => line.trim()).filter(Boolean);
    
    if (lines.length === 0) return '';
    
    // Convert CSV to markdown table
    const rows = lines.map(line => line.split(',').map(cell => cell.trim()).join(' | '));
    const headerRow = rows[0];
    const separator = headerRow.split('|').map(() => '---').join(' | ');
    const dataRows = rows.slice(1);
    
    return `${headerRow}\n${separator}\n${dataRows.join('\n')}`;
  } catch (csvError) {
    console.error('Error reading as CSV, trying Excel format:', csvError);
    // If CSV reading fails, try Excel format as fallback
    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(filePath);
      const worksheet = workbook.getWorksheet(1);
      
      if (!worksheet) return '';
      
      let rows = [];
      worksheet.eachRow((row, rowNumber) => {
        rows.push(row.values.slice(1).map(cell => cell?.toString() || '').join(' | '));
      });
      
      if (rows.length === 0) return '';
      if (rows.length === 1) return rows[0];
      
      const headerRow = rows[0];
      const separator = headerRow.split('|').map(() => '---').join(' | ');
      const dataRows = rows.slice(1);
      
      return `${headerRow}\n${separator}\n${dataRows.join('\n')}`;
    } catch (excelError) {
      console.error('Error reading as Excel:', excelError);
      throw new Error('Failed to read file as CSV or Excel');
    }
  }
};

const convertToMarkdown = async (file) => {
  console.info(`Starting conversion for ${file.originalname} from path: ${file.path}`);
  try {
    const stats = fs.statSync(file.path);
    console.info(`File size: ${stats.size} bytes`);
  } catch (err) {
    console.error(`Error getting stats for ${file.originalname}: ${err.message}`);
  }
  const ext = path.extname(file.originalname).toLowerCase();
  let markdownContent = '';

  try {
    switch (ext) {
      case '.docx':
        const result = await mammoth.convertToMarkdown({ path: file.path });
        markdownContent = result.value;
        break;
      case '.xlsx':
      case '.xls':
      case '.csv': {
        markdownContent = await convertCsvToMarkdown(file.path);
        break;
      }
      case '.pdf':
        const dataBuffer = fs.readFileSync(file.path);
        const pdfData = await pdf(dataBuffer);
        markdownContent = pdfData.text;
        break;
      case '.md':
      case '.txt':
        markdownContent = fs.readFileSync(file.path, 'utf8');
        break;
      default:
        markdownContent = `Binary file: ${file.originalname}`;
    }
  } catch (error) {
    console.error('Error converting file to markdown:', error);
    markdownContent = `Error converting file: ${error.message}`;
  }

  console.info(`Converted ${file.originalname} to markdown with ${markdownContent.length} characters`);
  return markdownContent;
};

const classifyFileContent = async (content, model = process.env.FILE_CLASSIFICATION_MODEL || 'deepseek r1 32b') => {
  // Take first 2000 characters to get more context
  const contentPreview = content.slice(0, 2000);
  
  console.log('Classifying file content with model:', model);
  console.log('Content preview being sent to model:', contentPreview);

  const prompt = `Please classify this document into one of the following categories (or suggest a new relevant category if none fit):
- Customer contract
- Supplier contract
- Lease contract
- Lease addendum
- Employee contract
- Employee benefits plan
- Financial statement
- Financial report
- General Ledger
- Trial Balance
- Profit and Loss
- Chart of accounts
- Fixed Assets Register
- Accounts Payable
- Accounts Receivable
- Inventory
- Investments
- Tax table

Here are the first few lines of the document:
${contentPreview}

Please respond with just the category name.`;

  try {
    console.log('Sending classification request...');
    const response = await axios.post('http://localhost:3001/api/chat/send', {
      message: prompt,
      avatarInfo: {
        selectedModel: model
      }
    });

    const classification = response.data.response.trim();
    console.log('Received classification:', classification);
    return classification;
  } catch (error) {
    console.error('Error classifying file:', error);
    return 'Unclassified';
  }
};

const processUploadedFile = async (file) => {
  if (!file) {
    throw new Error('No file provided');
  }

  const fileId = generateUniqueId(file.originalname);
  const originalExt = path.extname(file.originalname);
  const newFilename = `${fileId}${originalExt}`;
  const newPath = path.join(UPLOAD_DIR, newFilename);

  // Move file to uploads directory
  fs.renameSync(file.path, newPath);

  // For CSV files, read raw content first for type detection
  let rawContent = '';
  if (originalExt.toLowerCase() === '.csv') {
    try {
      rawContent = fs.readFileSync(newPath, 'utf8');
      console.log('Raw CSV content for type detection:', rawContent.slice(0, 500));
    } catch (error) {
      console.error('Error reading raw CSV content:', error);
    }
  }

  // Convert to markdown
  const markdownContent = await convertToMarkdown({ ...file, path: newPath });
  
  // Get file type based on extension and content
  const fileType = getFileType(file, rawContent || markdownContent);
  console.log('Detected file type:', fileType);

  // If it's still unknown, try using the LLM classifier
  let finalType = fileType;
  if (fileType === 'Unknown Document' || fileType.endsWith('File')) {
    console.log('Attempting LLM classification...');
    const classifiedType = await classifyFileContent(rawContent || markdownContent);
    if (classifiedType !== 'Unclassified') {
      finalType = classifiedType;
      console.log('LLM classified as:', finalType);
    }
  }

  // Add metadata to markdown content
  const markdownWithMetadata = `---
Type: ${finalType}
Original Name: ${file.originalname}
Upload Date: ${new Date().toISOString()}
---

${markdownContent}`;

  const markdownPath = path.join(MARKDOWN_DIR, `${fileId}.md`);
  fs.writeFileSync(markdownPath, markdownWithMetadata);

  // Get file stats
  const stats = fs.statSync(newPath);

  return {
    id: fileId,
    originalName: file.originalname,
    filename: file.originalname,
    path: newPath,
    markdownPath,
    size: stats.size,
    type: finalType,
    uploadDate: new Date(),
    mimeType: file.mimetype
  };
};

const listFiles = () => {
  if (!fs.existsSync(UPLOAD_DIR)) {
    return [];
  }

  return fs.readdirSync(UPLOAD_DIR)
    .filter(file => {
      const filePath = path.join(UPLOAD_DIR, file);
      return fs.statSync(filePath).isFile();
    })
    .map(file => {
      const filePath = path.join(UPLOAD_DIR, file);
      const stats = fs.statSync(filePath);
      const fileId = path.parse(file).name;
      const markdownPath = path.join(MARKDOWN_DIR, `${fileId}.md`);
      
      let type = 'Unknown Document';
      let originalName = file;
      
      // Try to read metadata from markdown file
      if (fs.existsSync(markdownPath)) {
        try {
          const mdContent = fs.readFileSync(markdownPath, 'utf8');
          const typeMatch = mdContent.match(/Type:\s*([^\n]+)/);
          const nameMatch = mdContent.match(/Original Name:\s*([^\n]+)/);
          
          if (typeMatch) {
            type = typeMatch[1].trim();
          }
          if (nameMatch) {
            originalName = nameMatch[1].trim();
          }
        } catch (err) {
          console.error('Error reading markdown metadata:', err);
        }
      }

      return {
        id: fileId,
        filename: originalName,
        path: filePath,
        size: stats.size,
        type,
        uploadDate: stats.mtime
      };
    });
};

const deleteFile = (fileId) => {
  const files = fs.readdirSync(UPLOAD_DIR)
    .filter(file => path.parse(file).name === fileId);

  if (files.length === 0) {
    throw new Error('File not found');
  }

  files.forEach(file => {
    const filePath = path.join(UPLOAD_DIR, file);
    fs.unlinkSync(filePath);
  });

  const markdownPath = path.join(MARKDOWN_DIR, `${fileId}.md`);
  if (fs.existsSync(markdownPath)) {
    fs.unlinkSync(markdownPath);
  }

  return { success: true };
};

const getFileMarkdownContent = async (fileId) => {
  const markdownPath = path.join(MARKDOWN_DIR, `${fileId}.md`);
  
  try {
    if (!fs.existsSync(markdownPath)) {
      throw new Error('File not found');
    }

    const content = fs.readFileSync(markdownPath, 'utf8');
    
    // Parse the YAML frontmatter and content
    const parts = content.split('---\n');
    if (parts.length >= 3) {
      // Return just the markdown content without the frontmatter
      return parts.slice(2).join('---\n').trim();
    }
    
    return content;
  } catch (error) {
    console.error('Error reading markdown content:', error);
    throw new Error(`Failed to read file content: ${error.message}`);
  }
};

module.exports = {
  processUploadedFile,
  listFiles,
  deleteFile,
  getFileMarkdownContent
}; 