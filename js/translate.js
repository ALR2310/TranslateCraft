var API = [
    'https://script.google.com/macros/s/AKfycbzcw3_ujuH04arRj1KLI2j0yXQE8jUb5POHBFPi0NAfZEBAaKe9AcwvxyahI3stGwrh2A/exec',
    'https://script.google.com/macros/s/AKfycbxEmmZFo2qYKuasmbnptS7K4umOy2PsCMe3F2uF13OqUZBdeY5ziTc00GyvoN2PtaV7kA/exec',
    'https://script.google.com/macros/s/AKfycbxZhcRkfbT_86cWh5_B4jF9aXCjTIbjCpsbZga_TafiAF4zLUupy0w_MO2ta8h2pvr-/exec'
]

// Đọc dữ liệu trong tệp
$('#translate-openFiles').on('change', function (e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (res) {
            const content = res.target.result;
            $('#transText').val(content);
        }
        reader.readAsText(file);
    }
});

// kiểm tra lỗi trên text
$('#transText').on('input', function () {
    try {
        $(this).removeClass('is-invalid');
        if ($(this).val() === "") return;
        JSON.parse($(this).val());

    } catch (e) {
        $(this).addClass('is-invalid');
        // $(this).text("Nội dung không phải là một JSON hợp lệ")
    }
});

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

// Lọc các path cần dịch
function filterPaths(valuesObj, filters) {
    let filteredValues = [];
    let filteredPaths = [];

    if (filters && filters.length > 0) {
        _.forEach(valuesObj.paths, (path, index) => {
            const fullPath = path.join('.');
            if (filters.some(filter => fullPath.includes(filter.trim()))) {
                filteredValues.push(valuesObj.values[index]);
                filteredPaths.push(path);
            }
        });
    } else {
        filteredValues = valuesObj.values;
        filteredPaths = valuesObj.paths;
    }

    return { filteredValues, filteredPaths };
}

// Hàm dịch object
async function translateObj(object, textLimit, api, filters) {
    const valuesObj = exportObj(object); // Trả về một obj với values và paths

    // Lọc các paths và values dựa trên từ khóa
    const { filteredValues, filteredPaths } = filterPaths(valuesObj, filters);

    // Tách văn bản ra các nhóm nhỏ và chuyển đổi ký tự nếu có
    const textGroups = splitTexts(filteredValues.map(convertSymbol), textLimit);
    const translatedValues = [];

    for (const group of textGroups) {
        const groupText = group.join('\n');
        const text = await translation(groupText, 'auto', 'vi', api);
        translatedValues.push(...text.translateText.split('\n').map(recoverySymbol));
    }

    // Tạo đối tượng mới từ paths đã dịch và giữ lại các paths không dịch
    const translatedObj = importObj(filteredPaths, translatedValues);
    const finalObj = _.cloneDeep(object);
    _.forOwn(translatedObj, (value, key) => {
        _.set(finalObj, key, value);
    });

    return finalObj;
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
        $(elementForUpdate).val(JSON.stringify(transResult, null, Number($(elementForSpace).val())));
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
    $(element).on('input', function () {
        $(element).css("height", 0);
        $(element).css("height", `${element.scrollHeight}px`);
    })
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
        startProgressBar('#progressTranslate', 500);
        const objText = JSON.parse($('#transText').val()); // Lấy Obj trên textarea
        const filter = $('#filter').val().split(','); // Lấy từ khóa từ textarea filter

        // Dịch obj
        const objTranslated = await translateObj(objText, Number($('#textLimit').val()), API[$('#api').val()], filter);

        // Sắp xếp lại dữ liệu theo obj gốc và in ra kết quả
        const sorted = sortedObj(objText, objTranslated);
        $('#transResult').val(JSON.stringify(sorted, null, Number($('#spaceRow').val())));

        // Tạo bảng và gán dữ liệu cho bảng
        const dataTable = createDataTable(objText, sorted);
        $('#tb_translateBody').html(createTable('#tb_translate-Template', dataTable));

        // Điều chỉnh chiều cao của tất cả các textarea
        $('#tb_translateBody').find('textarea').each(function () {
            autoResizeTextarea(this);
        });

        $('#btn-copy').css('visibility', 'unset'); // Hiển thị nút sao chép
        stopProgressBar('#progressTranslate', 700); // Kết thúc thanh tiến trình, đóng sau 0.7s
    } catch (err) {
        console.log(err);
        showErrorToast("Có lỗi xảy ra trong quá trình dịch");
        stopProgressBar('#progressTranslate', 0);
    }
});

// Nút sao chép kết quả
$('#btn-copy').click(function () {
    var textarea = $('#transResult');

    navigator.clipboard.writeText(textarea.val()).then(function () {
        // Thông báo cho người dùng (tùy chọn)
        showSuccessToast('Đã sao chép nội dung!');
    }).catch(function (err) {
        console.error('Không thể sao chép nội dung: ', err);
        showErrorToast('Có lỗi khi sao chép nội dung!');
    });
});



