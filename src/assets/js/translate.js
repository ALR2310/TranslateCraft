// Cài đặt trên trang
var translatePage = JSON.parse(localStorage.getItem("pages")).translate;
$('#showTextInput').prop('checked', translatePage.showTextInput);
$('#showTextOutput').prop("checked", translatePage.showTextOutput);

$('#showTextInput, #showTextOutput').on('change', function () { toggleInOutText(); });

function toggleInOutText() {
    function updateVisibility(selector, isVisible, isOtherVisible) {
        const $element = $(selector).closest('div');
        const tableHeight = $('#tb_translate').closest('.tableScroll').css('height');
        if (isVisible) {
            $element.removeClass('d-none');
            $(selector).css('height', isOtherVisible ? '238px' : tableHeight);
        } else {
            $element.addClass('d-none');
        }
    }

    const showTextInput = $('#showTextInput').is(':checked');
    const showTextOutput = $('#showTextOutput').is(':checked');

    // Cập nhật hiển thị của các phần tử dựa trên trạng thái checkbox
    updateVisibility('#transText', showTextInput, showTextOutput);
    updateVisibility('#transResult', showTextOutput, showTextInput);

    // Cập nhật hiển thị của khối văn bản
    if (!showTextInput && !showTextOutput) {
        $('#col-text_translate').addClass('d-none');
        $('#col-table_translate').removeClass('col-7');
        resizeRowTable('#tb_translate', 3, "300px", "auto", "500px");
    } else {
        $('#col-text_translate').removeClass('d-none');
        $('#col-table_translate').addClass('col-7');
        resizeRowTable('#tb_translate', 3, "200px", "auto", "275px");
    }
}

// Hàm check xem nội dung có phải là một obj không
function checkIsObj(element) {
    try {
        $(element).removeClass('is-invalid');
        JSON.parse($(element).val());
    } catch (err) {
        $(element).addClass('is-invalid');
        return;
    }
}

// Đọc dữ liệu trong tệp
$('#translate-openFiles').on('change', function (e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (res) {
            $('#transText').val(res.target.result);
            checkIsObj('#transText');
            createTableFilter(JSON.parse(res.target.result), '#tb_filter', '#tb_filter-Template');
        }
        reader.readAsText(file);
    }
});

// kiểm tra lỗi trên text
$('#transText').on('input', function () {
    try {
        if ($(this).val() === "") return;
        checkIsObj(this);
        createTableFilter(JSON.parse($(this).val()), '#tb_filter', '#tb_filter-Template');
    } catch (e) { }
});

/* ---------------- Các hàm và sự kiên liên quan đến lọc và đánh dấu trên bảng -------------- */
function createTableFilter(obj, tableElement, templateHbs) {
    const dataTable = _.map(obj, (value, key) => ({ key, value }));
    $(tableElement).find('tbody').html(createTable(templateHbs, dataTable));
}

function highlighTableFilter(keywords, tableElement, checkboxElement) {
    const keywordArray = keywords.split(',').map(keyword => keyword.trim()).filter(keyword => keyword.length > 0);
    if (keywordArray.length === 0) {
        $(tableElement).find('tbody tr').removeClass('table-danger table-success'); return;
    }

    const highlightClass = $(checkboxElement).is(':checked') ? 'table-danger' : 'table-success';

    $(tableElement).find('tbody tr').each(function () {
        const key = $(this).find('.key-column').text().toLowerCase();
        const hasKeyword = keywordArray.some(keyword => key.includes(keyword));
        $(this).removeClass('table-danger table-success');
        if (hasKeyword) $(this).addClass(highlightClass);
    });
}

// Gắn sự kiện cho các thẻ
$('#filterContent').on('input', function () { highlighTableFilter($(this).val(), '#tb_filter', '#filterType') });
$('#filterType').on('change', function () { highlighTableFilter($('#filterContent').val(), '#tb_filter', '#filterType') });

/* -------------- Các hàm liên quan đến dịch văn bản json -------------- */

// Chuyển đổi ký tự trong văn bản
function convertSymbol(text) {
    return text.replace(/\n/g, '¥');
}

// Khôi phực ký tự trong văn bản
function recoverySymbol(text) {
    return text.replace(/¥/g, '\n');
}

// Tách obj thành các mảng
function exportObj(obj) {
    const values = [], paths = [];

    _.forOwn(obj, (value, key) => {
        if (_.isObject(value)) {
            const { values: nestedValues, paths: nestedPaths } = exportObj(value);
            values.push(...nestedValues);
            paths.push(...nestedPaths.map(p => [key, ...p]));
        } else {
            values.push(value);
            paths.push([key]);
        }
    });

    return { values, paths };
}

