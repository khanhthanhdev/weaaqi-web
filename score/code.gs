// Configuration - Dễ dàng thay đổi
const PASS_THRESHOLD = 70; // Ngưỡng đậu - thay đổi 1 chỗ này là đủ

const CONFIG = {
  SHEET_URL: "https://docs.google.com/spreadsheets/d/1mluWSHLin0g5h9D1B5coAh-ElrtJ2rUe79h24FYhpJs/edit?usp=sharing", // !!! REPLACE WITH YOUR ACTUAL SPREADSHEET_URL !!!
  SHEETS: {
    DATABASE: "database",
    CONFIRMATIONS: "confirmations",
    CHANGE: "change",
    REQUIRE: "require"
  },  COLUMNS: {
    DATABASE: {
      // Các cột cũ đang dùng cho xác nhận thông tin
      TOTAL_SCORE: 0,
      FULL_NAME: 4,
      EMAIL: 5,
      SCHOOL: 6,
      // Mapping chi tiết cho sheet điểm (theo header bạn cung cấp)
      SCORES: {
        EMAIL_ADDR: 0,
        USERNAME: 1,
        B1_ATTEND: 2,
        B1_ESSAY: 3,
        B1_REFLECTION: 4,
        B1_TOTAL: 5,
        B2_ATTEND: 6,
        B2_ESSAY: 7,
        B2_REFLECTION: 8,
        B2_TOTAL: 9,
        B3_ATTEND: 10,
        B3_ESSAY: 11,
        B3_REFLECTION: 12,
        B3_TOTAL: 13,
        B4_ATTEND: 14,
        B4_TOTAL: 15,
        FINAL_01: 16,
        FINAL_02: 17,
        FINAL_03: 18,
        FINAL_TOTAL: 19,
        TOTAL: 20
      }
    }
  },
  CACHE_DURATION: 300,
  MAX_CACHE_ITEM_SIZE: 95000,
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000
};

function doGet() {
  return HtmlService.createHtmlOutputFromFile('form')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ... (handleError, executeWithRetry, getCachedData, getUserInfo, confirmCorrect, validateEmailString, writeToSheet remain the same as previous full code.gs)
// ... (submitNotFoundRequest, clearCacheManually, healthCheck remain the same)

// Helper function to validate email string format
function validateEmailString(email) {
    if (!email || typeof email !== 'string') return false;
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email.trim().toLowerCase());
}

// Check if email has already been processed (confirmed or changed)
function checkEmailAlreadyProcessed(email) {
  try {
    if (!email || typeof email !== 'string') {
      return { alreadyProcessed: false, error: 'Email không hợp lệ.' };
    }
    
    const searchEmail = email.trim().toLowerCase();
    const ss = SpreadsheetApp.openByUrl(CONFIG.SHEET_URL);
    
    // Check confirmations sheet
    const confirmationsSheet = ss.getSheetByName(CONFIG.SHEETS.CONFIRMATIONS);
    if (confirmationsSheet) {
      const confirmationsData = confirmationsSheet.getDataRange().getValues();
      if (confirmationsData.length > 1) { // Skip header row
        for (let i = 1; i < confirmationsData.length; i++) {
          const rowEmail = confirmationsData[i][1]; // Email is in column B (index 1)
          if (rowEmail && rowEmail.toString().trim().toLowerCase() === searchEmail) {
            return { 
              alreadyProcessed: true, 
              type: 'confirmed',
              message: 'Email này đã được xác nhận thông tin trước đó. Mỗi email chỉ được xử lý một lần duy nhất.' 
            };
          }
        }
      }
    }
    
    // Check change sheet
    const changeSheet = ss.getSheetByName(CONFIG.SHEETS.CHANGE);
    if (changeSheet) {
      const changeData = changeSheet.getDataRange().getValues();
      if (changeData.length > 1) { // Skip header row
        for (let i = 1; i < changeData.length; i++) {
          const rowEmail = changeData[i][1]; // Email is in column B (index 1)
          if (rowEmail && rowEmail.toString().trim().toLowerCase() === searchEmail) {
            return { 
              alreadyProcessed: true, 
              type: 'changed',
              message: 'Email này đã gửi yêu cầu chỉnh sửa trước đó. Mỗi email chỉ được xử lý một lần duy nhất.' 
            };
          }
        }
      }
    }
    
    return { alreadyProcessed: false };
    
  } catch (error) {
    console.error('Error checking if email already processed:', error);
    return { 
      alreadyProcessed: false, 
      error: 'Có lỗi khi kiểm tra trạng thái email. Vui lòng thử lại.' 
    };
  }
}


