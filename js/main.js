const TransAPI = [
    'https://script.google.com/macros/s/AKfycbzcw3_ujuH04arRj1KLI2j0yXQE8jUb5POHBFPi0NAfZEBAaKe9AcwvxyahI3stGwrh2A/exec',
    'https://script.google.com/macros/s/AKfycbxEmmZFo2qYKuasmbnptS7K4umOy2PsCMe3F2uF13OqUZBdeY5ziTc00GyvoN2PtaV7kA/exec',
    'https://script.google.com/macros/s/AKfycbxZhcRkfbT_86cWh5_B4jF9aXCjTIbjCpsbZga_TafiAF4zLUupy0w_MO2ta8h2pvr-/exec'
]


// Đọc dữ liệu trong tệp
$('#openFiles').on('change', function (e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (res) {
            const content = res.target.result;
            $('#transText').val(content);
            $('#transTextCount').text(Object.entries(JSON.parse(content)).length);
        }
        reader.readAsText(file);
    }
});

// Đếm và kiểm tra lỗi trên text
$('#transText').on('input', function () {
    try {
        if ($(this).val() === "") return;
        $('#transTextError').text("");
        const textObj = JSON.parse($(this).val());
        $('#transTextCount').text(Object.entries(textObj).length);
    } catch (e) {
        $('#transTextError').text("Nội dung không phải là một JSON hợp lệ")
    }
});

// Đếm và kiểm tra lỗi trên result
$('#transResult').on('input, focus, blur', function () {
    try {
        if ($(this).val() === "") return;
        $('#transResultError').text("");
        const textObj = JSON.parse($(this).val());
        $('#transResultCount').text(Object.entries(textObj).length);
    } catch (e) {
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

// Bắt đầu thanh tiến trình
function startProgressBar() {
    $('#progressTranslate').removeClass('d-none');
    currentProgress = 0;
    updateProgressBar(currentProgress);

    progressInterval = setInterval(() => {
        if (currentProgress < 90) {
            const increment = Math.random() * 5; // Tăng ngẫu nhiên từ 0 đến 5
            currentProgress = Math.min(currentProgress + increment, 90);
            updateProgressBar(currentProgress);
        }
    }, 500); // Cập nhật mỗi 0.5 giây
}

// Kết thúc thanh tiến trình
function stopProgressBar() {
    clearInterval(progressInterval);
    currentProgress = 100;
    updateProgressBar(currentProgress);
    setTimeout(() => $('#progressTranslate').addClass('d-none'), 700);
}

// Cập nhật thanh tiến trình
function updateProgressBar(progress) {
    $('#progressTranslate').find('.progress-bar')
        .css('width', `${Math.round(progress)}%`)
        .attr('aria-valuenow', Math.round(progress))
        .text(`${Math.round(progress)}%`);
}

// Hàm dịch văn bản
async function translateText(texts) {
    startProgressBar();

    const maxLength = 4500;
    const textGroups = splitTexts(texts.map(prepareForTranslation), maxLength);
    const translatedValues = [];

    for (const group of textGroups) {
        const params = { text: group.join('\n'), source: 'en', target: 'vi' }
        const queryString = new URLSearchParams(params).toString();

        const response = await fetch(`${TransAPI[$('#serverAPI').val()]}?${queryString}`, {
            redirect: "follow",
            method: "GET",
            headers: { "Content-Type": "text/plain;charset=utf-8" }
        });

        const data = JSON.parse(await response.json());
        translatedValues.push(...data.translateText.split('\n').map(revertTranslation));
    }

    stopProgressBar();
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

// Hàm để cập nhật giá trị trong thẻ transResult
function updateTransResult(element) {
    const key = $(element).closest('tr').find('.key-column').text();
    const newValue = $(element).val();

    try {
        const transResult = JSON.parse($('#transResult').val());
        _.set(transResult, key, newValue);
        $('#transResult').val(JSON.stringify(transResult, null, 2));
    } catch (err) {
        console.log(err);
        showErrorToast("Có lỗi xảy ra khi cập nhật transResult");
    }
}

// Hàm để reset giá trị trên bảng về mặt định
function resetTranstValue(element) {
    const value = $(element).closest('tr').find('.value-column').text();
    $(element).closest('tr').find('textarea').val(value).trigger('input');
}

// sự kiện nút dịch văn bản
$('#btn-translate').click(async function () {
    try {
        const text = JSON.parse($('#transText').val());

        const { translatedObj, values, paths, translatedValues } = await translateJSON(text);

        const tbody = $('#tbCompare tbody');
        tbody.empty(); // Xóa nội dung bảng cũ

        const tableData = [];

        paths.forEach((path, index) => {
            const rowData = {
                key: path.join('.'),
                value: values[index],
                translated: translatedValues[index]
            };
            tableData.push(rowData);
        });

        const source = $('#tbCompare-Template').html();
        const template = Handlebars.compile(source);
        const data = template({ tableData });
        $('#tbCompareBody').html(data);

        $('#transResult').val(JSON.stringify(translatedObj, null, Number($('#spaceRow').val())));
    } catch (err) {
        console.log(err);
        showErrorToast("Giá trị đầu vào không hợp lệ");
        stopProgressBar();
    }
});