// Nhập các mảng thành Obj
function importObj(paths, values) {
    const result = {};
    _.forEach(paths, (path, index) => {
        _.set(result, path, values[index]);
    });
    return result;
}

// Sắp xếp lại đối tượng
function sortedObj(object, objToSort) {
    const sortedObj = {};

    _.forEach(object, (value, key) => {
        if (objToSort.hasOwnProperty(key)) {
            sortedObj[key] = objToSort[key];
        }
    });

    return sortedObj;
}

// Lọc các cặp từ đối tượng
function filterObj(jsonObj, keywords) {
    const keywordArray = keywords.split(',').map(keyword => keyword.trim()).filter(keyword => keyword.length > 0);

    if (keywordArray.length === 0)
        return [jsonObj, {}];

    const filteredObj = _.pickBy(jsonObj, (value, key) => {
        return _.some(keywordArray, keyword => key.includes(keyword));
    });

    const remainingObj = _.omit(jsonObj, _.keys(filteredObj));

    return [filteredObj, remainingObj];
}

// Tách văn bản ra các nhóm nhỏ
function splitTexts(textArray, maxLength) {
    const groups = [];
    let currentGroup = [];
    let currentLength = 0;

    _.forEach(textArray, text => {
        const textLength = text.length + (currentGroup.length > 0 ? 1 : 0);

        if (currentLength + textLength > maxLength) {
            groups.push(currentGroup);
            currentGroup = [];
            currentLength = 0;
        }

        currentGroup.push(text);
        currentLength += textLength;
    });

    if (currentGroup.length > 0) {
        groups.push(currentGroup);
    }

    return groups;
}

// Định dang ngắt dòng cho json đã dịch
function formatJsonTextLineBreak(original, translated) {
    const originalLines = _.split(original, '\n');
    const translatedLines = _.split(translated, '\n');

    let translatedLinesIndex = 0;
    const result = _.map(originalLines, (line) => {
        if (_.trim(line).length === 0) {
            return '';
        } else {
            return translatedLines[translatedLinesIndex++] || '';
        }
    });

    return _.join(result, '\n');
}

// Hàm dịch văn bản
async function translation(text, source_lang, target_lang, api_url) {
    const params = { text: text, source: source_lang, target: target_lang }
    const queryString = new URLSearchParams(params).toString();

    try {
        const response = await fetch(`${api_url}?${queryString}`, {
            redirect: "follow", method: "GET", headers: { "Content-Type": "text/plain;charset=utf-8" }
        });

        return JSON.parse(await response.json());
    } catch (err) {
        console.log(err);
        return null;
    }
}

// Hàm dịch object
async function translateObj(object, source_lang, target_lang, api, textLimit) {
    const extractedObj = exportObj(object); // Trả về một obj với values và paths
    // Tách văn bản ra các nhóm nhỏ và chuyển đổi ký tự nếu có
    const textGroups = splitTexts(extractedObj.values.map(convertSymbol), textLimit);
    const translatedValues = [];

    for (const group of textGroups) {
        const groupText = group.join('\n');
        const text = await translation(groupText, source_lang, target_lang, api);
        translatedValues.push(...text.translateText.split('\n').map(recoverySymbol));
    }

    // Trả về một obj mới với values đã dịch
    return importObj(extractedObj.paths, translatedValues);
}

/* ------------------ Các hàm liên quan đến bảng ------------------ */

// Tạo bảng
function createTable(element_content, dataTable = []) {
    const template = Handlebars.compile(convertPlaceHbs($(element_content).html()));
    const data = template({ dataTable: dataTable });
    return data;
}

// Tạo dữ liệu cho bảng
function createDataTable(obj, objTranslated) {
    return _.map(obj, (value, key) => ({
        key: key,
        value: value,
        translated: objTranslated[key]
    }));
}

// Hàm để cập nhật giá  trị trên bảng
function updateTextTranslated(element, elementForUpdate, elementForSpace) {
    const key = $(element).closest('tr').find('.key-column').text();
    const newValue = $(element).val();

    try {
        const transResult = JSON.parse($(elementForUpdate).val());
        _.set(transResult, key, newValue);
        $(elementForUpdate).val(
            formatJsonTextLineBreak($(elementForUpdate).val(), JSON.stringify(transResult, null, Number($(elementForSpace).val())))
        );
    } catch (err) {
        console.log(err);
        showErrorToast("Có lỗi xảy ra khi cập nhật nội dung");
    }
}

// Hàm để khôi phục về văn bản gốc trên bảng
function recoveryTextTranslated(element) {
    const value = $(element).closest('tr').find('.value-column').text();
    $(element).closest('tr').find('textarea').val(value).trigger('input');
}