// --- MODIFIED FUNCTION ---
function submitConfirmation(formData, originalFetchedData) {
  try {
    // --- Server-side Validation ---
    if (!formData || typeof formData !== 'object') throw new Error("Dữ liệu form không hợp lệ.");
    if (!originalFetchedData || typeof originalFetchedData !== 'object') throw new Error("Dữ liệu gốc không hợp lệ để so sánh.");

    const requiredFields = ['email', 'name', 'school'];
    for (let field of requiredFields) {
      if (!formData[field] || formData[field].toString().trim() === '') {
        throw new Error(`Trường "${field === 'email' ? 'Email' : field === 'name' ? 'Họ tên' : 'Trường/Đơn vị'}" là bắt buộc và không được để trống.`);
      }
    }
    if (!validateEmailString(formData.email)) {
        throw new Error("Địa chỉ email không hợp lệ.");
    }

    const trimmedEmail = formData.email.trim();
    
    // Check if email has already been processed
    const processedCheck = checkEmailAlreadyProcessed(trimmedEmail);
    if (processedCheck.error) {
      throw new Error(processedCheck.error);
    }
    if (processedCheck.alreadyProcessed) {
      throw new Error(processedCheck.message);
    }

    const currentName = formData.name.trim();
    const currentSchool = formData.school ? formData.school.trim() : '';
    let userNote = formData.note ? formData.note.trim() : '';

    const originalName = originalFetchedData.name ? originalFetchedData.name.trim() : '';
    const originalSchool = originalFetchedData.school ? originalFetchedData.school.trim() : '';

    // Case-insensitive comparison to see if data actually changed
    const nameChanged = currentName.toLowerCase() !== originalName.toLowerCase();
    const schoolChanged = currentSchool.toLowerCase() !== originalSchool.toLowerCase();

    let noteForSheet = "";

    if (nameChanged || schoolChanged) {
      // Data DID change. Prepend details of the change to the user's note.
      let changeDetails = "ĐÃ THAY ĐỔI: ";
      if (nameChanged) {
        changeDetails += `Tên (gốc: "${originalName}" -> mới: "${currentName}"). `;
      }
      if (schoolChanged) {
        changeDetails += `Trường (gốc: "${originalSchool}" -> mới: "${currentSchool}"). `;
      }
      noteForSheet = changeDetails + (userNote ? `Ghi chú người dùng: ${userNote}` : "Không có ghi chú thêm từ người dùng.");
      console.log(`Data changed for ${trimmedEmail}. Original: {name: "${originalName}", school: "${originalSchool}"}. New: {name: "${currentName}", school: "${currentSchool}"}. User note: "${userNote}"`);
    } else {
      // Data did NOT change (name and school are the same as original).
      // Use the user's note as is, or a default if no note was provided.
      noteForSheet = userNote || 'Người dùng nhấn "Cần chỉnh sửa / Có ghi chú" nhưng không thay đổi tên/trường.';
      console.log(`Data NOT changed for ${trimmedEmail} but 'Cần chỉnh sửa / Có ghi chú' clicked. User note: "${userNote}"`);
    }

    // SAVE TO "CHANGE" SHEET instead of "CONFIRMATIONS"
    const sheetToWriteTo = CONFIG.SHEETS.CHANGE;

    // Data for "Change" sheet.
    // Headers: "Timestamp", "Email", "Name", "Phone", "District", "Unit", "Note"
    // The Name and School written will be the CURRENT (potentially new) values from the form.
    const rowData = [
      new Date(),
      trimmedEmail,
      currentName, // Current (possibly new) name
      '', // Phone
      '', // District
      currentSchool, // Current (possibly new) school
      noteForSheet // The constructed note detailing changes or just user's note
    ];
    
    const dataForSheet = [rowData]; // writeToSheet expects an array of rows

    executeWithRetry(function writeSubmittedConfirmationToChange() {
      writeToSheet(sheetToWriteTo, dataForSheet, true); // Create sheet if not exists
    });

    try {
      CacheService.getScriptCache().remove('database_data');
      console.log("Cache cleared after 'submitConfirmation' (change flow).");
    } catch (e) {
      console.warn('Could not clear cache after submitConfirmation (change flow):', e.message);
    }

    const messageToUser = "Thông tin chỉnh sửa/ghi chú của bạn đã được gửi đến BTC!";
    return messageToUser;

  } catch (error) {
    const message = (error instanceof Error && error.message) ? error.message : handleError(error, 'submitConfirmation').message;
    throw new Error(message);
  }
}

