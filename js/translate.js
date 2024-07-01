const API = [
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

// Dịch văn bản
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

/* -------------- Các hàm liên quan đến tạo bảng và các sự kiện -------------- */

// Tạo bảng
function createTable(element_content, dataTable = []) {
    const template = Handlebars.compile($(element_content).html());
    const data = template({ dataTable: dataTable });
    return data;
}

// Hàm để cập nhật giá  trị trên bảng
function updateTextTranslated(element) {
    const key = $(element).closest('tr').find('.key-column').text();
    const newValue = $(element).val();

    try {
        const transResult = JSON.parse($('#transResult').val());
        _.set(transResult, key, newValue);
        $('#transResult').val(JSON.stringify(transResult, null, Number($('#spaceRow').val())));
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
        startProgressBar('#progressTranslate', 500); // Bắt đầu thanh tiến trình, cập nhật mỗi 0.5s
        const textJson = JSON.parse($('#transText').val()); // Lấy Obj trên textarea
        const { paths, values } = exportObj(textJson); // Tách obj thành các mảng
        // Tách văn bản giới hạn mỗi lần dịch và thay thế các ký tự
        const textGroups = splitTexts(values.map(convertSymbol), Number($('#textLimit').val()));
        const translatedValues = [];

        // Lặp và dịch từng mảng văn bản
        for (const group of textGroups) {
            const groupText = group.join('\n'); // Gộp mảng thành văn bản
            const text = await translation(groupText, 'en', 'vi', API[$('#api').val()]);
            translatedValues.push(...text.translateText.split('\n').map(recoverySymbol));

            const translatedObj = importObj(paths, translatedValues); // Tạo obj mới với values đã dịch
            $('#transResult').val(JSON.stringify(translatedObj, null, Number($('#spaceRow').val())));
        }

        // Tạo dữ liệu cho bảng
        const dataTable = paths.map((path, index) => ({
            key: path.join('.'),
            value: values[index],
            translated: translatedValues[index]
        }));

        // Gánh dữ liệu cho bảng
        $('#tbCompareBody').html(createTable('#tbCompare-Template', dataTable));

        // Tự động điều chỉnh chiều cao của tất cả các textarea
        $('#tbCompareBody').find('textarea').each(function () {
            autoResizeTextarea(this);
        });

        $('#btn-copy').css('visibility', 'unset'); // Hiển thị nút sao chép
        stopProgressBar('#progressTranslate', 700); // Kết thúc thanh tiến trình, đóng sau 0.7s
    } catch (err) {
        console.log(err);
        stopProgressBar('#progressTranslate', 0);
        showErrorToast("Có lỗi xảy ra trong quá trình dịch");
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