// Hàm tạo autoResize cho các textarea trên table
function autoResizeTextarea(element) {
    $(element).css("height", `${element.scrollHeight}px`);
    $(element).on('input, mouseenter', function () {
        $(element).css("height", 0);
        $(element).css("height", `${element.scrollHeight}px`);
    })
}

// Hàm thay đổi chiều dài của cột
function resizeRowTable(tableElement, colNumber, ...rowWidths) {
    if (rowWidths.length === 1) rowWidths = new Array(colNumber).fill(rowWidths[0]);
    if (rowWidths.length > colNumber) rowWidths = rowWidths.slice(0, colNumber);
    if (colNumber !== rowWidths.length) {
        console.error("Số lượng cột không khớp với số lượng chiều dài.");
        return;
    }

    // Lấy tất cả các hàng trong bảng
    $(tableElement).find('tr').each(function () {
        $(this).find('tbody th').each(function (index) {
            if (index < colNumber) $(this).css('width', rowWidths[index]);
        });
    });
}

/* ---------------- Các hàm liên quan đến thanh tiến trình -------------- */

// Bắt đầu thanh tiến trình
function startProgressBar(element, ticks) {
    $(element).removeClass('d-none');
    let currentProgress = 0;
    updateProgressBar(element, currentProgress);

    progressInterval = setInterval(() => {
        if (currentProgress < 90) {
            const increment = Math.random() * 5;
            currentProgress = Math.min(currentProgress + increment, 95);
            updateProgressBar(element, currentProgress);
        }
    }, ticks);
}

// Cập nhật thanh tiến trình
function updateProgressBar(element, progress) {
    $(element).find('.progress-bar')
        .css('width', `${Math.round(progress)}%`)
        .attr('aria-valuenow', Math.round(progress))
        .text(`${Math.round(progress)}%`);
}

// Kết thúc thanh tiến trình
function stopProgressBar(element, timeout) {
    clearInterval(progressInterval);
    let currentProgress = 100;
    updateProgressBar(element, currentProgress);
    setTimeout(() => $(element).addClass('d-none'), timeout);
}

/* ---------------- --------------------- -------------- */

// Nút dịch Json
$('#btn-translate').click(async function () {
    try {
        $(this).addClass("disabled");
        startProgressBar('#progressTranslate', 500);
        const jsonText = JSON.parse($('#transText').val());
        let objText = jsonText // Lấy Obj trên textarea

        // Lọc đối tượng và xác định tùy chọn
        const [filteredObj, remainingObj] = filterObj(objText, $('#filterContent').val());
        const options = $('#filterType').is(':checked') ?
            { filteredObj: remainingObj, remainingObj: filteredObj } :
            { filteredObj: filteredObj, remainingObj: remainingObj };
        objText = $('#filterType').is(':checked') ? remainingObj : filteredObj;

        // Dịch obj với các tuỳ chọn nếu có
        const objTranslated = await translateObj(objText, 'auto', 'vi', API[$('#api').val()], Number($('#textLimit').val()));

        // Gọp lại thành obj hoàn chỉnh
        const objcombined = { ...objTranslated, ...options.remainingObj }

        // Sắp xếp lại dữ liệu theo obj gốc và in ra kết quả
        const sorted = sortedObj(jsonText, objcombined);
        $('#transResult').val(formatJsonTextLineBreak($('#transText').val(), JSON.stringify(sorted, null, Number($('#spaceRow').val()))));

        // Tạo bảng và gán dữ liệu cho bảng
        const dataTable = createDataTable(jsonText, sorted);
        $('#tb_translate').find('tbody').html(createTable('#tb_translate-Template', dataTable));

        // Điều chỉnh chiều cao của tất cả các textarea
        $('#tb_translate').find('tbody textarea').each(function () {
            autoResizeTextarea(this);
        });

        $('#btn-copy_translate').css('visibility', 'unset'); // Hiển thị nút sao chép
        stopProgressBar('#progressTranslate', 700); // Kết thúc thanh tiến trình, đóng sau 0.7s
        $(this).removeClass("disabled");
    } catch (err) {
        console.log(err);
        showErrorToast("Có lỗi xảy ra trong quá trình dịch");
        stopProgressBar('#progressTranslate', 0);
        $(this).removeClass("disabled");
    }
});

// Nút sao chép kết quả
$('#btn-copy_translate').click(function () {
    var textarea = $('#transResult');

    navigator.clipboard.writeText(textarea.val()).then(function () {
        // Thông báo cho người dùng (tùy chọn)
        showSuccessToast('Đã sao chép nội dung!');
    }).catch(function (err) {
        console.error('Không thể sao chép nội dung: ', err);
        showErrorToast('Có lỗi khi sao chép nội dung!');
    });
});