// Get headers cho từng loại sheet (used when auto-creating a sheet)
function getHeadersForSheet(sheetName) {
  switch (sheetName) {
    case CONFIG.SHEETS.DATABASE:
      return ["total_score", "fullName", "email", "school"];
    case CONFIG.SHEETS.CONFIRMATIONS:
      // This sheet handles all "Thông tin chính xác" confirmations
      return ["Timestamp", "Email", "Name", "Phone", "District", "Unit", "Note"];
    case CONFIG.SHEETS.CHANGE:
      // This sheet handles all "Cần chỉnh sửa / Có ghi chú" submissions
      return ["Timestamp", "Email", "Name", "Phone", "District", "Unit", "Note"];    case CONFIG.SHEETS.REQUIRE:
      // This sheet is for "Support Request" submissions
      return ["Timestamp", "Email", "Name", "Phone", "School", "Total_Score"];
    default:
      console.warn(`No headers defined for sheet name: ${sheetName}`);
      return [];
  }
}


// =====================================================================================
// PASTE THE REST OF THE FUNCTIONS FROM THE PREVIOUS FULL code.gs HERE:
// - handleError
// - executeWithRetry
// - getCachedData
// - getUserInfo
// - confirmCorrect (this one is fine as is)
// - submitNotFoundRequest (this one is fine as is)
// - writeToSheet
// - clearCacheManually
// - healthCheck
// =====================================================================================

// --- Placeholder for the rest of the functions (copy from your complete code.gs) ---

// Enhanced error handling function
function handleError(error, context = '') {
  console.error(`Error in ${context}:`, error, error.stack);

  const errorMessage = (error.message || error.toString()).toLowerCase();
  const isQuotaError = errorMessage.includes('quota') ||
                      errorMessage.includes('rate limit') ||
                      errorMessage.includes('too many') ||
                      errorMessage.includes('service invoked too many times') ||
                      errorMessage.includes('exceeded') ||
                      errorMessage.includes('timeout') ||
                      errorMessage.includes('argument too large') || 
                      errorMessage.includes('đối số quá lớn');      

  if (isQuotaError) {
    return {
      success: false,
      isOverload: true,
      message: "Hệ thống đang quá tải hoặc gặp giới hạn tài nguyên. Vui lòng thử lại sau 5-10 phút hoặc liên hệ với BTC để được hỗ trợ.",
      originalError: error.message || error.toString()
    };
  }

  return {
    success: false,
    isOverload: false,
    message: "Có lỗi xảy ra. Vui lòng thử lại vào ngày mai, hoặc liên hệ với BTC để được hỗ trợ.",
    originalError: error.message || error.toString()
  };
}

// Retry mechanism for critical operations
function executeWithRetry(operation, maxRetries = CONFIG.MAX_RETRIES) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return operation();
    } catch (error) {
      console.warn(`Attempt ${attempt} failed for ${operation.name || 'anonymous operation'}:`, error.message);
      if (attempt === maxRetries) {
        console.error(`Max retries reached for ${operation.name || 'anonymous operation'}. Last error:`, error.message, error.stack);
        throw error; 
      }
      Utilities.sleep(CONFIG.RETRY_DELAY * attempt); 
    }
  }
}

