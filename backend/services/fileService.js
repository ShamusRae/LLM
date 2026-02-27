const fs = require('fs');
const path = require('path');
const { marked } = require('marked');
const mammoth = require('mammoth');
const ExcelJS = require('exceljs');
const pdf = require('pdf-parse');
const axios = require('axios');
const crypto = require('crypto');
const { getPublicBaseUrl } = require('../config');

// Updated storage paths to use absolute paths relative to project root
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const STORAGE_DIR = path.join(PROJECT_ROOT, 'storage');
const UPLOAD_DIR = path.join(STORAGE_DIR, 'uploads');
const MARKDOWN_DIR = path.join(STORAGE_DIR, 'markdown');

// Log all directory paths for debugging
console.log('FileService initialized with paths:', {
  cwd: process.cwd(),
  PROJECT_ROOT,
  STORAGE_DIR,
  UPLOAD_DIR,
  MARKDOWN_DIR
});

// Ensure directories exist
[STORAGE_DIR, UPLOAD_DIR, MARKDOWN_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    try {
      console.log(`Creating directory: ${dir}`);
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Directory created: ${dir} (exists: ${fs.existsSync(dir)})`);
    } catch (err) {
      console.error(`Failed to create directory ${dir}:`, err);
    }
  } else {
    console.log(`Directory exists: ${dir}`);
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
    const response = await axios.post(`${getPublicBaseUrl()}/api/chat/send`, {
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

  console.log('Processing uploaded file:', {
    originalname: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
    path: file.path,
    exists: fs.existsSync(file.path)
  });

  // Ensure directories exist
  [STORAGE_DIR, UPLOAD_DIR, MARKDOWN_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
      console.log(`Creating directory: ${dir}`);
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  // Generate a unique ID for the file
  const fileId = generateUniqueId(file.originalname);
  const originalExt = path.extname(file.originalname);
  const newFilename = `${fileId}${originalExt}`;
  const newPath = path.join(UPLOAD_DIR, newFilename);

  // Log file paths
  console.log('File paths:', {
    originalPath: file.path,
    newPath,
    uploadDir: UPLOAD_DIR,
    originalPathExists: fs.existsSync(file.path),
    targetDirExists: fs.existsSync(UPLOAD_DIR)
  });
  
  // Ensure upload directory exists one more time
  if (!fs.existsSync(UPLOAD_DIR)) {
    console.log(`Creating upload directory: ${UPLOAD_DIR}`);
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }

  // Move file to uploads directory with robust error handling
  try {
    // Check if file exists at the original path
    if (!fs.existsSync(file.path)) {
      console.error(`File not found at path: ${file.path}`);
      throw new Error(`File not found at path: ${file.path}`);
    }
    
    // Copy file to new location
    console.log(`Copying file from ${file.path} to ${newPath}`);
    fs.copyFileSync(file.path, newPath);
    console.log(`File copied successfully. Deleting original...`);
    
    // Delete the original file after copying
    try {
      fs.unlinkSync(file.path);
      console.log(`Original file deleted`);
    } catch (unlinkError) {
      console.warn(`Could not delete original file: ${unlinkError.message}`);
      // Continue processing - not a fatal error
    }
  } catch (error) {
    console.error('Error moving file:', error);
    
    // Try an alternative method if the copy fails
    try {
      console.log(`Attempting alternative copy method...`);
      const fileContent = fs.readFileSync(file.path);
      fs.writeFileSync(newPath, fileContent);
      console.log(`File copied (alternative method) to: ${newPath}`);
    } catch (altError) {
      console.error('Alternative file copy also failed:', altError);
      throw new Error(`Failed to save file: ${altError.message}`);
    }
  }

  // Verify the new file exists
  if (!fs.existsSync(newPath)) {
    console.error(`File copy verification failed. File not found at ${newPath}`);
    throw new Error(`File copy failed: File not found at destination path`);
  } else {
    console.log(`File copy verified: ${newPath} exists`);
  }

  // For CSV files, read raw content first for type detection
  let rawContent = '';
  if (originalExt.toLowerCase() === '.csv') {
    try {
      rawContent = fs.readFileSync(newPath, 'utf8');
      console.log('Raw CSV content for type detection:', rawContent.slice(0, 200));
    } catch (error) {
      console.error('Error reading raw CSV content:', error);
    }
  }

  // Convert to markdown
  console.log(`Converting file to markdown: ${newPath}`);
  const markdownContent = await convertToMarkdown({ 
    ...file, 
    path: newPath, 
    originalname: file.originalname 
  });
  
  // Get file type based on extension and content
  const fileType = getFileType(file, rawContent || markdownContent);
  console.log('Detected file type:', fileType);

  // If it's still unknown, try using the LLM classifier
  let finalType = fileType;
  if (fileType === 'Unknown Document' || fileType.endsWith('File')) {
    console.log('Attempting LLM classification...');
    try {
      const classifiedType = await classifyFileContent(rawContent || markdownContent);
      if (classifiedType !== 'Unclassified') {
        finalType = classifiedType;
        console.log('LLM classified as:', finalType);
      }
    } catch (classifyError) {
      console.error('Error during LLM classification:', classifyError);
      // Continue with the original file type
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
  
  // Ensure markdown directory exists
  if (!fs.existsSync(MARKDOWN_DIR)) {
    console.log(`Creating markdown directory: ${MARKDOWN_DIR}`);
    fs.mkdirSync(MARKDOWN_DIR, { recursive: true });
  }
  
  // Write markdown content
  fs.writeFileSync(markdownPath, markdownWithMetadata);
  console.log(`Markdown file created at: ${markdownPath}`);

  // Get file stats
  const stats = fs.statSync(newPath);

  // Return file details
  console.log(`File processing complete. Returning file details for ${fileId}`);
  return {
    id: fileId,
    originalname: file.originalname,
    filename: newFilename,  // Return the actual filename saved in the directory
    path: newPath,
    markdownPath,
    size: stats.size,
    type: file.mimetype,
    uploadDate: new Date().toISOString(),
    mimeType: file.mimetype,
    fileType: finalType // The classified document type (e.g., "Invoice", "PDF Document")
  };
};

const listFiles = () => {
  try {
    console.log(`Listing files from: ${UPLOAD_DIR}`);
    
    if (!fs.existsSync(UPLOAD_DIR)) {
      console.error(`Upload directory does not exist: ${UPLOAD_DIR}`);
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
      return [];
    }

    // List all files in the directory
    const fileEntries = fs.readdirSync(UPLOAD_DIR);
    console.log(`Found ${fileEntries.length} entries in directory`);
    
    // Process each file
    const files = fileEntries
      .filter(file => {
        try {
          const filePath = path.join(UPLOAD_DIR, file);
          const isFile = fs.statSync(filePath).isFile();
          if (!isFile) console.log(`Skipping non-file: ${file}`);
          return isFile;
        } catch (err) {
          console.error(`Error checking file ${file}:`, err);
          return false;
        }
      })
      .map(file => {
        try {
          const filePath = path.join(UPLOAD_DIR, file);
          const stats = fs.statSync(filePath);
          const fileId = path.parse(file).name;
          const markdownPath = path.join(MARKDOWN_DIR, `${fileId}.md`);
          
          let type = 'Unknown Document';
          let originalName = file;
          let mimetype = '';
          
          // Log file info for debugging
          console.log(`Processing file: ${file} (size: ${stats.size} bytes)`);
          
          // Try to determine MIME type from file extension
          const ext = path.extname(file).toLowerCase();
          switch (ext) {
            case '.pdf': mimetype = 'application/pdf'; break;
            case '.docx': mimetype = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'; break;
            case '.xlsx': mimetype = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'; break;
            case '.csv': mimetype = 'text/csv'; break;
            case '.txt': mimetype = 'text/plain'; break;
            case '.md': mimetype = 'text/markdown'; break;
            default: mimetype = 'application/octet-stream';
          }
          
          // Try to read metadata from markdown file
          if (fs.existsSync(markdownPath)) {
            try {
              console.log(`Found matching markdown file: ${markdownPath}`);
              const mdContent = fs.readFileSync(markdownPath, 'utf8');
              const typeMatch = mdContent.match(/Type:\s*([^\n]+)/);
              const nameMatch = mdContent.match(/Original Name:\s*([^\n]+)/);
              
              if (typeMatch) {
                type = typeMatch[1].trim();
                console.log(`Detected type from markdown: ${type}`);
              }
              if (nameMatch) {
                originalName = nameMatch[1].trim();
                console.log(`Detected original name from markdown: ${originalName}`);
              }
            } catch (err) {
              console.error(`Error reading markdown metadata for ${file}:`, err);
            }
          } else {
            console.log(`No matching markdown file found for: ${file}`);
          }

          return {
            id: fileId,
            filename: file, // Use actual filename for storage
            originalname: originalName, // Use for display
            path: filePath,
            size: stats.size,
            type: type, // Document type (e.g., "Invoice", "Contract")
            uploadDate: stats.mtime,
            mimetype: mimetype // MIME type (e.g., "application/pdf")
          };
        } catch (err) {
          console.error(`Error processing file ${file}:`, err);
          return null;
        }
      })
      .filter(file => file !== null);

    console.log(`Successfully listed ${files.length} files from ${UPLOAD_DIR}`);
    return files;
  } catch (err) {
    console.error('Error listing files:', err);
    return [];
  }
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

const createFileFromExternalSource = async (fileData) => {
  const { 
    content,
    fileName, 
    sourceType,  // 'sec-filings' or 'companies-house'
    fileType,    // PDF, HTML, etc
    metadata = {}
  } = fileData;
  
  if (!content || !fileName || !sourceType) {
    throw new Error('Missing required parameters for external file creation');
  }

  const fileId = generateUniqueId(fileName);
  const ext = fileType.toLowerCase() === 'pdf' ? '.pdf' : '.html';
  const newFilename = `${fileId}${ext}`;
  const newPath = path.join(UPLOAD_DIR, newFilename);

  // Save file content
  fs.writeFileSync(newPath, content);
  
  // Extract text content for markdown
  let markdownContent = '';
  if (fileType.toLowerCase() === 'pdf') {
    try {
      const dataBuffer = Buffer.from(content);
      const pdfData = await pdf(dataBuffer);
      markdownContent = pdfData.text;
    } catch (err) {
      console.error('Error extracting text from PDF:', err);
      markdownContent = 'Unable to extract text from PDF.';
    }
  } else {
    // For HTML, remove tags to get plain text
    markdownContent = content.replace(/<[^>]*>/g, ' ').trim();
  }

  // Create the display type based on source
  let displayType = '';
  if (sourceType === 'sec-filings') {
    displayType = metadata.filing_type ? `SEC ${metadata.filing_type} Filing` : 'SEC Filing';
  } else if (sourceType === 'companies-house') {
    displayType = metadata.filing_type ? `Companies House ${metadata.filing_type}` : 'Companies House Filing';
  } else {
    displayType = 'External Document';
  }

  // Add metadata to markdown content
  const markdownWithMetadata = `---
Type: ${displayType}
Original Name: ${fileName}
Source: ${sourceType}
Upload Date: ${new Date().toISOString()}
${metadata.company ? `Company: ${metadata.company}` : ''}
${metadata.filing_date ? `Filing Date: ${metadata.filing_date}` : ''}
${metadata.filing_type ? `Filing Type: ${metadata.filing_type}` : ''}
${metadata.description ? `Description: ${metadata.description}` : ''}
---

${markdownContent}`;

  const markdownPath = path.join(MARKDOWN_DIR, `${fileId}.md`);
  fs.writeFileSync(markdownPath, markdownWithMetadata);

  // Get file stats
  const stats = fs.statSync(newPath);

  // Return file metadata
  return {
    id: fileId,
    originalName: fileName,
    filename: fileName,
    path: newPath,
    markdownPath,
    size: stats.size,
    type: displayType,
    uploadDate: new Date(),
    mimeType: fileType.toLowerCase() === 'pdf' ? 'application/pdf' : 'text/html',
    source: sourceType,
    sourceMetadata: metadata
  };
};

/**
 * Downloads and processes a file from a URL
 * @param {Object} options - File download options
 * @param {string} options.url - URL to download file from
 * @param {string} options.fileName - Suggested filename
 * @param {string} options.fileType - Type of file (PDF, Excel, etc.)
 * @param {string} options.description - Optional description of the file
 * @returns {Promise<Object>} Processed file data
 */
const processFileFromUrl = async (options) => {
  if (!options || !options.url) {
    throw new Error('URL is required for file download');
  }

  console.log(`Downloading file from URL: ${options.url}`);
  
  try {
    // Download the file from the URL
    const response = await axios.get(options.url, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    // Determine filename and content type
    const contentType = response.headers['content-type'] || 'application/octet-stream';
    const fileName = options.fileName || getFileNameFromUrl(options.url, contentType);
    
    // Create a temporary file
    const tempFilePath = path.join(UPLOAD_DIR, `temp-${Date.now()}`);
    fs.writeFileSync(tempFilePath, response.data);
    
    // Create file object similar to what multer would provide
    const file = {
      originalname: fileName,
      path: tempFilePath,
      size: response.data.length,
      mimetype: contentType
    };
    
    // Process the file as a regular upload
    const result = await processUploadedFile(file);
    
    // Add additional metadata if provided
    if (options.description) {
      // Update the markdown file with the description
      const markdownPath = path.join(MARKDOWN_DIR, `${result.id}.md`);
      let markdownContent = fs.readFileSync(markdownPath, 'utf8');
      
      // Add description to metadata
      markdownContent = markdownContent.replace('---', `---\nDescription: ${options.description}`);
      
      fs.writeFileSync(markdownPath, markdownContent);
    }
    
    return result;
  } catch (error) {
    console.error('Error downloading or processing file from URL:', error);
    throw new Error(`Failed to download file: ${error.message}`);
  }
};

/**
 * Extract filename from URL or content type
 */
const getFileNameFromUrl = (url, contentType) => {
  // Try to get filename from URL
  const urlParts = url.split('/');
  let fileName = urlParts[urlParts.length - 1];
  
  // Remove query parameters if any
  if (fileName.includes('?')) {
    fileName = fileName.split('?')[0];
  }
  
  // If no filename or it's empty, generate one based on content type
  if (!fileName || fileName === '') {
    const extension = contentTypeToExtension(contentType);
    fileName = `file-${Date.now()}${extension}`;
  }
  
  return fileName;
};

/**
 * Convert content type to file extension
 */
const contentTypeToExtension = (contentType) => {
  const map = {
    'application/pdf': '.pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
    'text/csv': '.csv',
    'text/plain': '.txt',
    'text/markdown': '.md',
    'application/json': '.json',
    'text/html': '.html'
  };
  
  return map[contentType] || '.bin';
};

// Add the processFileWithMarkItDown method
const processFileWithMarkItDown = async (file, options = {}) => {
  console.log(`Starting MarkItDown processing for file ${file.id} (${file.filename || file.originalname})`);
  
  try {
    // Check if we have a filename or need to use the original name
    const actualFilename = file.filename || file.originalname;
    
    // Get the file path - try both the direct path and constructing it
    let filePath = file.path;
    if (!filePath || !fs.existsSync(filePath)) {
      filePath = path.join(UPLOAD_DIR, actualFilename);
      console.log(`Original path not found, trying: ${filePath}`);
    }
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      // One more fallback - try to find the file by ID
      const files = fs.readdirSync(UPLOAD_DIR);
      const matchingFile = files.find(f => f.startsWith(file.id));
      if (matchingFile) {
        filePath = path.join(UPLOAD_DIR, matchingFile);
        console.log(`Found file by ID match: ${filePath}`);
      } else {
        throw new Error(`File not found at path: ${filePath} or by ID: ${file.id}`);
      }
    }
    
    console.log(`Processing file from path: ${filePath}`);
    
    // Get the original file stats
    const originalStats = fs.statSync(filePath);
    console.log(`Original file size: ${originalStats.size} bytes`);
    
    // Convert to markdown with robust error handling
    let markdownContent;
    try {
      markdownContent = await convertToMarkdown({
        path: filePath,
        originalname: actualFilename,
        mimetype: file.type || file.mimeType
      });
      console.log(`Converted to markdown: ${markdownContent.length} characters`);
    } catch (conversionError) {
      console.error(`Error converting file to markdown:`, conversionError);
      // Provide a fallback content so we can continue
      markdownContent = `Error converting file: ${conversionError.message}\n\nThis file could not be automatically converted to markdown.`;
    }
    
    // Generate unique ID for the markdown file
    const markdownId = generateUniqueId(`${actualFilename}-markdown`);
    const markdownFileName = `${markdownId}.md`;
    const markdownPath = path.join(MARKDOWN_DIR, markdownFileName);
    
    // Ensure markdown directory exists
    if (!fs.existsSync(MARKDOWN_DIR)) {
      fs.mkdirSync(MARKDOWN_DIR, { recursive: true });
      console.log(`Created markdown directory: ${MARKDOWN_DIR}`);
    }
    
    // Save markdown content to a file
    fs.writeFileSync(markdownPath, markdownContent);
    console.log(`Saved markdown to: ${markdownPath}`);
    
    // Get file stats
    const stats = fs.statSync(markdownPath);
    
    // Create processed file record
    const processedFile = {
      id: markdownId,
      filename: markdownFileName,
      originalFilename: `${actualFilename}.md`,
      type: 'text/markdown',
      size: stats.size,
      uploadDate: new Date().toISOString(),
      path: markdownPath,
      originalFileId: file.id,
      content: options.extractAll ? markdownContent : markdownContent.substring(0, 1000),
      contentSummary: markdownContent.substring(0, 300)
    };
    
    // Classify content if needed
    if (options.classify) {
      try {
        processedFile.classification = await classifyFileContent(markdownContent);
        console.log(`Classified as: ${processedFile.classification}`);
      } catch (classifyError) {
        console.error(`Error classifying content:`, classifyError);
        processedFile.classification = 'Unclassified';
      }
    }
    
    return processedFile;
  } catch (error) {
    console.error(`Error processing file with MarkItDown: ${error.message}`, error);
    throw error;
  }
};

// Add the getFileById method
const getFileById = (fileId) => {
  try {
    const files = listFiles();
    return files.find(file => file.id === fileId);
  } catch (error) {
    console.error(`Error finding file by ID (${fileId}): ${error.message}`);
    return null;
  }
};

// Add a method to get the upload directory
const getUploadDirectory = () => {
  // Ensure the directory exists before returning
  if (!fs.existsSync(UPLOAD_DIR)) {
    try {
      console.log(`Creating upload directory: ${UPLOAD_DIR}`);
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    } catch (err) {
      console.error(`Failed to create upload directory: ${UPLOAD_DIR}`, err);
    }
  }
  
  return UPLOAD_DIR;
};

// Export all methods
module.exports = {
  processUploadedFile,
  processFileFromUrl,
  listFiles,
  deleteFile,
  createFileFromExternalSource,
  getFileMarkdownContent,
  getFileNameFromUrl,
  contentTypeToExtension,
  getFileById,
  processFileWithMarkItDown,
  getUploadDirectory
}; 