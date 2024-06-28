const TransAPI = 'https://script.google.com/macros/s/AKfycbzcw3_ujuH04arRj1KLI2j0yXQE8jUb5POHBFPi0NAfZEBAaKe9AcwvxyahI3stGwrh2A/exec'

// Đọc dữ liệu trong tệp
$('#openFiles').on('change', function (e) {
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

// Đếm và kiểm tra lỗi trên text
$('#transText').on('input', function () {
    try {
        if($(this).val() === "") return;
        $('#transTextError').text("");
        const textObj = JSON.parse($(this).val());
        $('#transTextCount').text(Object.entries(textObj).length);
    } catch(e) {
        $('#transTextError').text("Nội dung không phải là một JSON hợp lệ")
    }
});

// Đếm và kiểm tra lỗi trên result
$('#transResult').on('input, focus, blur', function () {
    try {
        if($(this).val() === "") return;
        $('#transResultError').text("");
        const textObj = JSON.parse($(this).val());
        $('#transResultCount').text(Object.entries(textObj).length);
    } catch(e) {
        $('#transResultError').text("Nội dung không phải là một JSON hợp lệ")
    }
});

// Tạo mảng các giá trị từ JSON
function extractValues(obj) {
    const values = [];
    const paths = [];

    function traverse(obj, currentPath) {
        for (const key in obj) {
            if (typeof obj[key] === 'object' && obj[key] !== null) {
                traverse(obj[key], currentPath.concat(key));
            } else {
                values.push(obj[key]);
                paths.push(currentPath.concat(key));
            }
        }
    }

    traverse(obj, []);
    return { values, paths };
}

// Đặt các giá trị đã dịch trở lại JSON
function populateValues(obj, paths, translatedValues) {
    function setNestedValue(obj, path, value) {
        let temp = obj;
        for (let i = 0; i < path.length - 1; i++) {
            temp = temp[path[i]];
        }
        temp[path[path.length - 1]] = value;
    }

    paths.forEach((path, index) => {
        setNestedValue(obj, path, translatedValues[index]);
    });
}

// Tách mảng để tránh giới hạn
function splitTexts(texts, maxLength) {
    const groups = [];
    let currentGroup = [];
    let currentLength = 0;

    texts.forEach(text => {
        // Kiểm tra nếu việc thêm văn bản hiện tại sẽ vượt quá giới hạn
        if (currentLength + text.length + (currentGroup.length > 0 ? 1 : 0) > maxLength) {
            groups.push(currentGroup);
            currentGroup = [];
            currentLength = 0;
        }

        currentGroup.push(text);
        currentLength += text.length + (currentGroup.length > 1 ? 1 : 0);
    });

    if (currentGroup.length > 0) {
        groups.push(currentGroup);
    }

    return groups;
}

// Thay thế ký tự ngắt dòng bằng ký tự đặc biệt trước khi dịch
function prepareForTranslation(text) {
    return text.replace(/\n/g, '[0]');
}

// Khôi phục ký tự ngắt dòng sau khi dịch
function revertTranslation(text) {
    return text.replace(/\[0\]/g, '\n');
}

// Hàm dịch văn bản
async function translateText(texts) {
    const maxLength = 4500;
    const textGroups = splitTexts(texts.map(prepareForTranslation), maxLength);
    const translatedValues = [];

    for (const group of textGroups) {
        const params = { text: group.join('\n'), source: 'en', target: 'vi' }
        const queryString = new URLSearchParams(params).toString();

        const response = await fetch(`${TransAPI}?${queryString}`, {
            redirect: "follow",
            method: "GET",
            headers: { "Content-Type": "text/plain;charset=utf-8" }
        });

        const data = JSON.parse(await response.json());
        translatedValues.push(...data.translateText.split('\n').map(revertTranslation));
    }

    return translatedValues;
}

// Hàm dịch JSON
async function translateJSON(jsonObj) {
    const { values, paths } = extractValues(jsonObj);
    const translatedValues = await translateText(values);
    const translatedObj = JSON.parse(JSON.stringify(jsonObj)); // Sao chép JSON gốc
    populateValues(translatedObj, paths, translatedValues);
    return { translatedObj, values, paths, translatedValues };
}

// Hàm để tạo hàng trong bảng
function createTableRow(key, value, translatedValue) {
    const row = $('<tr></tr>');

    const keyCell = $('<td></td>').addClass('key-column').text(key);
    row.append(keyCell);

    const valueCell = $('<td></td>').text(value);
    row.append(valueCell);

    const transCell = $('<td style="width: 275px;"></td>');
    const input = $('<textarea class="form-control form-control-sm" style="height: auto;"></textarea>').text(translatedValue);
    input.on('input', function () {
        updateTransResult(key, $(this).val());
    });
    transCell.append(input);
    row.append(transCell);

    const buttonCell = $('<td></td>');
    const buttonDiv = $('<div class="d-flex justify-content-center"></div>');
    const button = $('<button class="btn btn-sm btn-secondary"></button>').html('<i class="fa-solid fa-rotate-left"></i>');
    button.on('click', function () {
        input.val(value).trigger('input');
    });
    buttonDiv.append(button);
    buttonCell.append(buttonDiv);
    row.append(buttonCell);

    return row;
}

// Hàm để cập nhật giá trị trong thẻ transResult
function updateTransResult(key, newValue) {
    try {
        const transResult = JSON.parse($('#transResult').val());
        _.set(transResult, key, newValue);
        $('#transResult').val(JSON.stringify(transResult, null, 2));
    } catch (err) {
        console.log(err);
        showErrorToast("Có lỗi xảy ra khi cập nhật transResult");
    }
}

// sự kiện nút dịch văn bản
$('#btn-translate').click(async function () {
    try {
        const text = {
            "item.constructionwand.stone_wand": "Stone Wand",
            "item.constructionwand.iron_wand": "Iron Wand",
            "item.constructionwand.diamond_wand": "Diamond Wand",
            "item.constructionwand.infinity_wand": "Infinity Wand",
            "item.constructionwand.core_angel": "Angel Wand Core",
            "item.constructionwand.core_destruction": "Destruction Wand Core",
        }
        // const text = JSON.parse($('#transText').val());

        const { translatedObj, values, paths, translatedValues } = await translateJSON(text);

        // Cập nhật bảng
        const tbody = $('#tbCompare tbody');
        tbody.empty(); // Xóa nội dung bảng cũ

        paths.forEach((path, index) => {
            const key = path.join('.');
            const value = values[index];
            const translatedValue = translatedValues[index];
            const row = createTableRow(key, value, translatedValue);
            tbody.append(row);
        });

        $('#transResult').val(JSON.stringify(translatedObj, null, 2));
    } catch (err) {
        console.log(err);
        showErrorToast("Giá trị đầu vào không hợp lệ")
    }
});