// Cache để giảm số lần đọc Google Sheets
function getCachedData() {
  const cache = CacheService.getScriptCache();
  const cacheKey = 'database_data';
  let cachedJsonString = cache.get(cacheKey);

  if (cachedJsonString) {
    try {
      const parsedData = JSON.parse(cachedJsonString);
      if (Array.isArray(parsedData)) {
        return parsedData;
      } else {
        console.warn('Cached data was not an array. Invalidating cache.');
        cache.remove(cacheKey);
      }
    } catch (e) {
      console.warn(`Error parsing cached data: ${e.message}. Invalidating cache.`);
      cache.remove(cacheKey);
    }
  }

  console.log('Cache miss or invalid cache - Loading data from sheet');
  let processedDataArray;
  try {
    processedDataArray = executeWithRetry(function loadSheetData() {
      const ss = SpreadsheetApp.openByUrl(CONFIG.SHEET_URL);
      const sheet = ss.getSheetByName(CONFIG.SHEETS.DATABASE);
      if (!sheet) {
        throw new Error(`Sheet "${CONFIG.SHEETS.DATABASE}" not found in spreadsheet "${CONFIG.SHEET_URL}"`);
      }
      const range = sheet.getDataRange();
      if (range.getNumRows() <= 1) { 
        return [];
      }
      const rawData = range.getValues().slice(1);
      const dbCols = CONFIG.COLUMNS.DATABASE;
      const scoreCols = dbCols.SCORES;

      return rawData
        // Lọc theo cột email_addr trong bảng điểm
        .filter(row => row[scoreCols.EMAIL_ADDR] && row[scoreCols.EMAIL_ADDR].toString().trim() !== '')
        .map(row => {
          const emailAddr = row[scoreCols.EMAIL_ADDR]
            ? row[scoreCols.EMAIL_ADDR].toString().trim().toLowerCase()
            : '';

          const username = row[scoreCols.USERNAME]
            ? row[scoreCols.USERNAME].toString().trim()
            : '';

          const totalRaw = row[scoreCols.TOTAL];
          const totalNumber = typeof totalRaw === 'number'
            ? totalRaw
            : parseFloat(totalRaw ? totalRaw.toString().trim() : '0');
          const safeTotal = Number.isFinite(totalNumber) ? totalNumber : 0;

          const scores = {
            bai1: {
              attend: row[scoreCols.B1_ATTEND] || '',
              essay: row[scoreCols.B1_ESSAY] || '',
              reflection: row[scoreCols.B1_REFLECTION] || '',
              total: row[scoreCols.B1_TOTAL] || ''
            },
            bai2: {
              attend: row[scoreCols.B2_ATTEND] || '',
              essay: row[scoreCols.B2_ESSAY] || '',
              reflection: row[scoreCols.B2_REFLECTION] || '',
              total: row[scoreCols.B2_TOTAL] || ''
            },
            bai3: {
              attend: row[scoreCols.B3_ATTEND] || '',
              essay: row[scoreCols.B3_ESSAY] || '',
              reflection: row[scoreCols.B3_REFLECTION] || '',
              total: row[scoreCols.B3_TOTAL] || ''
            },
            bai4: {
              attend: row[scoreCols.B4_ATTEND] || '',
              total: row[scoreCols.B4_TOTAL] || ''
            },
            final: {
              de01: row[scoreCols.FINAL_01] || '',
              de02: row[scoreCols.FINAL_02] || '',
              de03: row[scoreCols.FINAL_03] || '',
              total: row[scoreCols.FINAL_TOTAL] || ''
            },
            total: safeTotal
          };

          const schoolValue = dbCols.SCHOOL !== undefined && dbCols.SCHOOL !== null
            ? (row[dbCols.SCHOOL] ? row[dbCols.SCHOOL].toString().trim() : '')
            : '';

          return {
            email: emailAddr,
            name: username,
            school: schoolValue,
            score: safeTotal.toString(),
            pass: safeTotal >= PASS_THRESHOLD,
            scores
          };
        });
    });

    try {
      const stringToCache = JSON.stringify(processedDataArray);
      if (stringToCache.length < CONFIG.MAX_CACHE_ITEM_SIZE) {
        cache.put(cacheKey, stringToCache, CONFIG.CACHE_DURATION);
        console.log(`Data loaded from sheet and cached successfully. Size: ${stringToCache.length} bytes.`);
      } else {
        console.warn(`Data loaded from sheet is too large to cache (${stringToCache.length} bytes, limit ${CONFIG.MAX_CACHE_ITEM_SIZE} bytes). Proceeding without caching for this request.`);
      }
    } catch (cachePutError) {
      console.warn(`Could not cache data due to: ${cachePutError.message}. Proceeding without caching. Data size for stringify: ${JSON.stringify(processedDataArray).length}`);
    }
    return processedDataArray;

  } catch (sheetError) {
    const errorResult = handleError(sheetError, 'getCachedData - sheetRead');
    console.error('Fatal error loading data from sheet:', errorResult.originalError, sheetError.stack);
    return []; 
  }
}

function getUserInfo(email) {
  try {
    if (!email || typeof email !== 'string') {
      return { found: false, error: 'Email không hợp lệ. Vui lòng nhập đúng định dạng email.' };
    }
    const searchEmail = email.trim().toLowerCase();
    const data = getCachedData(); 
    if (!Array.isArray(data)) { 
      console.error("CRITICAL: getCachedData did not return an array. Data received:", data);
      return {
        found: false,
        error: 'Hệ thống gặp lỗi khi truy xuất dữ liệu. Vui lòng thử lại sau hoặc liên hệ BTC.'
      };
    }
    const user = data.find(row => row.email === searchEmail);
    if (user) {
      return {
        found: true,
        name: user.name,
        school: user.school,
        score: user.score,
        pass: user.pass,
        scoreDetails: user.scores
      };
    }
    return { found: false };
  } catch (error) { 
    const errorResult = handleError(error, 'getUserInfo');
    return {
      found: false,
      error: errorResult.message,
      isOverload: errorResult.isOverload
    };
  }
}

function confirmCorrect(email, formData) {
  try {
    if (!email || typeof email !== 'string' || email.trim() === '') {
      throw new Error('Email là bắt buộc để xác nhận.');
    }
    
    if (!formData || typeof formData !== 'object') {
      throw new Error('Dữ liệu form không hợp lệ.');
    }

    const requiredFields = ['name', 'school'];
    for (let field of requiredFields) {
      if (!formData[field] || formData[field].toString().trim() === '') {
        throw new Error(`Trường "${field === 'name' ? 'Họ tên' : 'Trường/Đơn vị'}" là bắt buộc và không được để trống.`);
      }
    }
    
    const trimmedEmail = email.trim();
    
    // Check if email has already been processed
    const processedCheck = checkEmailAlreadyProcessed(trimmedEmail);
    if (processedCheck.error) {
      throw new Error(processedCheck.error);
    }
    if (processedCheck.alreadyProcessed) {
      throw new Error(processedCheck.message);
    }
    
    // Get original user info to validate against
    const userInfo = getUserInfo(trimmedEmail);
    if (userInfo.error) {
      throw new Error(userInfo.error); 
    }
    if (!userInfo.found) {
      throw new Error(`Không tìm thấy thông tin người dùng với email: ${trimmedEmail}. Vui lòng kiểm tra lại.`);
    }
    
    // Validate that form data matches original data
    const originalName = userInfo.name ? userInfo.name.trim() : '';
    const originalSchool = userInfo.school ? userInfo.school.trim() : '';
    const currentName = formData.name ? formData.name.trim() : '';
    const currentSchool = formData.school ? formData.school.trim() : '';
    
    // Case-insensitive comparison
    const nameMatches = currentName.toLowerCase() === originalName.toLowerCase();
    const schoolMatches = currentSchool.toLowerCase() === originalSchool.toLowerCase();
    
    if (!nameMatches || !schoolMatches) {
      throw new Error('Thông tin trong form không khớp với dữ liệu gốc. Vui lòng chọn "Cần chỉnh sửa / Có ghi chú" nếu bạn muốn thay đổi thông tin.');
    }
    
    // Save confirmation data
    const confirmationData = [
      new Date(),
      trimmedEmail,
      userInfo.name,
      '', 
      '', 
      userInfo.school, 
      "Thông tin chính xác - không cần chỉnh sửa"
    ];
    
    executeWithRetry(function writeConfirmation() {
      writeToSheet(CONFIG.SHEETS.CONFIRMATIONS, [confirmationData]);
    });
    
    try {
      CacheService.getScriptCache().remove('database_data'); 
      console.log("Cache cleared after 'confirmCorrect'.");
    } catch (e) {
      console.warn('Could not clear cache after confirmCorrect:', e.message);
    }
    
    return "Thông tin đã được xác nhận là chính xác!";
  } catch (error) {
    const message = (error instanceof Error && error.message) ? error.message : handleError(error, 'confirmCorrect').message;
    throw new Error(message); 
  }
}

function submitNotFoundRequest(data) {
  try {
    if (!data || typeof data !== 'object') throw new Error("Dữ liệu yêu cầu không hợp lệ.");
    if (!data.email || data.email.trim() === '' || !data.name || data.name.trim() === '') {
      throw new Error('Email và họ tên là bắt buộc khi gửi yêu cầu không tìm thấy.');
    }
    if (!validateEmailString(data.email)) {
        throw new Error("Địa chỉ email không hợp lệ.");
    }
    const school = data.school ? data.school.trim() : '';
    const requestDataRow = [
      new Date(),
      data.email.trim(),
      data.name.trim(),
      '', 
      school
    ];
    executeWithRetry(function writeNotFoundRequest() {
      writeToSheet(CONFIG.SHEETS.REQUIRE, [requestDataRow], true); 
    });
    return "Yêu cầu của bạn đã được gửi. BTC sẽ kiểm tra và phản hồi lại sớm!";
  } catch (error) {
    const message = (error instanceof Error && error.message) ? error.message : handleError(error, 'submitNotFoundRequest').message;
    throw new Error(message);
  }
}

function submitSupportRequest(data) {
  try {
    if (!data || typeof data !== 'object') throw new Error("Dữ liệu yêu cầu hỗ trợ không hợp lệ.");
    
    // Validate required fields
    const requiredFields = ['email', 'name', 'school', 'total_score'];
    for (let field of requiredFields) {
      if (!data[field] || data[field].toString().trim() === '') {
        const fieldNames = {
          'email': 'Email',
          'name': 'Họ tên',
          'school': 'Trường/Đơn vị',
          'total_score': 'Tổng điểm'
        };
        throw new Error(`${fieldNames[field]} là bắt buộc cho yêu cầu hỗ trợ.`);
      }
    }
    
    if (!validateEmailString(data.email)) {
        throw new Error("Địa chỉ email không hợp lệ.");
    }
    
    // Validate score is a number
    const score = data.total_score.toString().trim();
    if (isNaN(score) || score === '') {
      throw new Error("Tổng điểm phải là một số hợp lệ.");
    }
    
    const supportRequestRow = [
      new Date(),
      data.email.trim(),
      data.name.trim(),
      '', // Phone - empty for now
      data.school.trim(),
      score
    ];
    
    executeWithRetry(function writeSupportRequest() {
      writeToSheet(CONFIG.SHEETS.REQUIRE, [supportRequestRow], true); 
    });
    
    return "Yêu cầu hỗ trợ của bạn đã được gửi đến Ban Tổ chức!";
  } catch (error) {
    const message = (error instanceof Error && error.message) ? error.message : handleError(error, 'submitSupportRequest').message;
    throw new Error(message);
  }
}

function writeToSheet(sheetName, dataRowsArray, createIfNotExists = false) {
  try {
    const ss = SpreadsheetApp.openByUrl(CONFIG.SHEET_URL);
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet && createIfNotExists) {
      console.log(`Sheet "${sheetName}" not found. Creating it.`);
      sheet = ss.insertSheet(sheetName);
      const headers = getHeadersForSheet(sheetName);
      if (headers && headers.length > 0) {
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        SpreadsheetApp.flush(); 
      }
    }
    if (!sheet) {
      throw new Error(`Sheet "${sheetName}" không tồn tại và không thể tạo.`);
    }
    if (dataRowsArray && dataRowsArray.length > 0) {
      if (dataRowsArray[0] && Array.isArray(dataRowsArray[0]) && dataRowsArray[0].length > 0) {
        const startRow = sheet.getLastRow() + 1;
        const numRows = dataRowsArray.length;
        const numCols = dataRowsArray[0].length;
        sheet.getRange(startRow, 1, numRows, numCols).setValues(dataRowsArray);
        console.log(`Wrote ${numRows} row(s) to sheet "${sheetName}".`);
      } else {
        console.error("Data to write to sheet is not in expected format (array of arrays with content):", JSON.stringify(dataRowsArray));
        throw new Error("Lỗi định dạng dữ liệu khi chuẩn bị ghi vào sheet.");
      }
    } else {
      console.log(`No data provided to write to sheet "${sheetName}".`);
    }
  } catch (error) {
    console.error(`Error in writeToSheet ("${sheetName}"):`, error.message, error.stack);
    throw error; 
  }
}

function clearCacheManually() {
  try {
    CacheService.getScriptCache().remove('database_data');
    console.log("Cache 'database_data' cleared manually.");
    return "Cache cleared successfully";
  } catch (error) {
    const errorResult = handleError(error, 'clearCacheManually');
    console.error("Failed to clear cache manually:", errorResult.originalError);
    return `Error clearing cache: ${errorResult.message}`;
  }
}

function healthCheck() {
  let report = {
    timestamp: new Date().toISOString(),
    status: "OK",
    spreadsheetAccess: false,
    sheetStatus: {},
    cacheStatus: 'unknown',
    cacheSizeBytes: null,
    errors: []
  };
  try {
    const ss = SpreadsheetApp.openByUrl(CONFIG.SHEET_URL);
    report.spreadsheetAccess = true;
    for (const key in CONFIG.SHEETS) {
      const sheetName = CONFIG.SHEETS[key];
      try {
        report.sheetStatus[sheetName] = !!ss.getSheetByName(sheetName);
        if (!report.sheetStatus[sheetName]) {
          report.errors.push(`Sheet "${sheetName}" not found.`);
          report.status = "WARNING";
        }
      } catch (e) {
        report.sheetStatus[sheetName] = false;
        report.errors.push(`Error accessing sheet "${sheetName}": ${e.message}`);
        report.status = "ERROR";
      }
    }
    try {
      const cache = CacheService.getScriptCache();
      const cachedData = cache.get('database_data');
      report.cacheStatus = cachedData ? 'active' : 'empty';
      if (cachedData) {
        report.cacheSizeBytes = cachedData.length;
        if (report.cacheSizeBytes >= CONFIG.MAX_CACHE_ITEM_SIZE) {
            report.errors.push(`Cache size (${report.cacheSizeBytes} bytes) is at or near limit (${CONFIG.MAX_CACHE_ITEM_SIZE} bytes).`);
            report.status = "WARNING";
        }
      }
    } catch (e) {
      report.cacheStatus = 'error accessing cache';
      report.errors.push(`Error accessing cache: ${e.message}`);
      report.status = "ERROR";
    }
  } catch (error) {
    report.status = "CRITICAL_ERROR";
    report.errors.push(`Overall health check failed: ${error.message}`);
    const errorResult = handleError(error, 'healthCheck'); 
    report.errors.push(`Original error: ${errorResult.originalError}`);
  }
  console.log("Health Check Report:", JSON.stringify(report, null, 2));
  return report;
}

// --- End of pasted functions ---